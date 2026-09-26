'use strict';

/**
 * Ingestion pipeline.
 *
 *   metadata -> text download -> clean -> chapter parse -> upsert -> chapters
 *
 * Kept out of the routes so the HTTP layer stays thin and the same pipeline
 * backs both POST /api/ingest and the `npm run seed` CLI.
 */

const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const gutendexService = require('./gutendexService');
const openLibraryService = require('./openLibraryService');
const { cleanGutenbergText } = require('./textCleaner');
const { parseChapters } = require('./chapterParser');

/** The curated shelf seeded by `npm run seed` and POST /api/ingest/curated. */
const CURATED_BOOKS = [
  // Adventure, Sea & Travel
  { gutendexId: 2701, slug: 'moby-dick', featured: true },
  { gutendexId: 103, slug: 'around-the-world-in-eighty-days', featured: true },
  { gutendexId: 120, slug: 'treasure-island', featured: false },

  // Science Fiction & Speculative
  { gutendexId: 36, slug: 'the-war-of-the-worlds', featured: true },
  { gutendexId: 164, slug: 'twenty-thousand-leagues-under-the-sea', featured: false },

  // Mystery & Suspense — Gutenberg has no standalone "The Murders in the Rue
  // Morgue"; 2147 is the Poe volume containing it alongside the other two
  // Dupin detective stories, so it fills this genre slot under its real title.
  { gutendexId: 2852, slug: 'the-hound-of-the-baskervilles', featured: true },
  { gutendexId: 2147, slug: 'the-works-of-edgar-allan-poe-volume-1', featured: false },

  // Romance & Drama
  { gutendexId: 1260, slug: 'jane-eyre', featured: true },
  { gutendexId: 768, slug: 'wuthering-heights', featured: true },

  // Literary Fiction & Psychological
  { gutendexId: 64317, slug: 'the-great-gatsby', featured: true },
  { gutendexId: 5200, slug: 'the-metamorphosis', featured: false },
  { gutendexId: 98, slug: 'a-tale-of-two-cities', featured: true },

  // Gothic & Horror
  { gutendexId: 84, slug: 'frankenstein', featured: true },
  { gutendexId: 345, slug: 'dracula', featured: true },
  { gutendexId: 43, slug: 'dr-jekyll-and-mr-hyde', featured: false },

  // Classic Detective
  { gutendexId: 1661, slug: 'the-adventures-of-sherlock-holmes', featured: true },

  // Classic Romance & Society
  { gutendexId: 1342, slug: 'pride-and-prejudice', featured: true },
  { gutendexId: 174, slug: 'the-picture-of-dorian-gray', featured: true },

  // Children's & Fantasy
  { gutendexId: 11, slug: 'alices-adventures-in-wonderland', featured: true },

  // Early Science Fiction
  { gutendexId: 35, slug: 'the-time-machine', featured: false },
];

/** Strip subtitles so "Frankenstein; or, the modern prometheus" -> "frankenstein". */
function primaryTitle(title) {
  const cut = String(title || '').split(/;|\s:\s|\s\/\s/)[0];
  return (cut || title || '').trim();
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildSlug(title, gutendexId, override) {
  const base = slugify(override || primaryTitle(title)) || `book-${gutendexId}`;
  return base;
}

/** Fetch metadata for either a Gutendex id or a title search. */
async function resolveSource({ gutendexId, search }) {
  if (gutendexId) return gutendexService.getBookById(gutendexId);
  if (search) return gutendexService.resolveBySearch(search);

  const error = new Error('Provide either "gutendexId" or "search" in the request body.');
  error.status = 400;
  throw error;
}

/**
 * Keep the unique slug index happy when two different books share a title.
 */
async function resolveSlug(slug, gutendexId) {
  const clash = await Book.findOne({ slug }).select('gutendexId').lean();
  if (!clash) return slug;
  if (clash.gutendexId === gutendexId) return slug;
  return `${slug}-${gutendexId}`;
}

/**
 * Ingest one book end to end.
 * @param {{gutendexId?: number|string, search?: string, slug?: string, featured?: boolean}} input
 */
async function ingestBook(input = {}) {
  const startedAt = Date.now();

  // 1. Metadata
  const source = await resolveSource(input);
  console.log(`[ingest] ${source.title} — ${source.author} (source: ${source.source})`);

  // 2. Full text
  const rawText = await gutendexService.downloadBookText(source);
  console.log(`[ingest] Downloaded ${(rawText.length / 1024).toFixed(0)} KB of raw text.`);

  // 3. Clean
  const { text, wordCount } = cleanGutenbergText(rawText);

  // 4. Chapters
  const chapters = parseChapters(text);
  if (!chapters.length) {
    throw new Error(`Chapter parsing produced no chapters for "${source.title}"`);
  }

  // 5. Cover art + synopsis
  const enrichment = await openLibraryService.enrich({
    title: primaryTitle(source.title),
    author: source.author,
  });

  const subjects = source.subjects.length ? source.subjects : enrichment.subjects;
  const description =
    enrichment.description ||
    openLibraryService.buildFallbackDescription({
      title: source.title,
      author: source.author,
      subjects,
      firstPublishYear: enrichment.firstPublishYear,
    });

  const slug = await resolveSlug(
    buildSlug(source.title, source.gutendexId, input.slug),
    source.gutendexId
  );

  const bookFields = {
    slug,
    gutendexId: source.gutendexId,
    title: source.title,
    author: source.author,
    subjects,
    languages: source.languages.length ? source.languages : ['en'],
    coverUrl: enrichment.coverUrl || source.coverUrl,
    description,
    downloadCount: source.downloadCount,
  };
  if (typeof input.featured === 'boolean') bookFields.featured = input.featured;

  // 6. Upsert the book, then swap its chapters.
  const book = await Book.findOneAndUpdate(
    { gutendexId: source.gutendexId },
    { $set: bookFields },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  await Chapter.deleteMany({ bookId: book._id });
  await Chapter.insertMany(
    chapters.map((chapter) => ({
      bookId: book._id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      order: chapter.order,
    })),
    { ordered: false }
  );

  const updated = await Book.findByIdAndUpdate(
    book._id,
    {
      $set: {
        totalChapters: chapters.length,
        totalWordCount: chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
      },
    },
    { returnDocument: 'after' }
  ).lean();

  const result = {
    book: updated,
    stats: {
      chapters: chapters.length,
      words: wordCount,
      source: source.source,
      coverFrom: enrichment.coverUrl ? 'openlibrary' : 'gutenberg',
      hasSynopsis: Boolean(enrichment.description),
      durationMs: Date.now() - startedAt,
    },
  };

  console.log(
    `[ingest] Saved "${updated.title}" as /api/books/${updated.slug}` +
      ` — ${chapters.length} chapters, ${updated.totalWordCount} words, ${result.stats.durationMs}ms.`
  );

  return result;
}

/**
 * Pause between books in a bulk run. Project Gutenberg drops connections when
 * twenty novels are pulled back to back, which surfaces as `fetch failed` or
 * `terminated` halfway through a seed.
 */
const POLITE_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ingest every curated title, sequentially — these are volunteer-run services
 * and there is no reason to hit them in parallel.
 */
async function ingestCurated({ books = CURATED_BOOKS, onProgress } = {}) {
  const results = [];
  const failures = [];

  for (const [index, entry] of books.entries()) {
    try {
      const result = await ingestBook(entry);
      results.push({ gutendexId: entry.gutendexId, ok: true, ...result });
    } catch (error) {
      console.error(`[ingest] FAILED gutenberg id ${entry.gutendexId}: ${error.message}`);
      failures.push({ gutendexId: entry.gutendexId, error: error.message });
    }
    if (onProgress) onProgress({ done: results.length + failures.length, total: books.length });
    if (index < books.length - 1) await sleep(POLITE_DELAY_MS);
  }

  return { results, failures };
}

module.exports = {
  ingestBook,
  ingestCurated,
  CURATED_BOOKS,
  slugify,
  primaryTitle,
};
