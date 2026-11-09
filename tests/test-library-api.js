// Isolated local HTTP and temporary-file checks; no live accounts or Atlas writes.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('../backend/node_modules/express');
const env = require('../backend/src/config/env');
const { createLibraryJsonStore, emptyDocument } = require('../backend/src/services/libraryJsonStore');
const { createLibraryRouter } = require('../backend/src/routes/libraryRoutes');

async function directory(t) {
  const root = path.resolve(__dirname, '../outputs');
  await fs.mkdir(root, { recursive: true });
  const target = await fs.mkdtemp(path.join(root, 'novelcast-library-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(target)), root);
    assert.ok(path.basename(target).startsWith('novelcast-library-test-'));
    await fs.rm(target, { recursive: true, force: true });
  });
  return target;
}

async function listen(t, app) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function changedDocument() {
  return {
    ...emptyDocument(),
    state: { library: { dracula: { status: 'saved', favorite: true, chapter: 3, page: 4, bookmarks: [{ chapter: 2, page: 1, label: 'My place' }] } }, collections: ['Classics'] },
    uploads: [{ id: 'upload-test', title: 'My notes', author: 'Reader', format: 'TXT', progress: 20 }],
    settings: { font: 'serif', fontSize: 20 },
    readingPlan: { dailyMinutes: 35, favoriteGenre: 'Mystery' },
  };
}

test('library API verifies Supabase identity, isolates accounts and saves actual JSON', async t => {
  const original = { url: env.SUPABASE_URL, key: env.SUPABASE_ANON_KEY };
  t.after(() => { env.SUPABASE_URL = original.url; env.SUPABASE_ANON_KEY = original.key; });
  const auth = express();
  let authMode = 'normal';
  auth.get('/auth/v1/user', (req, res) => {
    assert.equal(req.headers.apikey, 'test-public-key');
    if (authMode === 'unavailable') return res.status(503).json({ error: 'down' });
    const token = req.headers.authorization;
    if (token === 'Bearer unconfirmed') return res.json({ id: 'pending', email_confirmed_at: null });
    if (token === 'Bearer anonymous') return res.json({ id: 'anonymous', email_confirmed_at: '2026-01-01', is_anonymous: true });
    if (!['Bearer reader-one', 'Bearer reader-two'].includes(token)) return res.status(401).json({ error: 'invalid' });
    res.json({ id: token.slice(7), email_confirmed_at: '2026-01-01' });
  });
  env.SUPABASE_URL = await listen(t, auth);
  env.SUPABASE_ANON_KEY = 'test-public-key';
  const target = await directory(t);
  const app = express();
  app.use(express.json());
  app.use('/api', createLibraryRouter({ store: createLibraryJsonStore({ directory: target }) }));
  const base = await listen(t, app) + '/api/me/library';
  const request = (token, data) => fetch(base, {
    method: data ? 'PUT' : 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  for (const token of [null, 'forged', 'unconfirmed', 'anonymous']) assert.equal((await request(token)).status, 401);
  assert.deepEqual(await (await request('reader-one')).json(), emptyDocument());
  const value = changedDocument();
  const savedResponse = await request('reader-one', value);
  assert.equal(savedResponse.status, 200);
  assert.equal(savedResponse.headers.get('cache-control'), 'no-store');
  const saved = await savedResponse.json();
  assert.equal(saved.revision, 1);
  assert.equal(saved.readingPlan.dailyMinutes, 35);
  assert.equal(saved.state.library.dracula.favorite, true);
  assert.deepEqual(await (await request('reader-two')).json(), emptyDocument());
  assert.deepEqual(await (await request('reader-one')).json(), saved);
  const filenames = await fs.readdir(target);
  assert.equal(filenames.length, 1);
  assert.match(filenames[0], /^[a-f0-9]{64}\.json$/);
  const raw = await fs.readFile(path.join(target, filenames[0]), 'utf8');
  assert.deepEqual(JSON.parse(raw), saved);
  assert.equal(/reader-one|test-public-key|Bearer|password|@/.test(raw), false);
  const conflict = await request('reader-one', value);
  assert.equal(conflict.status, 409);
  assert.deepEqual((await conflict.json()).document, saved);
  authMode = 'unavailable';
  assert.equal((await request('reader-one', { ...saved, readingPlan: { dailyMinutes: 45 } })).status, 503);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, filenames[0]), 'utf8')), saved);
});

test('library API rejects invalid fields, forged ownership and unsafe record keys', async t => {
  const target = await directory(t);
  const app = express();
  app.use(express.json());
  app.use('/api', createLibraryRouter({ store: createLibraryJsonStore({ directory: target }), verifyUser: async () => ({ id: 'verified-reader' }) }));
  const base = await listen(t, app) + '/api/me/library';
  const invalid = [
    { ...emptyDocument(), userId: 'someone-else' },
    { ...emptyDocument(), password: 'not-to-be-stored' },
    { ...emptyDocument(), revision: -1 },
    { ...emptyDocument(), schemaVersion: 2 },
    { ...emptyDocument(), state: { library: { dracula: { favorite: 'yes' } } } },
    { ...emptyDocument(), readingPlan: { dailyMinutes: 4 } },
    { ...emptyDocument(), readingPlan: { dailyMinutes: 20, favoriteGenre: 'x'.repeat(81) } },
    { ...emptyDocument(), uploads: [{ id: 'upload-test', title: 'Notes', password: 'secret' }] },
    { ...emptyDocument(), uploads: [{ id: 'upload-test', title: 'Notes', cover: 'https://user:pass@example.test/img' }] },
    { ...emptyDocument(), settings: { access_token: 'secret' } },
    JSON.parse('{"revision":0,"state":{"library":{"__proto__":{"favorite":true}}}}'),
  ];
  for (const value of invalid) {
    const result = await fetch(base, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    assert.equal(result.status, 400, await result.text());
  }
  assert.deepEqual(await fs.readdir(target), []);
});

test('JSON store survives a new instance and serializes concurrent revision checks', async t => {
  const target = await directory(t);
  const one = createLibraryJsonStore({ directory: target });
  const two = createLibraryJsonStore({ directory: target });
  const initial = changedDocument();
  const results = await Promise.allSettled([one.save('reader', initial), two.save('reader', initial)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const conflict = results.find(result => result.status === 'rejected').reason;
  assert.equal(conflict.status, 409);
  const saved = await createLibraryJsonStore({ directory: target }).read('reader');
  assert.equal(saved.revision, 1);
  assert.equal(saved.uploads[0].title, 'My notes');
  const removed = await two.save('reader', { ...saved, uploads: [], state: { library: {}, collections: [] } });
  assert.equal(removed.revision, 2);
  assert.deepEqual((await one.read('reader')).uploads, []);
  assert.equal((await fs.readdir(target)).length, 1);
});

test('corrupt JSON is reported unavailable and never overwritten', async t => {
  const target = await directory(t);
  const store = createLibraryJsonStore({ directory: target });
  await store.save('reader', changedDocument());
  const [file] = await fs.readdir(target);
  const filename = path.join(target, file);
  await fs.writeFile(filename, '{ broken JSON');
  await assert.rejects(store.read('reader'), { status: 503 });
  await assert.rejects(store.save('reader', changedDocument()), { status: 503 });
  assert.equal(await fs.readFile(filename, 'utf8'), '{ broken JSON');
});
