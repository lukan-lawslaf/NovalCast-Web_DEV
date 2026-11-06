// Exercise the audio player's public contract without a browser or TTS provider.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const playerSource = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'audioPlayer.js'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function waitFor(predicate, description, timeoutMs = 1500) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${description}`);
    await settle();
  }
}

function responseJson(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => payload };
}

function createHarness({ chapterHandler, ttsHandler, books, book = 'dracula', voiceHeaders, playerDom = false } = {}) {
  const markup = playerDom
    ? '<!doctype html><html><body><section id="global-audio-player"><span id="player-voice"></span><span id="player-status"></span></section></body></html>'
    : '<!doctype html><html><body></body></html>';
  const dom = new JSDOM(markup, {
    url: 'http://127.0.0.1:3000/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  const audio = [];
  const requests = [];
  const createdUrls = [];
  const revokedUrls = [];
  const playBehaviors = new Map();
  let urlSequence = 0;

  class FakeAudio {
    constructor() {
      this.index = audio.length;
      this.src = '';
      this.preload = '';
      this.paused = true;
      this.playCalls = 0;
      this.pauseCalls = 0;
      this.listeners = new Map();
      audio.push(this);
    }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) {
      if (this.listeners.has(type)) this.listeners.get(type).delete(listener);
    }
    emit(type) {
      for (const listener of this.listeners.get(type) || []) listener({ type, target: this });
    }
    play() {
      this.playCalls += 1;
      this.paused = false;
      const behavior = playBehaviors.get(this.index);
      return behavior ? behavior(this) : Promise.resolve();
    }
    pause() { this.pauseCalls += 1; this.paused = true; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    load() {}
  }

  window.Audio = FakeAudio;
  window.__ENV__ = { API_BASE: 'http://novelcast.test/api' };
  window.URL.createObjectURL = blob => {
    assert.ok(blob && blob.size > 0, 'only nonempty audio blobs should become playable URLs');
    const url = `blob:novelcast-test/${++urlSequence}`;
    createdUrls.push(url);
    return url;
  };
  window.URL.revokeObjectURL = url => revokedUrls.push(url);

  const bookMap = Object.fromEntries((books || [{ id: book, slug: book, title: book, totalChapters: 2 }]).map(item => [item.id, item]));
  window.NovelCast = {
    books: Object.values(bookMap),
    byId: bookMap,
    getBook(id) { return bookMap[id] || null; },
    toast() {},
  };

  window.fetch = async (input, options = {}) => {
    const url = new URL(String(input), 'http://novelcast.test');
    const call = { url, options, signal: options.signal || null };
    const chapterMatch = url.pathname.match(/\/books\/([^/]+)\/chapters\/(\d+)$/);
    if (chapterMatch) {
      call.kind = 'chapter';
      call.bookId = decodeURIComponent(chapterMatch[1]);
      call.chapter = Number(chapterMatch[2]);
      requests.push(call);
      if (chapterHandler) return chapterHandler(call);
      return responseJson({
        book: { slug: call.bookId },
        chapter: { chapterNumber: call.chapter, content: `Chapter ${call.chapter} text.` },
        navigation: { next: call.chapter < bookMap[call.bookId].totalChapters ? call.chapter + 1 : null },
      });
    }

    if (url.pathname === '/api/tts') {
      call.kind = 'tts';
      call.index = requests.filter(request => request.kind === 'tts').length;
      const payload = JSON.parse(options.body || '{}');
      call.text = payload.text;
      call.bookId = payload.bookId;
      requests.push(call);
      if (ttsHandler) return ttsHandler(call);
      const voice = voiceHeaders
        ? (typeof voiceHeaders === 'function' ? voiceHeaders(call) : voiceHeaders)
        : { id: `voice:${call.bookId || book}`, name: `Narrator for ${call.bookId || book}` };
      const headers = {
        'x-tts-voice-id': voice && voice.id ? String(voice.id) : null,
        'x-tts-voice-name': voice && voice.name ? encodeURIComponent(String(voice.name)) : null,
      };
      return {
        ok: true,
        status: 200,
        headers: { get: name => headers[String(name).toLowerCase()] || null },
        blob: async () => {
          call.blobRead = true;
          return new window.Blob([Uint8Array.from([0x49, 0x44, 0x33, 0x01])], { type: 'audio/mpeg' });
        },
      };
    }

    throw new Error(`Unexpected audio-player fetch: ${url.pathname}`);
  };

  window.eval(playerSource);
  return {
    dom,
    window,
    audio,
    requests,
    createdUrls,
    revokedUrls,
    playBehaviors,
    player: window.NovelCastAudio,
  };
}

function onAbort(signal) {
  return new Promise(resolve => {
    if (!signal || signal.aborted) return resolve();
    signal.addEventListener('abort', resolve, { once: true });
  });
}

test('narrates exact chapter text with one passage ahead and waits for the next passage to start', async t => {
  const text = Array.from({ length: 700 }, (_, index) => `word${index}`).join(' ');
  const harness = createHarness({
    book: 'dracula',
    chapterHandler: async call => responseJson({
      book: { slug: call.bookId },
      chapter: { chapterNumber: call.chapter, content: text },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  const nextPlay = deferred();
  harness.playBehaviors.set(1, () => nextPlay.promise);
  assert.equal(harness.player.playBook('dracula'), true);
  await waitFor(() => harness.requests.filter(request => request.kind === 'tts').length === 2, 'the current and next narration passages');

  const ttsCalls = () => harness.requests.filter(request => request.kind === 'tts');
  assert.equal(harness.player.getState().status, 'playing');
  assert.equal(harness.audio[0].playCalls, 1);
  assert.equal(harness.audio[1].playCalls, 0, 'prefetch audio must wait until the current passage ends');
  assert.equal(ttsCalls().length, 2, 'a third provider request must not be speculative');
  assert.ok(ttsCalls().every(call => call.bookId === 'dracula'), 'every passage in a session must resolve the same book voice');
  assert.equal(harness.player.getState().voiceId, 'voice:dracula');
  assert.equal(harness.player.getState().voiceName, 'Narrator for dracula');
  assert.ok(ttsCalls().every(call => Object.keys(JSON.parse(call.options.body)).sort().join(',') === 'bookId,text'), 'the browser sends only the text and owning book ID');
  assert.ok(text.startsWith(ttsCalls().map(call => call.text).join('')));

  harness.audio[0].emit('ended');
  await waitFor(() => harness.audio[1].playCalls === 1, 'the prefetched passage to start');
  assert.equal(ttsCalls().length, 2, 'the third passage waits while the next passage has not started');
  nextPlay.resolve();
  await waitFor(() => ttsCalls().length === 3, 'the third passage after the second passage starts');

  let currentIndex = 1;
  while (ttsCalls().map(call => call.text).join('').length < text.length) {
    const current = harness.audio[currentIndex];
    assert.ok(current, 'the next audio passage should be ready before the current one ends');
    current.emit('ended');
    currentIndex += 1;
    await waitFor(() => {
      const next = harness.audio[currentIndex];
      return (next && next.playCalls > 0)
        || ttsCalls().map(call => call.text).join('').length >= text.length
        || harness.player.getState().status === 'error'
        || harness.player.getState().status === 'finished';
    }, 'the next passage to become current');
    assert.notEqual(harness.player.getState().status, 'error', harness.player.getState().error || 'audio passage failed');
  }

  assert.equal(ttsCalls().map(call => call.text).join(''), text, 'chunk requests must preserve every source character in order');
  assert.ok(ttsCalls().length > 2, 'the fixture must exercise incremental generation beyond two passages');
});

test('autoplay blocking holds generation at the current passage until the listener resumes', async t => {
  const text = 'A passage with enough words to exercise the next requested audio chunk. '.repeat(9);
  const harness = createHarness({
    chapterHandler: async call => responseJson({
      chapter: { chapterNumber: call.chapter, content: text },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  let firstPlay = true;
  harness.playBehaviors.set(0, () => {
    if (firstPlay) {
      firstPlay = false;
      return Promise.reject(new harness.window.DOMException('Playback requires a gesture.', 'NotAllowedError'));
    }
    return Promise.resolve();
  });
  harness.player.playBook('dracula');
  await waitFor(() => harness.audio.length === 1 && harness.player.getState().status === 'paused', 'the browser autoplay block');
  const ttsCalls = () => harness.requests.filter(request => request.kind === 'tts');
  assert.equal(ttsCalls().length, 1, 'the player must not spend a request on speculative audio after autoplay is blocked');
  assert.match(harness.player.getState().status, /paused/);

  harness.player.resume();
  await waitFor(() => ttsCalls().length === 2, 'prefetch after playback is allowed');
  assert.equal(harness.player.getState().status, 'playing');
});

test('pause and stop abort an in-flight next-passage request', async t => {
  for (const action of ['pause', 'stop']) {
    let harness;
    const pendingNext = async call => {
      if (call.index === 0) {
        return {
          ok: true,
          status: 200,
          blob: async () => new harness.window.Blob([Uint8Array.from([1, 2, 3])], { type: 'audio/mpeg' }),
        };
      }
      return new Promise((resolve, reject) => {
        call.signal.addEventListener('abort', () => reject(new harness.window.DOMException('Aborted', 'AbortError')), { once: true });
      });
    };
    harness = createHarness({
      ttsHandler: pendingNext,
      chapterHandler: async call => responseJson({
        chapter: { chapterNumber: call.chapter, content: `${'first '.repeat(100)}${'next '.repeat(220)}` },
        navigation: { next: null },
      }),
    });
    t.after(() => harness.dom.window.close());
    harness.player.playBook('dracula');
    await waitFor(() => harness.requests.filter(request => request.kind === 'tts').length === 2, `${action} to have an in-flight lookahead request`);
    const nextRequest = harness.requests.filter(request => request.kind === 'tts')[1];
    assert.equal(nextRequest.signal.aborted, false);
    harness.player[action]();
    await onAbort(nextRequest.signal);
    assert.equal(nextRequest.signal.aborted, true, `${action} must cancel pending provider work`);
    if (action === 'stop') {
      assert.equal(harness.player.getState().status, 'idle');
      assert.ok(harness.revokedUrls.length >= 1, 'stopping should release the current audio object URL');
    } else {
      assert.equal(harness.player.getState().status, 'paused');
    }
  }
});

test('stop aborts the initial narration request before creating an audio URL', async t => {
  const harness = createHarness({
    ttsHandler: call => new Promise((resolve, reject) => {
      call.signal.addEventListener('abort', () => reject(new harness.window.DOMException('Aborted', 'AbortError')), { once: true });
    }),
    chapterHandler: async call => responseJson({
      chapter: { chapterNumber: call.chapter, content: 'The current chapter begins here.' },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.requests.some(request => request.kind === 'tts'), 'initial narration generation');
  const generation = harness.requests.find(request => request.kind === 'tts');
  harness.player.stop();
  await onAbort(generation.signal);
  assert.equal(generation.signal.aborted, true);
  assert.equal(harness.player.getState().status, 'idle');
  assert.equal(harness.createdUrls.length, 0, 'an aborted response must not become playable audio');
});

test('switching books cancels old chapter work and ignores its late response', async t => {
  const oldChapter = deferred();
  const harness = createHarness({
    books: [
      { id: 'book-a', slug: 'book-a', title: 'Book A', totalChapters: 1 },
      { id: 'book-b', slug: 'book-b', title: 'Book B', totalChapters: 1 },
    ],
    chapterHandler: call => call.bookId === 'book-a'
      ? oldChapter.promise
      : Promise.resolve(responseJson({ chapter: { chapterNumber: 1, content: 'Book B is the current book.' }, navigation: { next: null } })),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('book-a');
  await waitFor(() => harness.requests.some(request => request.kind === 'chapter' && request.bookId === 'book-a'), 'Book A chapter request');
  const staleRequest = harness.requests.find(request => request.kind === 'chapter' && request.bookId === 'book-a');
  harness.player.playBook('book-b');
  await waitFor(() => harness.requests.some(request => request.kind === 'tts'), 'Book B narration');
  assert.equal(staleRequest.signal.aborted, true, 'changing books should cancel the previous chapter request');

  oldChapter.resolve(responseJson({ chapter: { chapterNumber: 1, content: 'Stale Book A text must never play.' }, navigation: { next: null } }));
  await settle();
  await settle();
  assert.equal(harness.player.getState().bookId, 'book-b');
  assert.deepEqual(harness.requests.filter(request => request.kind === 'tts').map(request => request.text), ['Book B is the current book.']);
});

test('prefetch crosses a chapter boundary only as the single next passage', async t => {
  const harness = createHarness({
    chapterHandler: async call => responseJson({
      chapter: {
        chapterNumber: call.chapter,
        content: call.chapter === 1 ? 'First chapter closes here.' : 'Second chapter begins here.',
      },
      navigation: { next: call.chapter === 1 ? 2 : null },
    }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.requests.filter(request => request.kind === 'tts').length === 2, 'chapter one and the next chapter passage');
  const ttsCalls = harness.requests.filter(request => request.kind === 'tts');
  assert.deepEqual(ttsCalls.map(call => call.text), ['First chapter closes here.', 'Second chapter begins here.']);
  assert.equal(harness.player.getState().chapter, 1, 'the next chapter must not become current before chapter one ends');

  harness.audio[0].emit('ended');
  await waitFor(() => harness.player.getState().chapter === 2 && harness.audio[1].playCalls > 0 && harness.player.getState().status === 'playing', 'chapter two to become current');
  assert.equal(harness.player.getState().bookId, 'dracula');
  assert.equal(harness.player.getState().status, 'playing');
});

test('the selected book voice name is decoded and displayed as text', async t => {
  const displayedName = 'Clara & Éowyn <Reader>';
  const harness = createHarness({
    playerDom: true,
    voiceHeaders: () => ({ id: 'library-voice-42', name: displayedName }),
    chapterHandler: async call => responseJson({
      chapter: { chapterNumber: call.chapter, content: 'One passage for the voice label.' },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.player.getState().voiceId === 'library-voice-42', 'the selected voice response headers');
  assert.equal(harness.player.getState().voiceName, displayedName);
  assert.equal(harness.window.document.getElementById('player-voice').textContent, `Library voice: ${displayedName}`);
  assert.equal(harness.window.document.querySelector('#player-voice script'), null, 'voice names must be rendered as text');
});

test('a changed or missing voice header stops the session before mixed-voice audio can play', async t => {
  for (const mismatch of ['changed', 'missing']) {
    const text = 'A first passage that is long enough to request the next passage. '.repeat(8);
    const harness = createHarness({
      voiceHeaders: call => call.index === 0
        ? { id: 'library-voice-stable', name: 'Stable Narrator' }
        : mismatch === 'changed' ? { id: 'library-voice-different', name: 'Different Narrator' } : null,
      chapterHandler: async call => responseJson({ chapter: { chapterNumber: call.chapter, content: text }, navigation: { next: null } }),
    });
    t.after(() => harness.dom.window.close());

    harness.player.playBook('dracula');
    await waitFor(() => harness.requests.filter(request => request.kind === 'tts').length === 2 && !harness.player.getState().isPrefetching, `${mismatch} voice response`);
    const ttsCalls = harness.requests.filter(request => request.kind === 'tts');
    assert.ok(ttsCalls.every(call => call.bookId === 'dracula'));
    assert.equal(harness.player.getState().voiceId, 'library-voice-stable');
    assert.equal(harness.player.getState().voiceName, 'Stable Narrator');
    assert.equal(ttsCalls[1].blobRead, undefined, 'the mismatched response body must not be accepted');
    assert.equal(harness.createdUrls.length, 1, 'a second audio URL must not be created from a changed voice');

    harness.audio[0].emit('ended');
    await waitFor(() => harness.player.getState().status === 'error', 'the voice mismatch to stop playback');
    assert.match(harness.player.getState().error, /voice changed/i);
    assert.equal(harness.audio.length, 1, 'the mismatched passage must never reach an audio element');
    assert.equal(harness.player.getState().voiceId, 'library-voice-stable');
  }
});

test('a present voice-header contract without an initial voice ID is rejected', async t => {
  const harness = createHarness({
    voiceHeaders: () => null,
    chapterHandler: async call => responseJson({
      chapter: { chapterNumber: call.chapter, content: 'Narration requires a confirmed library voice.' },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.player.getState().status === 'error', 'a response without its required first voice ID');
  assert.match(harness.player.getState().error, /voice could not be confirmed/i);
  const request = harness.requests.find(call => call.kind === 'tts');
  assert.equal(request.blobRead, undefined, 'audio bytes must not be accepted before the server identifies the voice');
  assert.equal(harness.createdUrls.length, 0);
  assert.equal(harness.player.getState().voiceId, null);
});

test('HTML chapter text is extracted without executing or narrating embedded scripts', async t => {
  const harness = createHarness({
    chapterHandler: async call => responseJson({
      chapter: {
        chapterNumber: call.chapter,
        content: '<p>First paragraph.</p><img src="x" onerror="window.__audioTestXss = true"><script>window.__audioTestXss = true</script><p>Second paragraph.</p>',
      },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.requests.some(request => request.kind === 'tts'), 'narration of extracted HTML text');
  const narrated = harness.requests.find(request => request.kind === 'tts').text;
  assert.equal(narrated, 'First paragraph.\n\nSecond paragraph.');
  assert.equal(harness.window.__audioTestXss, undefined);
});

test('a failed prefetched passage can be retried from its exact text cursor', async t => {
  const text = `${'First passage words. '.repeat(18)}${'Second passage words. '.repeat(18)}`.trim();
  const harness = createHarness({
    chapterHandler: async call => responseJson({ chapter: { chapterNumber: call.chapter, content: text }, navigation: { next: null } }),
    ttsHandler: async call => call.index === 1
      ? responseJson({ error: 'Temporary narration failure for the next passage.' }, { ok: false, status: 502 })
      : {
        ok: true,
        status: 200,
        blob: async () => new harness.window.Blob([Uint8Array.from([1, 2, 3])], { type: 'audio/mpeg' }),
      },
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.requests.filter(request => request.kind === 'tts').length === 2 && !harness.player.getState().isPrefetching, 'a failed lookahead passage');
  const ttsCalls = () => harness.requests.filter(request => request.kind === 'tts');
  harness.audio[0].emit('ended');
  await waitFor(() => harness.player.getState().status === 'error', 'the failed passage to become a visible error');
  assert.match(harness.player.getState().error, /Temporary narration failure/);

  harness.player.retry();
  await waitFor(() => ttsCalls().length === 3 && harness.player.getState().status === 'playing', 'retry of the same passage');
  assert.equal(ttsCalls()[2].text, ttsCalls()[1].text, 'retry must regenerate the failed passage without advancing its source cursor');
  assert.equal(ttsCalls()[0].text + ttsCalls()[2].text, text, 'successful passages must cover the source exactly once');
});

test('stop revokes every current and prefetched object URL', async t => {
  const harness = createHarness({
    chapterHandler: async call => responseJson({
      chapter: { chapterNumber: call.chapter, content: `${'Current passage. '.repeat(30)}${'Next passage. '.repeat(30)}` },
      navigation: { next: null },
    }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.createdUrls.length === 2, 'current and prefetched audio URLs');
  harness.player.stop();
  assert.equal(harness.revokedUrls.length, harness.createdUrls.length);
  assert.deepEqual([...harness.revokedUrls].sort(), [...harness.createdUrls].sort());
});

test('empty and failed chapter loads produce visible errors without sending text to TTS', async t => {
  const empty = createHarness({
    chapterHandler: async call => responseJson({ chapter: { chapterNumber: call.chapter, content: '   ' }, navigation: { next: null } }),
  });
  t.after(() => empty.dom.window.close());
  empty.player.playBook('dracula');
  await waitFor(() => empty.player.getState().status === 'error', 'an empty chapter error');
  assert.match(empty.player.getState().error, /no text/i);
  assert.equal(empty.requests.filter(request => request.kind === 'tts').length, 0);

  const failed = createHarness({
    chapterHandler: async () => responseJson({ error: 'Chapter text is unavailable right now.' }, { ok: false, status: 503 }),
  });
  t.after(() => failed.dom.window.close());
  failed.player.playBook('dracula');
  await waitFor(() => failed.player.getState().status === 'error', 'a failed chapter request error');
  assert.match(failed.player.getState().error, /Chapter text is unavailable right now/);
  assert.equal(failed.requests.filter(request => request.kind === 'tts').length, 0);
});

test('metadata-only uploaded books fail clearly without fetching a catalog chapter', async t => {
  const upload = { id: 'upload-local-1', slug: 'upload-local-1', title: 'Local Upload', isUpload: true, chaptersList: [] };
  const harness = createHarness({ books: [upload] });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('upload-local-1');
  await waitFor(() => harness.player.getState().status === 'error', 'missing uploaded chapter text');
  assert.match(harness.player.getState().error, /upload|chapter|text/i);
  assert.equal(harness.requests.filter(request => request.kind === 'chapter').length, 0, 'a local upload must not fall back to a remote catalog chapter');
  assert.equal(harness.requests.filter(request => request.kind === 'tts').length, 0);
});

test('a stale backend missing the narration route reports how to recover without retrying automatically', async t => {
  const harness = createHarness({
    ttsHandler: async () => responseJson({ error: 'Not found', path: '/api/tts' }, { ok: false, status: 404 }),
  });
  t.after(() => harness.dom.window.close());
  harness.player.playBook('dracula');
  await waitFor(() => harness.player.getState().status === 'error', 'a missing narration endpoint');
  assert.match(harness.player.getState().error, /restart the NovelCast backend/i);
  assert.equal(harness.requests.filter(request => request.kind === 'tts').length, 1);
  assert.equal(harness.createdUrls.length, 0);
});

test('a known book-not-found response preserves its server message instead of suggesting a backend restart', async t => {
  const serverMessage = 'This book is no longer available in the catalog.';
  const harness = createHarness({
    ttsHandler: async () => responseJson({ error: serverMessage, code: 'TTS_BOOK_NOT_FOUND' }, { ok: false, status: 404 }),
  });
  t.after(() => harness.dom.window.close());

  harness.player.playBook('dracula');
  await waitFor(() => harness.player.getState().status === 'error', 'a structured missing-book response');
  assert.equal(harness.player.getState().error, serverMessage);
  assert.equal(harness.requests.filter(request => request.kind === 'tts').length, 1);
  assert.equal(harness.createdUrls.length, 0);
});

test('substitute chapters and previews are rejected before narration', async t => {
  const cases = [
    {
      name: 'another book',
      payload: { book: { slug: 'different-book' }, chapter: { chapterNumber: 1, content: 'Wrong book text.' }, navigation: { next: null } },
      expected: /does not belong to this book/i,
    },
    {
      name: 'another chapter',
      payload: { book: { slug: 'dracula' }, chapter: { chapterNumber: 2, content: 'Wrong chapter text.' }, navigation: { next: null } },
      expected: /chapter is unavailable/i,
    },
    {
      name: 'catalog preview',
      payload: { book: { slug: 'dracula' }, chapter: { chapterNumber: 1, content: 'Placeholder text.', isPreview: true }, navigation: { next: null } },
      expected: /original chapter text is temporarily unavailable/i,
    },
  ];

  for (const item of cases) {
    const harness = createHarness({ chapterHandler: async () => responseJson(item.payload) });
    t.after(() => harness.dom.window.close());
    harness.player.playBook('dracula');
    await waitFor(() => harness.player.getState().status === 'error', `${item.name} mismatch`);
    assert.match(harness.player.getState().error, item.expected);
    assert.equal(harness.requests.filter(request => request.kind === 'tts').length, 0);
  }
});
