// Play book narration through the backend, preparing only one audio chunk ahead of the current chunk.
(function () {
  'use strict';

  const API_BASE = String((window.__ENV__ && window.__ENV__.API_BASE) || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
  let session = null;
  let sequence = 0;

  // Remove markup before sending readable chapter text for narration.
  function toPlainText(content) {
    let text = String(content || '');
    if (/<\/?(?:p|div|br|h[1-6]|span|em|strong|blockquote|li|ul|ol|a|img|section|table|script|style|iframe)\b/i.test(text)) {
      const markup = text.replace(/<\/(?:p|div|h[1-6]|blockquote|li)>/gi, '$&\n\n').replace(/<br\s*\/?\s*>/gi, '\n');
      // Parse untrusted book markup in an inert document; never attach it to the live page.
      const parsed = new window.DOMParser().parseFromString(markup, 'text/html');
      parsed.querySelectorAll('script,style,iframe').forEach(node => node.remove());
      text = parsed.body.textContent || '';
    }
    return text.replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)([^\n]+?)\1/g, '$2')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/\r\n?/g, '\n').trim();
  }

  // Keep every input character; choose sentence/word boundaries without splitting UTF-16 pairs.
  // Choose a bounded passage, preferring a natural sentence or word boundary.
  function takeChunk(text, size) {
    if (text.length <= size) return text;
    let end = Math.min(size, 1200);
    const prefix = text.slice(0, end);
    const sentence = /[.!?][\u201d\u2019"')]*\s+/g;
    let match;
    let boundary = 0;
    while ((match = sentence.exec(prefix))) boundary = match.index + match[0].length;
    if (boundary >= end / 2) end = boundary;
    else {
      const word = prefix.search(/\s+\S*$/);
      if (word >= end / 2) end = word + 1;
    }
    if (/[\uD800-\uDBFF]/.test(text.charAt(end - 1)) && /[\uDC00-\uDFFF]/.test(text.charAt(end))) end -= 1;
    return text.slice(0, end);
  }

  // Use a short first passage for quicker startup and larger passages afterward.
  function chunkText(text, firstSize = 350, nextSize = 900) {
    const chunks = [];
    let remaining = String(text);
    while (remaining) {
      const chunk = takeChunk(remaining, Math.max(2, Math.min(1200, chunks.length ? nextSize : firstSize)));
      chunks.push(chunk);
      remaining = remaining.slice(chunk.length);
    }
    return chunks;
  }

  function findBook(value) {
    const NC = window.NovelCast;
    const rawId = String(value || '');
    const knownRaw = NC && ((NC.books || []).find(book => book.id === rawId || book.slug === rawId) || (NC.byId && NC.byId[rawId]));
    const id = knownRaw ? rawId : rawId.replace(/^(?:book|detail|search)-/, '');
    if (!id || !NC) return null;
    const exact = (NC.books || []).find(book => book.id === id || book.slug === id) || (NC.byId && NC.byId[id]);
    if (exact) return exact;
    return NC.getExactBook?.(id) || null;
  }

  // Expose a small player snapshot without exposing its internal audio objects.
  function getState() {
    const s = session;
    return {
      status: s ? s.status : 'idle', bookId: s ? s.book.id : null,
      chapter: s ? (s.current ? s.current.chapter : (s.cursor.chapter || s.lastChapter)) : null,
      error: s ? s.error : null, hasNext: !!(s && s.next), isPrefetching: !!(s && s.nextPending),
      voiceId: s ? s.voiceId : null, voiceName: s ? s.voiceName : null
    };
  }

  // Update the persistent player controls and announce the current playback state.
  function render() {
    const s = session;
    const player = document.getElementById('global-audio-player');
    if (player) player.hidden = !s;
    if (!s) {
      document.dispatchEvent(new CustomEvent('novelcast:audio-state', { detail: getState() }));
      return;
    }
    const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
    setText('player-title', s.book.title || 'Book');
    setText('player-chapter', `Reading chapter ${getState().chapter}`);
    setText('player-voice', s.voiceName ? `Library voice: ${s.voiceName}` : (s.voiceId ? 'Library voice selected' : 'Choosing a library voice…'));
    const labels = { loading: 'Choosing a voice and preparing the first passage…', playing: 'Playing', paused: 'Paused', buffering: 'Preparing the next passage…', error: s.error || 'Audio unavailable.', finished: 'Book finished' };
    setText('player-status', s.blocked ? 'Press Play to start listening.' : labels[s.status]);
    const play = document.getElementById('player-play-btn');
    if (play) {
      const pausable = s.wantsPlay && s.status !== 'error' && s.status !== 'finished';
      play.setAttribute('aria-label', pausable ? 'Pause listening' : 'Play narration');
      play.textContent = pausable ? 'Pause' : 'Play';
      play.disabled = s.status === 'error' || s.status === 'finished';
    }
    const retry = document.getElementById('player-retry-btn');
    if (retry) retry.hidden = s.status !== 'error';
    document.dispatchEvent(new CustomEvent('novelcast:audio-state', { detail: getState() }));
  }

  // Ignore completed work belonging to an older playback session or canceled request.
  function alive(s, epoch) { return session === s && s.epoch === epoch; }
  // Stop an audio object, detach its handlers and release its temporary blob URL.
  function release(track) {
    if (!track) return;
    track.audio.pause();
    if (track.cleanup) track.cleanup();
    track.audio.removeAttribute('src');
    if (track.audio.load) track.audio.load();
    URL.revokeObjectURL(track.url);
  }
  // Cancel unfinished chapter/audio requests and invalidate their old callbacks.
  function abortRequests(s) {
    s.epoch += 1;
    s.controllers.forEach(controller => controller.abort());
    s.controllers.clear();
    s.nextPending = null;
    s.currentPending = null;
    if (!s.next && !s.nextError) s.nextAttempted = false;
  }
  function stop() {
    const s = session;
    session = null;
    if (s) { abortRequests(s); release(s.current); release(s.next); }
    render();
  }

  // Fetch chapter JSON or audio with a timeout; reject stale responses and unexpected voice changes.
  async function request(s, epoch, url, options) {
    const controller = new AbortController();
    s.controllers.add(controller);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, options ? 75000 : 30000);
    try {
      const response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      if (!response.ok) {
        let data;
        try { data = await response.json(); } catch (_) { /* Non-JSON upstream error. */ }
        if (options && response.status === 404 && !(data && data.code)) {
          throw new Error('The narration endpoint is missing. Restart the NovelCast backend and retry.');
        }
        const message = data && data.error ? String(data.error) : 'Narration could not be prepared. Please retry.';
        throw new Error(message);
      }
      let voiceId = null;
      let voiceName = null;
      if (options) {
        if (!alive(s, epoch)) throw new DOMException('Cancelled', 'AbortError');
        const headers = response.headers;
        if (headers && typeof headers.get === 'function') {
          voiceId = String(headers.get('X-TTS-Voice-Id') || '').trim() || null;
          voiceName = String(headers.get('X-TTS-Voice-Name') || '').trim() || null;
          if (voiceName) {
            try { voiceName = decodeURIComponent(voiceName); } catch (_) { /* Retain a readable legacy header. */ }
          }
        }
        if (s.voiceId && voiceId !== s.voiceId) {
          controller.abort();
          throw new Error('The library voice changed unexpectedly. Retry to continue with the original voice.');
        }
        if (headers && typeof headers.get === 'function' && !voiceId) {
          controller.abort();
          throw new Error('The library voice could not be confirmed. Please retry.');
        }
      }
      const result = options ? await response.blob() : await response.json();
      if (!alive(s, epoch)) throw new DOMException('Cancelled', 'AbortError');
      if (options && voiceId) {
        s.voiceId = voiceId;
        if (!s.voiceName && voiceName) s.voiceName = voiceName;
        render();
      }
      return result;
    } catch (error) {
      if (timedOut) throw new Error(options ? 'Narration took too long to prepare. Please retry.' : 'The chapter took too long to load. Please retry.');
      throw error;
    } finally { clearTimeout(timeout); s.controllers.delete(controller); }
  }

  // Load the exact chapter, choose the next passage and ask the backend to synthesize it.
  async function passage(s, epoch) {
    const sourceCursor = s.cursor;
    let cursor = sourceCursor;
    if (cursor.chapter === null) return null;
    if (cursor.text === null) {
      let content;
      let nextChapter;
      const localChapters = s.book.chaptersList || [];
      const local = localChapters.find((chapter, index) => Number(chapter.chapterNumber || index + 1) === cursor.chapter);
      if (local && typeof local.content === 'string') {
        content = local.content;
        const index = localChapters.indexOf(local);
        const next = localChapters[index + 1];
        nextChapter = next ? Number(next.chapterNumber || index + 2) : null;
      } else {
        if (String(s.book.id || '').startsWith('upload-') || s.book.isUpload || s.book.source === 'upload') {
          throw new Error('The original text is unavailable for this upload.');
        }
        const data = await request(s, epoch, `${API_BASE}/books/${encodeURIComponent(s.book.slug || s.book.id)}/chapters/${cursor.chapter}`);
        if (!data || !data.chapter || typeof data.chapter.content !== 'string') throw new Error('The original chapter text is unavailable. Please retry.');
        if (data.chapter.isPreview) throw new Error('The original chapter text is temporarily unavailable. Please retry.');
        const expectedIds = [s.book.slug, s.book.id, s.book._id].filter(Boolean).map(String);
        const receivedIds = data.book ? [data.book.slug, data.book.id, data.book._id].filter(Boolean).map(String) : [];
        if (receivedIds.length && !receivedIds.some(id => expectedIds.includes(id))) throw new Error('The chapter does not belong to this book.');
        if (data.chapter.chapterNumber != null && Number(data.chapter.chapterNumber) !== cursor.chapter) throw new Error('The requested chapter is unavailable.');
        content = data.chapter.content;
        nextChapter = data.navigation && data.navigation.next != null ? Number(data.navigation.next) : null;
        if (nextChapter !== null && (!Number.isInteger(nextChapter) || nextChapter <= cursor.chapter)) throw new Error('The next chapter could not be identified.');
      }
      const text = toPlainText(content);
      if (!text) throw new Error('This chapter has no text available to narrate.');
      cursor = { chapter: cursor.chapter, text, offset: 0, nextChapter };
    }
    const remaining = cursor.text.slice(cursor.offset);
    const text = takeChunk(remaining, s.started ? 900 : 350);
    const offset = cursor.offset + text.length;
    const nextCursor = offset < cursor.text.length
      ? Object.assign({}, cursor, { offset })
      : { chapter: cursor.nextChapter, text: null, offset: 0 };
    const blob = await request(s, epoch, `${API_BASE}/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, bookId: s.requestBookId }) });
    if (!blob.size) throw new Error('The narration service returned no audio. Please retry.');
    const url = URL.createObjectURL(blob);
    const audio = new window.Audio();
    audio.preload = 'auto';
    audio.src = url;
    return { audio, url, chapter: cursor.chapter, sourceCursor, nextCursor, ended: false };
  }

  function fail(s, error) {
    if (session !== s) return;
    abortRequests(s);
    s.advancing = false;
    if (s.current) s.current.audio.pause();
    s.status = 'error';
    s.error = error.message || 'Audio unavailable. Please retry.';
    s.wantsPlay = false;
    render();
  }

  // Prepare at most one upcoming passage while the current passage plays.
  function prefetch(s) {
    if (session !== s || !s.wantsPlay || !s.current || s.current.ended || s.next || s.nextPending || s.nextAttempted || s.nextError || s.cursor.chapter === null) return;
    s.nextAttempted = true;
    const epoch = s.epoch;
    const pending = passage(s, epoch).then(track => {
      if (!alive(s, epoch)) { release(track); return; }
      s.next = track;
      if (track) s.cursor = track.nextCursor;
    }).catch(error => {
      if (alive(s, epoch) && error.name !== 'AbortError') s.nextError = error;
    }).finally(() => {
      if (s.nextPending === pending) s.nextPending = null;
      if (alive(s, epoch)) render();
    });
    s.nextPending = pending;
    render();
  }

  function played(s, track) {
    if (session !== s || s.current !== track || track.ended || !s.wantsPlay) return;
    s.started = true;
    s.status = 'playing';
    s.blocked = false;
    render();
    prefetch(s);
  }

  async function playCurrent(s) {
    const track = s.current;
    const epoch = s.epoch;
    if (!track || track.ended || !s.wantsPlay) return;
    try {
      await track.audio.play();
      if (alive(s, epoch)) played(s, track);
    } catch (error) {
      if (!alive(s, epoch) || !s.wantsPlay) return;
      if (error.name === 'NotAllowedError') {
        abortRequests(s);
        s.advancing = false;
        track.audio.pause();
        s.wantsPlay = false; s.blocked = true; s.status = 'paused'; render();
      } else fail(s, error);
    }
  }

  // Attach playback events to the current chunk and detach them when that chunk is replaced.
  function installCurrent(s, track) {
    s.current = track;
    s.lastChapter = track.chapter;
    s.cursor = track.nextCursor;
    s.nextAttempted = false;
    s.nextError = null;
    const onPlaying = () => played(s, track);
    const onEnded = () => {
      if (session !== s || s.current !== track || track.ended) return;
      track.ended = true;
      if (s.wantsPlay) advance(s);
    };
    const onError = () => { if (session === s && s.current === track) { track.audio.pause(); fail(s, new Error('This passage could not be played. Please retry.')); } };
    track.audio.addEventListener('playing', onPlaying);
    track.audio.addEventListener('ended', onEnded);
    track.audio.addEventListener('error', onError);
    track.cleanup = () => {
      track.audio.removeEventListener('playing', onPlaying);
      track.audio.removeEventListener('ended', onEnded);
      track.audio.removeEventListener('error', onError);
    };
    playCurrent(s);
  }

  // Move to the prepared chunk, or show buffering while the next one is requested.
  async function advance(s) {
    if (session !== s || !s.wantsPlay || s.advancing) return;
    s.advancing = true;
    s.status = s.current ? 'buffering' : 'loading';
    render();
    const epoch = s.epoch;
    try {
      if (s.nextPending) await s.nextPending;
      if (!alive(s, epoch) || !s.wantsPlay) return;
      if (s.nextError) throw s.nextError;
      let track = s.next;
      if (track) s.next = null;
      else {
        s.currentPending = true;
        track = await passage(s, epoch);
        if (!alive(s, epoch)) { release(track); return; }
        s.currentPending = null;
      }
      if (!s.wantsPlay) { release(track); return; }
      release(s.current);
      s.current = null;
      if (!track) { s.status = 'finished'; s.wantsPlay = false; render(); return; }
      installCurrent(s, track);
    } catch (error) {
      if (alive(s, epoch) && error.name !== 'AbortError') fail(s, error);
    } finally {
      if (alive(s, epoch)) { s.advancing = false; s.currentPending = null; }
    }
  }

  function pause() {
    const s = session;
    if (!s) return;
    s.wantsPlay = false;
    abortRequests(s);
    s.advancing = false;
    if (s.current) s.current.audio.pause();
    s.status = 'paused';
    render();
  }
  function resume() {
    const s = session;
    if (!s || s.status === 'finished') return;
    if (s.status === 'error') return retry();
    s.wantsPlay = true;
    s.blocked = false;
    s.status = 'buffering';
    render();
    if (s.current && !s.current.ended) playCurrent(s);
    else advance(s);
  }
  // Retry failed preparation from the current passage instead of silently skipping text.
  function retry() {
    const s = session;
    if (!s || s.status !== 'error') return;
    s.error = null; s.nextError = null; s.nextAttempted = false; s.wantsPlay = true;
    // Regenerate a failed current passage without moving past its original text.
    if (s.current && !s.current.ended) {
      s.cursor = s.current.sourceCursor;
      release(s.current); release(s.next);
      s.current = null; s.next = null;
    }
    advance(s);
  }
  // Start a new book session, or toggle playback when that book is already active.
  function playBook(value, options) {
    const book = findBook(value);
    if (!book) { if (window.NovelCast && window.NovelCast.toast) window.NovelCast.toast('This book is unavailable for listening.'); return false; }
    const chapter = options && Number.isInteger(options.chapter) && options.chapter > 0 ? options.chapter : 1;
    if (session && session.book.id === book.id && (!options || !options.chapter || session.startChapter === chapter) && session.status !== 'finished') { toggle(); return true; }
    stop();
    session = {
      id: ++sequence, book, requestBookId: String(book.slug || book.id), voiceId: null, voiceName: null,
      startChapter: chapter, status: 'loading', error: null, cursor: { chapter, text: null, offset: 0 },
      controllers: new Set(), epoch: 0, wantsPlay: true, current: null, next: null,
      currentPending: null, nextPending: null, nextAttempted: false, nextError: null, advancing: false, started: false, blocked: false
    };
    render();
    advance(session);
    return true;
  }
  function toggle(value) {
    if (value) return playBook(value);
    if (!session) return;
    if (session.wantsPlay) pause(); else resume();
  }
  // Attach narration buttons once, including buttons inserted by a later view render.
  function bind(scope) {
    (scope || document).querySelectorAll('[data-audio-stub]').forEach(button => {
      if (button.dataset.audioStubBound) return;
      button.dataset.audioStubBound = '1';
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        playBook(button.dataset.audioStub, button.dataset.audioChapter ? { chapter: Number(button.dataset.audioChapter) } : undefined);
      });
    });
  }
  function init() {
    const play = document.getElementById('player-play-btn');
    const close = document.getElementById('player-close-btn');
    const retryButton = document.getElementById('player-retry-btn');
    if (play) play.addEventListener('click', () => toggle());
    if (close) close.addEventListener('click', stop);
    if (retryButton) retryButton.addEventListener('click', retry);
  }
  window.NovelCastAudio = { playBook, start: playBook, toggle, pause, resume, retry, stop, getState, bind, chunkText, toPlainText };
  window.addEventListener('beforeunload', stop);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
