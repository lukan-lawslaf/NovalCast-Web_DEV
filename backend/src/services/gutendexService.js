'use strict';

/**
 * Gutendex + Project Gutenberg source service.
 *
 * Gutendex is the primary catalog API. It is a volunteer-run service and does
 * go down (or hang) — so every call falls back to gutenberg.org directly, which
 * exposes the same data as plain HTML and serves the text files themselves.
 * Both paths return the same normalised shape, so callers never branch.
 */

const { fetchJson, fetchText } = require('../utils/httpClient');

const GUTENDEX_BASE = 'https://gutendex.com';
const GUTENBERG_WEB = 'https://www.gutenberg.org';
const GUTENBERG_CACHE = `${GUTENBERG_WEB}/cache/epub`;

const GUTENDEX_TIMEOUT_MS = 8000;
const GUTENBERG_TIMEOUT_MS = 20000;
const TEXT_TIMEOUT_MS = 45000;

const FALLBACK_SUBJECT = 'Public domain literature';

/** Prefer a plain-text format; never return a .zip or an HTML rendering. */
function pickTextUrl(formats = {}) {
  const preferred = ['text/plain; charset=utf-8', 'text/plain; charset=us-ascii', 'text/plain'];
  for (const key of preferred) {
    if (formats[key]) return formats[key];
  }

  const entry = Object.entries(formats).find(
    ([mimeType, url]) => mimeType.startsWith('text/plain') && !url.endsWith('.zip')
  );
  return entry ? entry[1] : null;
}

/**
 * Gutendex lists authors as "Shelley, Mary Wollstonecraft"; flip that to the
 * natural reading order so the catalog does not look like a card index.
 */
function naturalName(name) {
  const parts = String(name).split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  if (parts.length >= 3) return `${parts[1]} ${parts[0]}, ${parts.slice(2).join(', ')}`;
  return parts[0] || '';
}

function normalizeAuthor(authors = []) {
  if (!authors.length) return 'Unknown Author';
  const names = authors.map((author) => naturalName(author.name || '').trim()).filter(Boolean);
  return names.length ? names.slice(0, 3).join(', ') : 'Unknown Author';
}

/** Gutendex payload -> internal shape. */
function fromGutendex(payload) {
  const formats = payload.formats || {};
  return {
    source: 'gutendex',
    gutendexId: payload.id,
    title: (payload.title || '').trim(),
    author: normalizeAuthor(payload.authors),
    subjects: (payload.subjects || []).map((s) => s.trim()).filter(Boolean).slice(0, 24),
    languages: payload.languages || [],
    downloadCount: payload.download_count || 0,
    textUrl: pickTextUrl(formats) || `${GUTENBERG_CACHE}/${payload.id}/pg${payload.id}.txt`,
    coverUrl: formats['image/jpeg'] || `${GUTENBERG_CACHE}/${payload.id}/pg${payload.id}.cover.medium.jpg`,
  };
}

const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

function metaContent(html, property) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
  const match = pattern.exec(html);
  return match ? decodeEntities(match[1]).trim() : '';
}

/**
 * Metadata straight from the Gutenberg ebook page.
 * og:title reads "Frankenstein; or, the modern prometheus by Mary Wollstonecraft Shelley",
 * which splits cleanly into title + author.
 */
async function getBookFromGutenberg(gutendexId) {
  const html = await fetchText(`${GUTENBERG_WEB}/ebooks/${gutendexId}`, {
    timeout: GUTENBERG_TIMEOUT_MS,
    retries: 1,
  });

  const ogTitle = metaContent(html, 'og:title') || `Project Gutenberg eBook #${gutendexId}`;
  const ogImage = metaContent(html, 'og:image');

  let title = ogTitle;
  let author = 'Unknown Author';
  const authorSplit = ogTitle.match(/^(.*?)\s+by\s+(.+)$/i);
  if (authorSplit) {
    title = authorSplit[1].trim();
    author = authorSplit[2].trim();
  }

  const subjects = [];
  for (const match of html.matchAll(/href="\/ebooks\/subject\/[^"]*"[^>]*>([^<]+)<\/a>/gi)) {
    const subject = decodeEntities(match[1]).trim();
    if (subject && !subjects.includes(subject)) subjects.push(subject);
  }

  const languageMatch = /href="\/ebooks\/language\/[^"]*"[^>]*>([^<]+)<\/a>/i.exec(html);

  return {
    source: 'gutenberg',
    gutendexId: Number(gutendexId),
    title,
    author,
    subjects: subjects.slice(0, 24),
    languages: languageMatch ? [languageMatch[1].trim()] : ['en'],
    downloadCount: 0,
    textUrl: `${GUTENBERG_CACHE}/${gutendexId}/pg${gutendexId}.txt`,
    coverUrl: ogImage || `${GUTENBERG_CACHE}/${gutendexId}/pg${gutendexId}.cover.medium.jpg`,
  };
}

/**
 * Metadata for one book. Gutendex first, gutenberg.org on any failure.
 * @param {number|string} gutendexId
 */
async function getBookById(gutendexId) {
  const id = Number(gutendexId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid Gutendex id: ${gutendexId}`);
  }

  try {
    const payload = await fetchJson(`${GUTENDEX_BASE}/books/${id}/`, {
      timeout: GUTENDEX_TIMEOUT_MS,
      retries: 1,
    });
    const book = fromGutendex(payload);
    if (!book.title) throw new Error('Gutendex returned a book without a title');
    return book;
  } catch (error) {
    console.warn(`[gutendex] id ${id} unavailable (${error.message}); using gutenberg.org.`);
    return getBookFromGutenberg(id);
  }
}

/**
 * Free-text search. Gutendex first, then the Gutenberg search page.
 * @returns {Promise<Array>} normalised books, best match first
 */
async function searchBooks(query, { limit = 8 } = {}) {
  try {
    const payload = await fetchJson(
      `${GUTENDEX_BASE}/books?search=${encodeURIComponent(query)}`,
      { timeout: GUTENDEX_TIMEOUT_MS, retries: 1 }
    );
    const results = (payload.results || []).map(fromGutendex).filter((book) => book.title);
    if (results.length) return results.slice(0, limit);
  } catch (error) {
    console.warn(`[gutendex] search "${query}" failed (${error.message}); using gutenberg.org.`);
  }

  const html = await fetchText(
    `${GUTENBERG_WEB}/ebooks/search/?query=${encodeURIComponent(query)}`,
    { timeout: GUTENBERG_TIMEOUT_MS, retries: 1 }
  );

  const ids = [];
  for (const match of html.matchAll(/href="\/ebooks\/(\d+)"/g)) {
    const id = Number(match[1]);
    if (Number.isInteger(id) && !ids.includes(id)) ids.push(id);
    if (ids.length >= limit) break;
  }

  const books = [];
  for (const id of ids) {
    try {
      books.push(await getBookFromGutenberg(id));
    } catch (error) {
      console.warn(`[gutendex] could not read gutenberg.org/ebooks/${id}: ${error.message}`);
    }
  }

  return books;
}

/** Resolve a title search to a single book, or throw. */
async function resolveBySearch(query) {
  const results = await searchBooks(query, { limit: 5 });
  if (!results.length) {
    const error = new Error(`No book found matching "${query}"`);
    error.status = 404;
    throw error;
  }
  return results[0];
}

/** Download the full plain-text body for a normalised book. */
async function downloadBookText(book) {
  if (!book || !book.textUrl) throw new Error('downloadBookText: book has no text URL');
  const text = await fetchText(book.textUrl, {
    timeout: TEXT_TIMEOUT_MS,
    retries: 2,
    headers: { accept: 'text/plain' },
  });

  if (!text || text.length < 500) {
    throw new Error(`Suspiciously short text from ${book.textUrl} (${text ? text.length : 0} bytes)`);
  }
  return text;
}

module.exports = {
  getBookById,
  searchBooks,
  resolveBySearch,
  downloadBookText,
  getBookFromGutenberg,
  pickTextUrl,
  fromGutendex,
  GUTENBERG_CACHE,
};
