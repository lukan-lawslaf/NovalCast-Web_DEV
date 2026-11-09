'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { emptyDocument, normalizeDocument } = require('../backend/src/services/libraryJsonStore');

const tick = () => new Promise(resolve => setImmediate(resolve));
const copy = value => JSON.parse(JSON.stringify(value));

function fixture(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://127.0.0.1:3000/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  const disk = new Map(Object.entries(options.localStorage || {}));
  for (const [key, value] of disk) w.localStorage.setItem(key, value);
  let currentUser = options.user || null;
  const authListeners = [];
  const server = options.server || new Map();
  const calls = [];
  let onGet;
  let onPut;
  w.NovelCastAuth = {
    getUser: () => currentUser,
    isAuthenticated: () => Boolean(currentUser?.id && currentUser?.email_confirmed_at && !currentUser?.is_anonymous),
    getAccessToken: async () => currentUser ? `token-${currentUser.id}` : null,
    onAuthStateChange(callback) { authListeners.push(callback); callback(currentUser); },
  };
  w.fetch = async (url, init = {}) => {
    const address = String(url);
    if (address.includes('/books?') || address.endsWith('/ratings')) {
      return { ok: true, status: 200, json: async () => address.endsWith('/ratings') ? { ratings: [] } : { books: [] } };
    }
    if (!address.endsWith('/me/library')) throw new Error(`Unexpected test request: ${address}`);
    const token = init.headers?.Authorization;
    assert.equal(token, currentUser ? `Bearer token-${currentUser.id}` : 'Bearer null');
    const id = currentUser?.id;
    calls.push({ method: init.method || 'GET', id, body: init.body && JSON.parse(init.body) });
    if (!id) return { ok: false, status: 401, json: async () => ({ error: 'Sign in' }) };
    if (init.method === 'PUT') {
      const body = JSON.parse(init.body);
      const current = server.get(id) || emptyDocument();
      if (onPut) await onPut({ id, body, current: copy(current) });
      if (body.revision !== current.revision) {
        return { ok: false, status: 409, json: async () => ({ error: 'Conflict', document: copy(current) }) };
      }
      const saved = normalizeDocument(body);
      saved.revision = current.revision + 1;
      server.set(id, saved);
      return { ok: true, status: 200, json: async () => copy(saved) };
    }
    const value = copy(server.get(id) || emptyDocument());
    if (onGet) await onGet({ id, document: value });
    return { ok: true, status: 200, json: async () => value };
  };
  w.__ENV__ = { API_BASE: 'http://api.test/api' };
  w.eval(fs.readFileSync(path.resolve(__dirname, '../frontend/js/data.js'), 'utf8'));
  w.eval(fs.readFileSync(path.resolve(__dirname, '../frontend/js/librarySync.js'), 'utf8'));
  w.NovelCastLibrary.init();
  return {
    w, server, calls,
    setUser(user) { currentUser = user; authListeners.forEach(callback => callback(user)); },
    setOnGet(callback) { onGet = callback; },
    setOnPut(callback) { onPut = callback; },
  };
}

function user(id) { return { id, email: `${id}@example.test`, email_confirmed_at: '2026-11-01T00:00:00Z' }; }
function savedState(f, id, changes) {
  const state = f.w.NovelCast.loadState();
  Object.assign(f.w.NovelCast.ensureEntry(state, id), changes);
  assert.equal(f.w.NovelCast.saveState(state), undefined);
}

test('account switches isolate state and uploads; returning restores each account cache', async t => {
  const f = fixture(t, { user: user('reader-a') });
  f.w.NovelCastLibrary.init();
  savedState(f, 'dracula', { favorite: true, status: 'saved' });
  assert.ok(f.w.NovelCast.addUserUpload('reader-a', { id: 'upload-a', title: 'A manuscript' }));
  f.w.NovelCastLibrary.saveReadingPlan({ dailyMinutes: 35, favoriteGenre: 'Mystery' });
  assert.equal(f.w.NovelCastLibrary.getReadingPlan().dailyMinutes, 35);

  f.setUser(user('reader-b'));
  assert.equal(Object.keys(f.w.NovelCast.loadState().library).length, 0);
  assert.equal(f.w.NovelCast.getUserUploads('reader-b').length, 0);
  assert.equal(f.w.NovelCastLibrary.getReadingPlan().dailyMinutes, 20);
  assert.equal(f.w.NovelCastLibrary.getReadingPlan().favoriteGenre, '');
  savedState(f, 'emma', { status: 'reading', chapter: 4 });
  f.w.NovelCastLibrary.saveReadingPlan({ dailyMinutes: 60, favoriteGenre: 'Classics' });

  f.setUser(null);
  assert.equal(Object.keys(f.w.NovelCast.loadState().library).length, 0);
  f.setUser(user('reader-a'));
  assert.equal(f.w.NovelCast.loadState().library.dracula.favorite, true);
  assert.equal(f.w.NovelCast.getUserUploads('reader-a')[0].id, 'upload-a');
  assert.equal(f.w.NovelCastLibrary.getReadingPlan().favoriteGenre, 'Mystery');
  f.setUser(user('reader-b'));
  assert.equal(f.w.NovelCast.loadState().library.emma.chapter, 4);
  assert.equal(f.w.NovelCastLibrary.getReadingPlan().dailyMinutes, 60);
  assert.equal(f.w.NovelCast.getUserUploads('reader-a').length, 0);
});

test('migrates an account upload key without assigning the old shared shelf to a new account', async t => {
  const legacy = {
    'novelcast.state.v1': JSON.stringify({ library: { pride: { favorite: true } }, collections: [] }),
    'novelcast.uploads.reader-a': JSON.stringify([{ id: 'upload-legacy', title: 'A notes file' }]),
  };
  const f = fixture(t, { user: user('reader-a'), localStorage: legacy });
  assert.equal(Object.keys(f.w.NovelCast.loadState().library).length, 0);
  assert.equal(f.w.NovelCast.getUserUploads('reader-a')[0].id, 'upload-legacy');
  assert.equal(f.w.NovelCastLibrary.getStatus().phase, 'loading');
  f.setUser(user('reader-b'));
  assert.equal(f.w.NovelCast.getUserUploads('reader-b').length, 0);
  assert.equal(Object.keys(f.w.NovelCast.loadState().library).length, 0);
});

test('older shared bookmarks require an explicit import and never replace existing account entries', async t => {
  const f = fixture(t, { user: user('reader-a'), localStorage: {
    'novelcast.state.v1': JSON.stringify({ library: {
      dracula: { favorite: true, status: 'saved', chapter: 1, page: 0, bookmarks: [] },
      emma: { favorite: true, status: 'saved', chapter: 1, page: 0, bookmarks: [] },
    }, collections: [] }),
  } });
  assert.equal(f.w.NovelCastLibrary.hasDeviceBookmarks(), true);
  savedState(f, 'dracula', { favorite: false, status: 'reading', chapter: 4 });
  assert.equal(f.w.NovelCast.loadState().library.emma, undefined);
  assert.equal(f.w.NovelCastLibrary.importDeviceBookmarks(), true);
  assert.equal(f.w.NovelCast.loadState().library.dracula.chapter, 4);
  assert.equal(f.w.NovelCast.loadState().library.dracula.favorite, false);
  assert.equal(f.w.NovelCast.loadState().library.emma.favorite, true);
  assert.equal(f.w.NovelCastLibrary.hasDeviceBookmarks(), false);
  await f.w.NovelCastLibrary.sync();
  assert.equal(f.server.get('reader-a').state.library.emma.favorite, true);
  f.setUser(user('reader-b'));
  assert.equal(f.w.NovelCast.loadState().library.emma, undefined);
});

test('offline local edits survive in the account cache, page recreation, and a later successful sync', async t => {
  const f = fixture(t, { user: user('reader-a') });
  f.w.fetch = async (url, init = {}) => {
    if (String(url).includes('/books?') || String(url).endsWith('/ratings')) return { ok: true, status: 200, json: async () => String(url).endsWith('/ratings') ? { ratings: [] } : { books: [] } };
    if (init.method === 'PUT') throw new Error('offline');
    return { ok: true, status: 200, json: async () => emptyDocument() };
  };
  savedState(f, 'dracula', { favorite: true });
  assert.equal(await f.w.NovelCastLibrary.sync(), false);
  assert.equal(f.w.NovelCastLibrary.getStatus().phase, 'pending');
  assert.match(f.w.NovelCastLibrary.getStatus().message, /device copy/);

  const contents = Object.fromEntries(Array.from({ length: f.w.localStorage.length }, (_, index) => {
    const key = f.w.localStorage.key(index);
    return [key, f.w.localStorage.getItem(key)];
  }));
  const restored = fixture(t, { user: user('reader-a'), localStorage: contents });
  assert.equal(restored.w.NovelCast.loadState().library.dracula.favorite, true);
  assert.equal(restored.w.NovelCastLibrary.getStatus().phase, 'loading');
  assert.equal(await restored.w.NovelCastLibrary.sync(), true);
  assert.equal(restored.server.get('reader-a').state.library.dracula.favorite, true);
  assert.equal(restored.w.NovelCastLibrary.getStatus().phase, 'synced');
});

test('revision conflict combines independent remote and local fields without losing a local edit', async t => {
  const initial = emptyDocument();
  initial.state.library.dracula = { status: 'saved', favorite: false, chapter: 1, page: 0, bookmarks: [] };
  const f = fixture(t, { user: user('reader-a'), server: new Map([['reader-a', initial]]) });
  assert.equal(await f.w.NovelCastLibrary.sync(), true); // establish revision-zero base
  savedState(f, 'dracula', { favorite: true });
  f.setOnGet(({ id, document }) => {
    f.setOnGet(null);
    const newer = copy(document);
    newer.revision = 1;
    newer.state.library.dracula.chapter = 5;
    f.server.set(id, newer); // The response is stale by the time the client saves it.
  });
  assert.equal(await f.w.NovelCastLibrary.sync(), true);
  const entry = f.server.get('reader-a').state.library.dracula;
  assert.equal(entry.favorite, true);
  assert.equal(entry.chapter, 5);
  assert.ok(f.calls.some(call => call.method === 'PUT'));
});

test('a local removal remains removed when an unrelated remote account edit arrives', async t => {
  const initial = emptyDocument();
  initial.state.library = {
    dracula: { status: 'saved', favorite: false, chapter: 1, page: 0, bookmarks: [] },
    emma: { status: 'saved', favorite: false, chapter: 1, page: 0, bookmarks: [] },
  };
  const f = fixture(t, { user: user('reader-a'), server: new Map([['reader-a', initial]]) });
  assert.equal(await f.w.NovelCastLibrary.sync(), true);
  const state = f.w.NovelCast.loadState();
  delete state.library.dracula;
  f.w.NovelCast.saveState(state);
  f.setOnGet(({ id, document }) => {
    f.setOnGet(null);
    const newer = copy(document);
    newer.revision = 1;
    newer.state.library.emma.chapter = 2;
    f.server.set(id, newer);
  });
  assert.equal(await f.w.NovelCastLibrary.sync(), true);
  assert.equal(Object.hasOwn(f.server.get('reader-a').state.library, 'dracula'), false);
  assert.equal(f.server.get('reader-a').state.library.emma.chapter, 2);
});

test('local edits made while a save is pending are kept for the next revision', async t => {
  const f = fixture(t, { user: user('reader-a') });
  let beginPut, releasePut;
  const putting = new Promise(resolve => { beginPut = resolve; });
  const held = new Promise(resolve => { releasePut = resolve; });
  f.setOnPut(async () => { beginPut(); await held; f.setOnPut(null); });
  savedState(f, 'dracula', { favorite: true });
  const sync = f.w.NovelCastLibrary.sync();
  await putting;
  savedState(f, 'emma', { favorite: true });
  releasePut();
  assert.equal(await sync, true);
  assert.equal(f.server.get('reader-a').state.library.dracula.favorite, true);
  assert.equal(f.server.get('reader-a').state.library.emma.favorite, true);
  assert.equal(f.server.get('reader-a').revision, 2);
});

test('late responses after an account switch never populate the next account cache', async t => {
  const f = fixture(t, { user: user('reader-a') });
  let beginGet, releaseGet;
  const getting = new Promise(resolve => { beginGet = resolve; });
  const held = new Promise(resolve => { releaseGet = resolve; });
  f.setOnGet(async () => { beginGet(); await held; f.setOnGet(null); });
  const sync = f.w.NovelCastLibrary.sync();
  await getting;
  f.setUser(user('reader-b'));
  releaseGet();
  assert.equal(await sync, false);
  assert.equal(Object.keys(f.w.NovelCast.loadState().library).length, 0);
  assert.equal(f.w.NovelCastLibrary.getStatus().phase, 'loading');
});

test('a refreshed Supabase session identity changes cache ownership before its token is sent', async t => {
  const f = fixture(t, { user: user('reader-a') });
  f.w.NovelCastAuth.getAccessToken = async () => {
    f.setUser(user('reader-b'));
    return 'token-reader-b';
  };
  assert.equal(await f.w.NovelCastLibrary.sync(), false);
  assert.equal(f.calls.some(call => call.id === 'reader-a'), false);
  assert.equal(f.w.NovelCastLibrary.getStatus().phase, 'loading');
  assert.equal(Object.keys(f.w.NovelCast.loadState().library).length, 0);
});

test('Supabase state callbacks schedule API work after the synchronous callback returns', async t => {
  let insideCallback = false;
  let started = false;
  const f = fixture(t, { user: user('reader-a') });
  const originalFetch = f.w.fetch;
  f.w.fetch = async (url, init) => {
    if (String(url).endsWith('/me/library')) {
      assert.equal(insideCallback, false);
      started = true;
    }
    return originalFetch(url, init);
  };
  f.setUser(user('reader-b'));
  insideCallback = true;
  f.setUser(user('reader-a'));
  insideCallback = false;
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.equal(started, true);
});

test('cross-tab storage updates reload the correct account cache', async t => {
  const f = fixture(t, { user: user('reader-a') });
  const envelope = {
    document: { ...emptyDocument(), state: { library: { emma: { status: 'reading', favorite: false, chapter: 7, page: 0, bookmarks: [] } }, collections: [] } },
    base: emptyDocument(), pending: true,
  };
  f.w.localStorage.setItem('novelcast.library.v1.reader-a', JSON.stringify(envelope));
  f.w.dispatchEvent(new f.w.StorageEvent('storage', { key: 'novelcast.library.v1.reader-a', newValue: JSON.stringify(envelope) }));
  assert.equal(f.w.NovelCast.loadState().library.emma.chapter, 7);
});

test('download contains the current library and reading plan, without account credentials', async t => {
  const f = fixture(t, { user: user('reader-a') });
  let blob, clicked;
  const urls = new Map();
  Object.defineProperty(f.w.URL, 'createObjectURL', { configurable: true, value: value => { blob = value; urls.set('blob:library-copy', value); return 'blob:library-copy'; } });
  Object.defineProperty(f.w.URL, 'revokeObjectURL', { configurable: true, value: () => {} });
  f.w.HTMLAnchorElement.prototype.click = function () { clicked = { href: this.href, download: this.download }; };
  f.w.NovelCastLibrary.saveReadingPlan({ dailyMinutes: 35, favoriteGenre: 'Mystery' });
  savedState(f, 'dracula', { favorite: true, status: 'saved' });
  f.w.NovelCast.addUserUpload('reader-a', { id: 'upload-notes', title: 'Field notes', format: 'TXT' });
  await f.w.NovelCastLibrary.download();
  assert.equal(clicked.download.endsWith('.json'), true);
  assert.equal(blob.type, 'application/json');
  const content = await new Promise((resolve, reject) => {
    const reader = new f.w.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(urls.get(clicked.href));
  });
  const value = JSON.parse(content);
  assert.equal(value.state.library.dracula.favorite, true);
  assert.equal(value.readingPlan.favoriteGenre, 'Mystery');
  assert.equal(value.uploads[0].title, 'Field notes');
  assert.equal(JSON.stringify(value).includes('token-reader-a'), false);
  assert.equal(JSON.stringify(value).includes('reader-a@example.test'), false);
  assert.equal(JSON.stringify(value).toLowerCase().includes('password'), false);
});
