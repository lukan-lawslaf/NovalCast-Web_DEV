// Check safe API errors and unavailable-database responses with isolated local servers.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('../backend/node_modules/express');
const mongoose = require('../backend/node_modules/mongoose');
const errorHandler = require('../backend/src/middleware/errorHandler');

// Give each test an ephemeral local port and close it automatically afterward.
async function listen(t, app) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('the actual app reports disconnected ratings as a safe service-unavailable message', async t => {
  const oldState = mongoose.connection.readyState;
  t.after(() => { mongoose.connection.readyState = oldState; });
  mongoose.connection.readyState = 0;
  // Importing the production app mounts the real middleware but does not start Atlas.
  const base = await listen(t, require('../backend'));
  const result = await fetch(`${base}/api/books/dracula/ratings`);
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { error: 'Ratings are temporarily unavailable. Please try again shortly.' });
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 503);
});

test('error middleware exposes only deliberate 503 messages and keeps private failures hidden', async t => {
  const app = express();
  const privateDetail = 'private database/provider connection details';
  app.get('/unexpected', (req, res, next) => next(new Error(privateDetail)));
  app.get('/exposed-500', (req, res, next) => next(Object.assign(new Error(privateDetail), { status: 500, expose: true })));
  app.get('/unmarked-503', (req, res, next) => next(Object.assign(new Error(privateDetail), { status: 503 })));
  app.get('/public-503', (req, res, next) => next(Object.assign(new Error('Please retry this service shortly.'), { status: 503, expose: true })));
  app.use(express.json({ limit: '32b' }));
  app.post('/json', (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const base = await listen(t, app);
  for (const [url, status] of [['unexpected', 500], ['exposed-500', 500], ['unmarked-503', 503]]) {
    const result = await fetch(`${base}/${url}`);
    assert.equal(result.status, status);
    assert.deepEqual(await result.json(), { error: 'Internal server error' });
  }
  const publicFailure = await fetch(`${base}/public-503`);
  assert.equal(publicFailure.status, 503);
  assert.deepEqual(await publicFailure.json(), { error: 'Please retry this service shortly.' });
  for (const [body, status, message] of [
    ['{broken', 400, 'Request body must be valid JSON.'],
    [JSON.stringify({ value: 'x'.repeat(40) }), 413, 'Request body is too large.'],
  ]) {
    const result = await fetch(`${base}/json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(result.status, status);
    assert.deepEqual(await result.json(), { error: message });
  }
});
