'use strict';

/**
 * Shared HTTP helpers built on Node's global fetch (Node 18+).
 *
 * Every outbound call to Gutendex / Project Gutenberg / Open Library goes
 * through here so timeouts, retries and user-agent policy live in one place.
 * A hung upstream is the single most common failure mode for this pipeline,
 * so a hard timeout is mandatory rather than optional.
 */

const USER_AGENT =
  'NovelCast/1.0 (educational book catalog; https://github.com/) node-fetch-compatible';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;

// Pause between attempts while allowing the event loop to serve other requests.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Timeouts, throttling and server failures may be temporary.
function isRetryableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

class HttpError extends Error {
  // Keep the failed URL and optional HTTP status alongside the error message.
  constructor(message, { status, url } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

/**
 * Fetch with timeout + bounded retries.
 * @param {string} url
 * @param {{timeout?: number, retries?: number, headers?: Record<string,string>, method?: string, body?: string}} [options]
 * @returns {Promise<Response>}
 */
async function request(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    headers = {},
    method = 'GET',
    body,
  } = options;

  let lastError;

  // Each attempt has its own abort timer so a stalled provider cannot wait indefinitely.
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        body,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: '*/*', ...headers },
      });

      // Retry temporary HTTP failures within the limit; turn other failures into HttpError.
      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt <= retries) {
          lastError = new HttpError(`HTTP ${response.status} for ${url}`, {
            status: response.status,
            url,
          });
          await sleep(400 * attempt);
          continue;
        }
        throw new HttpError(`HTTP ${response.status} for ${url}`, { status: response.status, url });
      }

      return response;
    // Remember network or abort failures and retry only while attempts remain.
    } catch (error) {
      lastError = error;
      if (attempt > retries) break;
      await sleep(400 * attempt);
    // Always cancel this attempt’s timer, including on success or retry.
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError && lastError.name === 'AbortError') {
    throw new HttpError(`Request timed out after ${timeout}ms: ${url}`, { url });
  }
  throw lastError || new HttpError(`Request failed: ${url}`, { url });
}

/** Decode a response body respecting the charset the server declared. */
async function readText(response) {
  // Read bytes first so the declared character set can determine how text is decoded.
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const match = /charset=["']?([\w-]+)/i.exec(contentType);
  const charset = (match ? match[1] : 'utf-8').toLowerCase();

  if (charset === 'utf-8' || charset === 'utf8') return buffer.toString('utf8');

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

// Return decoded text after the shared request/timeout handling succeeds.
async function fetchText(url, options) {
  const response = await request(url, options);
  return readText(response);
}

// Parse provider JSON and make an invalid response an explicit request failure.
async function fetchJson(url, options) {
  const response = await request(url, options);
  const text = await readText(response);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(`Expected JSON from ${url} but got ${text.slice(0, 120)}`, { url });
  }
}

module.exports = { request, fetchText, fetchJson, readText, HttpError, USER_AGENT };
