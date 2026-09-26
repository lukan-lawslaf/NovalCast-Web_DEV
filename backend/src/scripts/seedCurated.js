#!/usr/bin/env node
'use strict';

/**
 * Curated seed CLI.
 *
 *   npm run seed                 # ingest the 8 classics listed below
 *   npm run seed -- --only=84,11 # ingest a subset by Gutendex id or slug
 *
 * Re-running is safe: books are upserted by gutendexId and chapters are
 * replaced, so the script is idempotent.
 */

const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const { ingestCurated, CURATED_BOOKS } = require('../services/ingestService');

function parseArgs(argv) {
  const args = { only: null };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'only' && value) {
      args.only = new Set(value.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean));
    }
  }
  return args;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!env.MONGODB_URI) {
    console.error('[seed] MONGODB_URI not found. Set it in atlas-credentials.env or .env.');
    process.exit(1);
  }

  const shelf = args.only
    ? CURATED_BOOKS.filter(
        (entry) => args.only.has(String(entry.gutendexId)) || args.only.has(entry.slug)
      )
    : CURATED_BOOKS;

  if (!shelf.length) {
    console.error('[seed] No curated books matched --only.');
    process.exit(1);
  }

  console.log(`[seed] Connecting to MongoDB Atlas (source: ${env.MONGODB_SOURCE})...`);
  await connectDB(env.MONGODB_URI);
  console.log(`[seed] Database: ${env.MONGODB_DB_NAME}`);
  console.log(`[seed] Ingesting ${shelf.length} curated titles.\n`);

  const startedAt = Date.now();
  const { results, failures } = await ingestCurated({
    books: shelf,
    onProgress: ({ done, total }) => console.log(`[seed] Progress ${done}/${total}\n`),
  });

  console.log('\n================ Seed summary ================');
  for (const result of results) {
    const { book, stats } = result;
    console.log(
      `  OK   ${book.slug.padEnd(34)} ${String(stats.chapters).padStart(3)} ch` +
        `  ${formatNumber(book.totalWordCount).padStart(9)} words  ${(stats.durationMs / 1000).toFixed(1)}s`
    );
  }
  for (const failure of failures) {
    console.log(`  FAIL id ${failure.gutendexId}: ${failure.error}`);
  }

  const [bookCount, chapterCount] = await Promise.all([
    Book.countDocuments({}),
    Chapter.countDocuments({}),
  ]);

  console.log('----------------------------------------------');
  console.log(`  Ingested this run : ${results.length}/${shelf.length}`);
  console.log(`  Failures          : ${failures.length}`);
  console.log(`  Elapsed           : ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`  Books in Atlas    : ${bookCount}`);
  console.log(`  Chapters in Atlas : ${chapterCount}`);
  console.log('==============================================\n');

  await disconnectDB();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error('[seed] Fatal:', error.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
