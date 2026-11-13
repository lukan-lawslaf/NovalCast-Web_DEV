'use strict';

// Server-only Fish Audio client: validate small passages and return a bounded MP3 response.

// Never accept a model from an environment variable or a browser request.
// Fish Audio may select a paid model when this header is absent or unrecognised.
const FISH_AUDIO_MODEL = 's2.1-pro-free';
const FISH_AUDIO_URL = 'https://api.fish.audio/v1/tts';
const MAX_TTS_TEXT_LENGTH = 1200;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const TTS_TIMEOUT_MS = 60_000;
const MAX_CONCURRENT_TTS_REQUESTS = 4;

class TtsError extends Error {
  // Carry a safe HTTP status and stable error code back to the narration route.
  constructor(status, code, message) {
    super(message);
    this.name = 'TtsError';
    this.status = status;
    this.code = code;
  }
}

// Reject empty/oversized input before sending any text to the provider.
function validateTtsText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TtsError(400, 'TTS_INVALID_TEXT', 'Provide a nonempty text passage for narration.');
  }
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    throw new TtsError(400, 'TTS_INVALID_TEXT', `Narration passages must be ${MAX_TTS_TEXT_LENGTH} characters or fewer.`);
  }
  return text.trim();
}

// Every chunk needs an explicit saved voice; there is no unspecified-speaker fallback.
function validateReferenceId(referenceId) {
  if (typeof referenceId !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(referenceId.trim())) {
    throw new TtsError(503, 'TTS_VOICE_UNAVAILABLE', 'A saved narration voice is unavailable for this book.');
  }
  return referenceId.trim();
}

// Translate provider failures into safe user messages without retrying with a paid model.
function upstreamError(status) {
  if (status === 401 || status === 403) {
    return new TtsError(503, 'TTS_AUTH_FAILED', 'Narration is unavailable because Fish Audio rejected the server API key.');
  }
  if (status === 402) {
    return new TtsError(402, 'TTS_ACCESS_REQUIRED', 'Fish Audio requires account access or credits for this request. Narration stopped; no paid model was requested.');
  }
  if (status === 429) {
    return new TtsError(429, 'TTS_RATE_LIMITED', 'Fish Audio has limited narration requests. Please try again later.');
  }
  if (status === 404) {
    return new TtsError(503, 'TTS_MODEL_UNAVAILABLE', 'The free narration model is unavailable. No paid model was requested.');
  }
  return new TtsError(502, 'TTS_UPSTREAM_ERROR', 'Fish Audio could not generate this narration. Please try again later.');
}

// Cancel an unusable provider body so its network resources can be released.
function discardResponse(response) {
  // Do not read or expose upstream error bodies: they can contain request data.
  if (response && response.body && typeof response.body.cancel === 'function') {
    Promise.resolve(response.body.cancel()).catch(() => {});
  }
}

/** Request one bounded passage. The caller owns the returned audio stream. */
async function requestFishAudio(text, { apiKey, referenceId, signal, fetchImpl = globalThis.fetch } = {}) {
  const passage = validateTtsText(text);
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new TtsError(503, 'TTS_NOT_CONFIGURED', 'Narration is unavailable because the server Fish Audio key is not configured.');
  }

  // A reference is mandatory: omitting it lets Fish Audio vary the voice.
  const body = { text: passage, format: 'mp3', latency: 'balanced', reference_id: validateReferenceId(referenceId) };

  // Send the server key, fixed free model, saved reference, and cancellation signal to Fish Audio.
  let response;
  try {
    response = await fetchImpl(FISH_AUDIO_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        model: FISH_AUDIO_MODEL,
      },
      body: JSON.stringify(body),
      signal,
      // Do not forward a server credential to a redirected endpoint.
      redirect: 'error',
    });
  } catch (error) {
    if (signal && signal.aborted) throw error;
    throw new TtsError(502, 'TTS_NETWORK_ERROR', 'Could not connect to Fish Audio. Please try again later.');
  }

  if (!response.ok) {
    discardResponse(response);
    throw upstreamError(response.status);
  }

  // Check the returned media type, body, and declared size before allowing streaming.
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const contentLength = response.headers.get('content-length');
  if (!['audio/mpeg', 'audio/mp3', 'application/octet-stream'].includes(contentType) || !response.body || contentLength === '0') {
    discardResponse(response);
    throw new TtsError(502, 'TTS_INVALID_AUDIO', 'Fish Audio returned no playable narration.');
  }
  if (contentLength !== null && Number(contentLength) > MAX_AUDIO_BYTES) {
    discardResponse(response);
    throw new TtsError(502, 'TTS_AUDIO_TOO_LARGE', 'Fish Audio returned a narration response that was too large.');
  }

  return response;
}

module.exports = {
  FISH_AUDIO_MODEL,
  FISH_AUDIO_URL,
  MAX_TTS_TEXT_LENGTH,
  MAX_AUDIO_BYTES,
  TTS_TIMEOUT_MS,
  MAX_CONCURRENT_TTS_REQUESTS,
  TtsError,
  validateTtsText,
  validateReferenceId,
  requestFishAudio,
};
