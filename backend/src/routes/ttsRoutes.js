'use strict';

const express = require('express');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const env = require('../config/env');
const {
  FISH_AUDIO_MODEL,
  MAX_AUDIO_BYTES,
  TTS_TIMEOUT_MS,
  MAX_CONCURRENT_TTS_REQUESTS,
  TtsError,
  validateTtsText,
  validateReferenceId,
  requestFishAudio,
} = require('../services/fishAudioService');
const { createNarrationVoiceResolver, validateBookId } = require('../services/narrationVoiceService');

/** A factory allows isolated tests without a real Fish Audio key or request. */
function createTtsRouter({
  apiKey = env.FISH_AUDIO_API_KEY,
  referenceId = env.FISH_AUDIO_REFERENCE_ID,
  voiceResolver = createNarrationVoiceResolver({ referenceId }),
  fetchImpl,
  timeoutMs = TTS_TIMEOUT_MS,
  maxConcurrent = MAX_CONCURRENT_TTS_REQUESTS,
} = {}) {
  const router = express.Router();
  let activeRequests = 0;

  router.post('/tts', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    let text;
    let bookId;
    try {
      text = validateTtsText(req.body && req.body.text);
      bookId = validateBookId(req.body && req.body.bookId);
    } catch (error) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(503).json({ error: 'Narration is unavailable because the server Fish Audio key is not configured.', code: 'TTS_NOT_CONFIGURED' });
    }

    // Reject surplus work immediately. There is no whole-book queue or cache.
    if (activeRequests >= maxConcurrent) {
      return res.status(429).json({ error: 'Narration is busy. Please try again shortly.', code: 'TTS_BUSY' });
    }

    activeRequests += 1;
    const controller = new AbortController();
    let timedOut = false;
    let disconnected = false;
    let audio;
    const abortClient = () => {
      if (res.writableFinished) return;
      disconnected = true;
      controller.abort();
    };
    req.once('aborted', abortClient);
    res.once('close', abortClient);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    timer.unref?.();

    try {
      const voice = await voiceResolver(bookId, { signal: controller.signal });
      controller.signal.throwIfAborted();
      const voiceId = validateReferenceId(voice && voice.referenceId);
      if (!voice || typeof voice.name !== 'string' || !voice.name.trim()) {
        throw new TtsError(503, 'TTS_VOICE_UNAVAILABLE', 'The saved narration voice has no display name.');
      }
      const upstream = await requestFishAudio(text, { apiKey, referenceId: voiceId, signal: controller.signal, fetchImpl });
      audio = Readable.fromWeb(upstream.body, { signal: controller.signal, highWaterMark: 64 * 1024 });
      const iterator = audio[Symbol.asyncIterator]();
      // Wait for actual bytes before sending 200, so an empty body is an error.
      const first = await iterator.next();
      if (first.done || !first.value.length) {
        throw new TtsError(502, 'TTS_INVALID_AUDIO', 'Fish Audio returned no playable narration.');
      }
      if (first.value.length > MAX_AUDIO_BYTES) {
        throw new TtsError(502, 'TTS_AUDIO_TOO_LARGE', 'Fish Audio returned a narration response that was too large.');
      }

      const limitedAudio = Readable.from((async function* () {
        let totalBytes = first.value.length;
        yield first.value;
        for await (const chunk of iterator) {
          totalBytes += chunk.length;
          if (totalBytes > MAX_AUDIO_BYTES) {
            throw new TtsError(502, 'TTS_AUDIO_TOO_LARGE', 'Fish Audio returned a narration response that was too large.');
          }
          yield chunk;
        }
      })(), { objectMode: false });

      res.status(200).set({
        'Content-Type': 'audio/mpeg',
        'X-TTS-Model': FISH_AUDIO_MODEL,
        'X-TTS-Voice-Id': voiceId,
        'X-TTS-Voice-Name': encodeURIComponent(voice.name.trim()),
      });
      await pipeline(limitedAudio, res, { signal: controller.signal });
    } catch (error) {
      if (disconnected || res.destroyed) return;
      const failure = timedOut
        ? new TtsError(504, 'TTS_TIMEOUT', 'Narration took too long. Please try again.')
        : error instanceof TtsError
          ? error
          : new TtsError(502, 'TTS_STREAM_ERROR', 'The narration stream was interrupted. Please try again.');
      if (res.headersSent) {
        // A partial MP3 must fail, rather than look like completed narration.
        res.destroy();
      } else {
        res.removeHeader('Content-Type');
        res.removeHeader('X-TTS-Model');
        res.removeHeader('X-TTS-Voice-Id');
        res.removeHeader('X-TTS-Voice-Name');
        res.status(failure.status).json({ error: failure.message, code: failure.code });
      }
    } finally {
      clearTimeout(timer);
      req.removeListener('aborted', abortClient);
      res.removeListener('close', abortClient);
      controller.abort();
      if (audio && !audio.destroyed) audio.destroy();
      activeRequests -= 1;
    }
  });

  return router;
}

module.exports = createTtsRouter();
module.exports.createTtsRouter = createTtsRouter;
