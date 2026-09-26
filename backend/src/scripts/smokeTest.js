#!/usr/bin/env node
'use strict';

/**
 * Smoke test.
 *
 * Boots the Express app in-process on an ephemeral port and exercises the
 * public API against the live Atlas data set. No extra test framework — this
 * is the "does the backend actually serve books" check.
 *
 * The catalog is verified book by book: every book must return a table of
 * contents whose length matches its stored chapter count, and a readable first
 * chapter. A book that ingests with zero chapters is a silent failure, and this
 * is what catches it.
 */

const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const app = require('../../index');

const checks = [];

function record(name, passed, detail) {
  checks.push({ name, passed, detail });
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  if (!env.MONGODB_URI) {
    console.error('[smoke] MONGODB_URI not found.');
    process.exit(1);
  }

  await connectDB(env.MONGODB_URI);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log(`[smoke] Testing ${base}\n`);

  const get = async (path) => {
    const response = await fetch(`${base}${path}`);
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  };

  // 1. Health
  const health = await get('/api/health');
  record(
    'GET /api/health',
    health.status === 200 && health.body.status === 'ok' && health.body.database === 'connected',
    `status=${health.status} database=${health.body && health.body.database}`
  );

  // 2. Catalog list
  const catalog = await get('/api/books?limit=5');
  const books = (catalog.body && catalog.body.books) || [];
  record(
    'GET /api/books?limit=5',
    catalog.status === 200 && Array.isArray(books),
    `${books.length} books, total=${catalog.body && catalog.body.pagination && catalog.body.pagination.total}`
  );
  record(
    'catalog payload excludes chapter text',
    books.every((book) => !('content' in book)),
    'no content field on book documents'
  );

  // 3. Search + sort
  const search = await get('/api/books?search=frankenstein');
  record(
    'GET /api/books?search=frankenstein',
    search.status === 200 && (search.body.books || []).length > 0,
    `${(search.body.books || []).length} match(es)`
  );

  const genre = await get('/api/books?genre=gothic');
  record('GET /api/books?genre=gothic', genre.status === 200, `${(genre.body.books || []).length} match(es)`);

  const sorted = await get('/api/books?sort=newest&limit=3');
  record('GET /api/books?sort=newest', sorted.status === 200, `status=${sorted.status}`);

  // 4. Every book: TOC length matches the stored count, first chapter reads
  const full = await get('/api/books?limit=100');
  const allBooks = (full.body && full.body.books) || [];
  console.log('');

  let catalogIntact = true;
  let totalChapters = 0;
  let totalWords = 0;

  for (const book of allBooks) {
    const detail = await get(`/api/books/${book.slug}`);
    const toc = (detail.body && detail.body.chapters) || [];
    const first = await get(`/api/books/${book.slug}/chapters/1`);
    const chapter = first.body && first.body.chapter;

    const ok =
      detail.status === 200 &&
      toc.length > 0 &&
      toc.length === book.totalChapters &&
      first.status === 200 &&
      Boolean(chapter) &&
      chapter.content.length > 500;

    if (!ok) catalogIntact = false;
    totalChapters += book.totalChapters || 0;
    totalWords += book.totalWordCount || 0;

    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${String(book.slug).padEnd(40)} ` +
        `${String(book.totalChapters).padStart(3)} ch  ${String(book.totalWordCount).padStart(8)} words  ` +
        `ch1 ${chapter ? `${chapter.wordCount}w` : 'MISSING'}`
    );
  }

  record(
    `catalog integrity (${allBooks.length} books)`,
    catalogIntact && allBooks.length > 0,
    `${allBooks.length} books, ${totalChapters} chapters, ${totalWords} words — every TOC matches and every first chapter reads`
  );

  // 5. Errors behave
  const missing = await get('/api/books/definitely-not-a-book-slug');
  record('404 on unknown slug', missing.status === 404, `status=${missing.status}`);

  const badChapter = await get(`/api/books/${allBooks[0] ? allBooks[0].slug : 'frankenstein'}/chapters/99999`);
  record('404 on unknown chapter', badChapter.status === 404, `status=${badChapter.status}`);

  const badRequest = await get('/api/books/frankenstein/chapters/abc');
  record('400 on non-numeric chapter', badRequest.status === 400, `status=${badRequest.status}`);

  server.close();
  await disconnectDB();

  const failed = checks.filter((check) => !check.passed);
  console.log(`\n[smoke] ${checks.length - failed.length}/${checks.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error('[smoke] Fatal:', error);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
