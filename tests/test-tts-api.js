// Local HTTP contract test. Provider responses and credentials are always fake.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('../backend/node_modules/express');
const { createTtsRouter } = require('../backend/src/routes/ttsRoutes');

const MODEL = 's2.1-pro-free';
const FISH_URL = 'https://api.fish.audio/v1/tts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function within(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

function sendJson(port, pathname, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (_) { /* Successful audio is binary. */ }
        resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks), text, json });
      });
    });
    request.once('error', reject);
    request.end(body);
  });
}

function beginJsonStream(port, pathname, payload) {
  const body = JSON.stringify(payload);
  const responseReady = deferred();
  const request = http.request({
    host: '127.0.0.1', port, path: pathname, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, response => {
    const chunks = [];
    let resolveFirst;
    const firstChunk = new Promise(resolve => { resolveFirst = resolve; });
    const done = new Promise((resolve, reject) => {
      response.on('data', chunk => {
        chunks.push(chunk);
        if (resolveFirst) { resolveFirst(chunk); resolveFirst = null; }
      });
      response.once('end', resolve);
      response.once('error', reject);
    });
    responseReady.resolve({ response, chunks, firstChunk, done });
  });
  request.once('error', () => {});
  request.end(body);
  return { request, response: responseReady.promise };
}

function audioResponse(bytes = Buffer.from([0x49, 0x44, 0x33, 0x01])) {
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
}

test('POST /api/tts validates passages, fixes the model, streams audio, and aborts on disconnect', async t => {
  const originalFetch = global.fetch;
  const providerCalls = [];
  const voiceResolutions = [];
  const stableVoice = {
    referenceId: 'server-reference-dracula',
    name: 'Server Narrator',
    reason: 'Fixed for this book.',
    profile: 'gothic',
    selectedAt: new Date('2026-01-02T03:04:05.000Z'),
  };
  const voiceResolver = async (bookId, { signal } = {}) => {
    voiceResolutions.push({ bookId, signal });
    return stableVoice;
  };
  let providerResponder = async () => audioResponse();
  global.fetch = async (url, options) => {
    const call = { url: String(url), options };
    providerCalls.push(call);
    return providerResponder(call);
  };

  const app = express();
  app.use(express.json({ limit: '32kb' }));
  // createTtsRouter keeps this test independent from every configured key.
  app.use('/api', createTtsRouter({ apiKey: 'fake-test-key', voiceResolver, timeoutMs: 2000 }));
  app.use('/missing', createTtsRouter({ apiKey: '', timeoutMs: 2000 }));
  app.use('/unvoiced', createTtsRouter({ apiKey: 'fake-test-key', voiceResolver: async () => null, timeoutMs: 2000 }));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: 'test app error' }));
  let server;
  t.after(async () => {
    global.fetch = originalFetch;
    if (server) await new Promise(resolve => server.close(resolve));
  });
  server = await startServer(app);
  const port = server.address().port;

  const boundedText = 'The exact passage chosen by the reader.';
  const success = await sendJson(port, '/api/tts', {
    text: boundedText,
    bookId: 'dracula',
    model: 'paid-model',
    reference_id: 'client-controlled',
    voiceId: 'client-selected-voice',
  });
  assert.equal(success.status, 200);
  assert.match(success.headers['content-type'], /^audio\/mpeg/);
  assert.equal(success.headers['cache-control'], 'no-store');
  assert.equal(success.headers['x-tts-model'], MODEL);
  assert.equal(success.headers['x-tts-voice-id'], stableVoice.referenceId);
  assert.equal(decodeURIComponent(success.headers['x-tts-voice-name']), stableVoice.name);
  assert.deepEqual(success.body, Buffer.from([0x49, 0x44, 0x33, 0x01]));

  const firstUpstream = providerCalls[0];
  assert.equal(firstUpstream.url, FISH_URL);
  assert.equal(firstUpstream.options.method, 'POST');
  assert.equal(firstUpstream.options.headers.Authorization, 'Bearer fake-test-key');
  assert.equal(firstUpstream.options.headers.model, MODEL, 'browser-supplied model fields must never select another model');
  assert.equal(firstUpstream.options.redirect, 'error');
  assert.deepEqual(JSON.parse(firstUpstream.options.body), {
    text: boundedText,
    format: 'mp3',
    latency: 'balanced',
    reference_id: stableVoice.referenceId,
  });
  assert.deepEqual(voiceResolutions.map(call => call.bookId), ['dracula']);

  const exactLimit = await sendJson(port, '/api/tts', { text: 'x'.repeat(1200), bookId: 'dracula' });
  assert.equal(exactLimit.status, 200, 'the maximum supported passage length is inclusive');
  assert.equal(JSON.parse(providerCalls[1].options.body).text.length, 1200);
  assert.equal(JSON.parse(providerCalls[1].options.body).reference_id, stableVoice.referenceId);
  assert.equal(providerCalls[1].options.headers.model, MODEL);
  assert.deepEqual(voiceResolutions.map(call => call.bookId), ['dracula', 'dracula'], 'each passage resolves against the same owning book');
  const providerCountBeforeInvalid = providerCalls.length;
  const resolverCountBeforeInvalid = voiceResolutions.length;
  for (const payload of [null, {}, { text: '' , bookId: 'dracula' }, { text: '   ', bookId: 'dracula' }, { text: 7, bookId: 'dracula' }, { text: 'x'.repeat(1201), bookId: 'dracula' }]) {
    const invalid = await sendJson(port, '/api/tts', payload);
    assert.equal(invalid.status, 400, `invalid input should be rejected: ${JSON.stringify(payload).slice(0, 80)}`);
    if (payload && Object.hasOwn(payload, 'text')) assert.equal(invalid.json && invalid.json.code, 'TTS_INVALID_TEXT');
  }
  assert.equal(providerCalls.length, providerCountBeforeInvalid, 'bad input must not reach the provider');
  assert.equal(voiceResolutions.length, resolverCountBeforeInvalid, 'invalid text must be rejected before resolving a book voice');

  const resolverCountBeforeBadBook = voiceResolutions.length;
  for (const bookId of [undefined, '', '   ', 7, '../dracula']) {
    const invalidBook = await sendJson(port, '/api/tts', { text: 'A valid passage.', ...(bookId === undefined ? {} : { bookId }) });
    assert.equal(invalidBook.status, 400);
    assert.equal(invalidBook.json.code, 'TTS_INVALID_BOOK');
  }
  assert.equal(providerCalls.length, providerCountBeforeInvalid, 'invalid book IDs must not reach the provider');
  assert.equal(voiceResolutions.length, resolverCountBeforeBadBook, 'invalid book IDs must not trigger voice lookup');

  const missingKey = await sendJson(port, '/missing/tts', { text: 'A request without server credentials.', bookId: 'dracula' });
  assert.equal(missingKey.status, 503);
  assert.equal(missingKey.json.code, 'TTS_NOT_CONFIGURED');
  assert.equal(providerCalls.length, providerCountBeforeInvalid, 'missing configuration must not call the provider');

  const unvoiced = await sendJson(port, '/unvoiced/tts', { text: 'A book without a saved voice.', bookId: 'dracula' });
  assert.equal(unvoiced.status, 503);
  assert.equal(unvoiced.json.code, 'TTS_VOICE_UNAVAILABLE');
  assert.equal(providerCalls.length, providerCountBeforeInvalid, 'a missing server-selected voice must never synthesize with a default voice');

  for (const [upstreamStatus, expectedStatus, expectedCode] of [
    [401, 503, 'TTS_AUTH_FAILED'],
    [402, 402, 'TTS_ACCESS_REQUIRED'],
    [404, 503, 'TTS_MODEL_UNAVAILABLE'],
    [429, 429, 'TTS_RATE_LIMITED'],
    [503, 502, 'TTS_UPSTREAM_ERROR'],
  ]) {
    providerResponder = async () => new Response('provider-private-detail', {
      status: upstreamStatus,
      headers: { 'Content-Type': 'application/json' },
    });
    const before = providerCalls.length;
    const rejected = await sendJson(port, '/api/tts', { text: 'One requested passage.', bookId: 'dracula', model: 'paid-model', reference_id: 'client-paid-voice' });
    assert.equal(rejected.status, expectedStatus);
    assert.equal(rejected.json.code, expectedCode);
    assert.doesNotMatch(rejected.text, /provider-private-detail/);
    assert.equal(providerCalls.length, before + 1, 'a provider error must not trigger a model fallback');
    assert.equal(providerCalls.at(-1).options.headers.model, MODEL);
  }

  let secondChunkReleased = false;
  const releaseSecondChunk = deferred();
  providerResponder = async () => {
    let pullCount = 0;
    const body = new ReadableStream({
      pull(controller) {
        pullCount += 1;
        if (pullCount === 1) {
          controller.enqueue(Buffer.from('first-audio-bytes'));
        } else if (pullCount === 2) {
          return releaseSecondChunk.promise.then(() => {
            secondChunkReleased = true;
            controller.enqueue(Buffer.from('-second-audio-bytes'));
            controller.close();
          });
        }
      },
    });
    return new Response(body, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
  };
  const streaming = beginJsonStream(port, '/api/tts', { text: 'Stream this passage as it arrives.', bookId: 'dracula' });
  let streamedResponse;
  try {
    streamedResponse = await within(streaming.response, 1000, 'response headers before the provider finished its stream');
    const firstChunk = await within(streamedResponse.firstChunk, 1000, 'first audio bytes before the provider finished its stream');
    assert.equal(firstChunk.toString(), 'first-audio-bytes');
    assert.equal(secondChunkReleased, false, 'the client should receive audio while the provider stream remains open');
  } finally {
    releaseSecondChunk.resolve();
  }
  await within(streamedResponse.done, 1000, 'stream completion');
  assert.equal(Buffer.concat(streamedResponse.chunks).toString(), 'first-audio-bytes-second-audio-bytes');

  const providerStarted = deferred();
  const providerAborted = deferred();
  providerResponder = call => {
    providerStarted.resolve(call.options.signal);
    return new Promise((resolve, reject) => {
      call.options.signal.addEventListener('abort', () => {
        providerAborted.resolve();
        reject(new DOMException('Aborted by client', 'AbortError'));
      }, { once: true });
    });
  };
  const disconnected = beginJsonStream(port, '/api/tts', { text: 'This request will be cancelled.', bookId: 'dracula' });
  const abortSignal = await within(providerStarted.promise, 1000, 'provider request start');
  disconnected.request.destroy();
  disconnected.request.once('error', () => {});
  await within(providerAborted.promise, 1000, 'upstream abort after client disconnect');
  assert.equal(abortSignal.aborted, true);
});
