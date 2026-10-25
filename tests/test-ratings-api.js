// Isolated HTTP integration tests. Auth and persistence doubles never touch user data.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('../backend/node_modules/express');
const mongoose = require('../backend/node_modules/mongoose');
const Book = require('../backend/src/models/Book');
const Rating = require('../backend/src/models/Rating');
const env = require('../backend/src/config/env');

test('ratings enforce verified identity, validate scores, and update one vote per account', async t => {
  const records = new Map();
  const originals = { book: Book.findOne, own: Rating.findOne, aggregate: Rating.aggregate, upsert: Rating.findOneAndUpdate, init: Rating.init, state: mongoose.connection.readyState };
  const auth = express();
  auth.get('/auth/v1/user', (req, res) => {
    if (req.headers.authorization !== 'Bearer verified-session') return res.status(401).json({ error: 'invalid token' });
    res.json({ id: 'verified-user', email_confirmed_at: '2026-01-01T00:00:00Z' });
  });
  const authServer = await new Promise(resolve => { const server = auth.listen(0, '127.0.0.1', () => resolve(server)); });
  env.SUPABASE_URL = `http://127.0.0.1:${authServer.address().port}`;
  env.SUPABASE_ANON_KEY = 'test-publishable-key';
  Book.findOne = query => ({ lean: async () => query.slug === 'dracula' ? { slug: 'dracula' } : null });
  Rating.findOne = query => ({ lean: async () => records.get(query.bookSlug + ':' + query.userId) || null });
  Rating.init = async () => {};
  Rating.findOneAndUpdate = async (query, update) => {
    const value = { ...query, ...update.$set };
    records.set(query.bookSlug + ':' + query.userId, value);
    return value;
  };
  Rating.aggregate = async pipeline => {
    const groups = new Map();
    for (const record of records.values()) {
      if (record.bookSlug !== pipeline[0].$match.bookSlug) continue;
      groups.set(record.score, (groups.get(record.score) || 0) + 1);
    }
    return [...groups].map(([_id, count]) => ({ _id, count }));
  };
  mongoose.connection.readyState = 1;
  const app = express();
  app.use(express.json());
  app.use('/api', require('../backend/src/routes/ratingRoutes'));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(async () => {
    Book.findOne = originals.book; Rating.findOne = originals.own; Rating.aggregate = originals.aggregate;
    Rating.findOneAndUpdate = originals.upsert; Rating.init = originals.init; mongoose.connection.readyState = originals.state;
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => authServer.close(resolve))]);
  });
  const base = `http://127.0.0.1:${server.address().port}/api/books/dracula/ratings`;
  const put = (score, token, extra = {}) => fetch(base, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ score, ...extra }) });
  assert.equal((await put(5)).status, 401);
  assert.equal((await put(5, 'forged-token')).status, 401);
  for (const score of [0, 6, 2.5, '5', null]) assert.equal((await put(score, 'verified-session')).status, 400);
  const first = await put(5, 'verified-session', { userId: 'spoofed-user' });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { count: 1, average: 5, distribution: [0,0,0,0,1], myRating: 5 });
  assert.equal(records.has('dracula:spoofed-user'), false);
  const changed = await put(2, 'verified-session');
  assert.deepEqual(await changed.json(), { count: 1, average: 2, distribution: [0,1,0,0,0], myRating: 2 });
  assert.equal(records.size, 1);
  const publicResult = await (await fetch(base)).json();
  assert.equal(publicResult.myRating, null);
  assert.equal(publicResult.average, 2);
  assert.equal((await fetch(base.replace('dracula', 'missing'))).status, 404);
  mongoose.connection.readyState = 0;
  assert.equal((await fetch(base)).status, 503);
  assert.ok(Rating.schema.indexes().some(([keys, options]) => keys.bookSlug === 1 && keys.userId === 1 && options.unique));
});
