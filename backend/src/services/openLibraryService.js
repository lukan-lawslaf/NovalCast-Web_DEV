'use strict';

/**
 * Open Library enrichment.
 *
 * Supplies the two things Gutenberg does not: a high-resolution cover and a
 * real synopsis. Every field is optional — a failure here must never fail an
 * ingest, so all errors resolve to nulls.
 */

const { fetchJson } = require('../utils/httpClient');

const SEARCH_BASE = 'https://openlibrary.org/search.json';
const COVERS_BASE = 'https://covers.openlibrary.org/b';
const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

const TIMEOUT_MS = 12000;

const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'cover_i',
  'cover_edition_key',
  'subject',
  'first_publish_year',
  'edition_count',
].join(',');

// Accept either description shape and flatten markdown/whitespace into readable text.
function readableDescription(raw) {
  if (!raw) return '';
  const text = typeof raw === 'string' ? raw : raw.value || '';
  if (typeof text !== 'string') return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown links -> label
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove accents and punctuation so title and author comparisons ignore formatting differences.
function normalizeWords(value) {
  return typeof value === 'string'
    ? value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[’‘']/g, '').toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    : '';
}

// Compare full and subtitle-free titles so a cover must belong to the requested work.
function titleKeys(title) {
  if (typeof title !== 'string') return [];
  const mainTitle = title.split(/;|:\s|\s+[–—-]\s+|\s+\/\s+/u)[0];
  return [...new Set([normalizeWords(title), normalizeWords(mainTitle)].filter(Boolean))];
}

// Normalize name order and dates before matching; an unknown author is not a reliable match.
function authorKeys(author) {
  if (typeof author !== 'string') return [];
  const name = author.replace(/\([^()]*\)/g, ' ').replace(/[,\s]+\d{3,4}(?:\s*[-–]\s*\d{0,4})?\s*$/u, '').trim();
  const normalized = normalizeWords(name);
  if (!normalized || ['unknown', 'unknown author', 'anonymous'].includes(normalized)) return [];
  const parts = name.split(',').map(part => part.trim()).filter(Boolean);
  return parts.length === 2 ? [normalized, normalizeWords(`${parts[1]} ${parts[0]}`)] : [normalized];
}

/** The work endpoint carries the synopsis; search.json usually does not. */
async function fetchWorkDescription(workKey) {
  if (typeof workKey !== 'string' || !/^\/works\/OL[1-9]\d*W$/.test(workKey)) return '';
  try {
    const work = await fetchJson(`${OPEN_LIBRARY_BASE}${workKey}.json`, {
      timeout: TIMEOUT_MS,
      retries: 1,
    });
    return readableDescription(work.description);
  } catch {
    return '';
  }
}

// Only recognized cover IDs/edition IDs are converted into provider image URLs.
function buildCoverUrl(doc) {
  if (Number.isSafeInteger(doc.cover_i) && doc.cover_i > 0) return `${COVERS_BASE}/id/${doc.cover_i}-L.jpg?default=false`;
  if (typeof doc.cover_edition_key === 'string' && /^OL[1-9]\d*M$/.test(doc.cover_edition_key)) {
    return `${COVERS_BASE}/olid/${doc.cover_edition_key}-L.jpg?default=false`;
  }
  return '';
}

/**
 * Find cover art + synopsis for a book.
 * @param {{title: string, author?: string}} query
 * @returns {Promise<{coverUrl: string, description: string, subjects: string[], firstPublishYear: number|null, workKey: string|null, editionCount: number|null}>}
 */
async function enrich({ title, author } = {}) {
  const empty = {
    coverUrl: '',
    description: '',
    subjects: [],
    firstPublishYear: null,
    workKey: null,
    editionCount: null,
  };

  const titles = titleKeys(title);
  const authors = new Set(authorKeys(author));
  if (!titles.length || !authors.size) return empty;

  try {
    const params = new URLSearchParams({ title, limit: '5', fields: SEARCH_FIELDS });
    params.set('author', author.split(',')[0].replace(/\([^()]*\)/g, ' ').replace(/\s+/g, ' ').trim());

    const payload = await fetchJson(`${SEARCH_BASE}?${params.toString()}`, {
      timeout: TIMEOUT_MS,
      retries: 1,
    });

    // Keep only candidates whose author and title both match the requested book.
    const matches = (Array.isArray(payload.docs) ? payload.docs : []).flatMap(candidate => {
      if (!candidate || !Array.isArray(candidate.author_name) ||
          !candidate.author_name.some(name => authorKeys(name).some(key => authors.has(key)))) return [];
      const candidateTitles = titleKeys(candidate.title);
      if (!candidateTitles.some(key => titles.includes(key))) return [];
      return [{ doc: candidate, coverUrl: buildCoverUrl(candidate), exactTitle: candidateTitles[0] === titles[0] }];
    });
    // A cover-bearing search hit is useful only after both title and author
    // match. Rank exact titles before subtitle matches; Gutenberg supplies the
    // artwork when no matching work has an identifiable cover.
    const exactMatches = matches.filter(candidate => candidate.exactTitle);
    const eligible = exactMatches.length ? exactMatches : matches;
    const match = eligible.find(candidate => candidate.coverUrl) || eligible[0];
    if (!match) return empty;
    const { doc, coverUrl } = match;

    const description =
      readableDescription(doc.first_sentence && doc.first_sentence.value) ||
      (await fetchWorkDescription(doc.key));

    return {
      coverUrl,
      description,
      subjects: (doc.subject || []).slice(0, 24),
      firstPublishYear: doc.first_publish_year || null,
      workKey: doc.key || null,
      editionCount: doc.edition_count || null,
    };
  } catch (error) {
    console.warn(`[openLibrary] enrichment failed for "${title}": ${error.message}`);
    return empty;
  }
}

/**
 * Honest fallback blurb built only from data we actually have — no invented
 * plot summary.
 */
function buildFallbackDescription({ title, author, subjects = [], firstPublishYear }) {
  const subjectLine = subjects.length
    ? `Subjects: ${subjects.slice(0, 5).join(', ')}.`
    : 'A public domain classic.';
  const yearLine = firstPublishYear ? ` First published in ${firstPublishYear}.` : '';
  return `${title} by ${author}.${yearLine} ${subjectLine} Digitised by Project Gutenberg and made freely available for reading.`;
}

module.exports = { enrich, buildFallbackDescription, readableDescription };
