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

function readableDescription(raw) {
  if (!raw) return '';
  const text = typeof raw === 'string' ? raw : raw.value || '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown links -> label
    .replace(/\s+/g, ' ')
    .trim();
}

/** The work endpoint carries the synopsis; search.json usually does not. */
async function fetchWorkDescription(workKey) {
  if (!workKey || !workKey.startsWith('/works/')) return '';
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

function buildCoverUrl(doc) {
  if (doc.cover_i) return `${COVERS_BASE}/id/${doc.cover_i}-L.jpg`;
  if (doc.cover_edition_key) return `${COVERS_BASE}/olid/${doc.cover_edition_key}-L.jpg`;
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

  if (!title) return empty;

  try {
    const params = new URLSearchParams({ title, limit: '5', fields: SEARCH_FIELDS });
    if (author) params.set('author', author.split(',')[0].trim());

    const payload = await fetchJson(`${SEARCH_BASE}?${params.toString()}`, {
      timeout: TIMEOUT_MS,
      retries: 1,
    });

    const docs = payload.docs || [];
    if (!docs.length) return empty;

    // Prefer an edition that actually has a cover.
    const doc = docs.find((candidate) => candidate.cover_i || candidate.cover_edition_key) || docs[0];

    const description =
      readableDescription(doc.first_sentence && doc.first_sentence.value) ||
      (await fetchWorkDescription(doc.key));

    return {
      coverUrl: buildCoverUrl(doc),
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
