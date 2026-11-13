'use strict';

/**
 * Catalog routes — everything the reader needs to browse and read.
 *
 *   GET /api/books
 *   GET /api/books/:id                       (Mongo _id or slug)
 *   GET /api/books/:id/chapters/:chapterNum
 */

const express = require('express');

const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const { connectionState } = require('../config/db');
const { fetchText } = require('../utils/httpClient');
const { cleanGutenbergText } = require('../services/textCleaner');
const { parseChapters } = require('../services/chapterParser');

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORT_OPTIONS = {
  popular: { downloadCount: -1, title: 1 },
  newest: { createdAt: -1 },
  title: { title: 1 },
};

// One parsed edition and at most one active public download per curated book.
const gutenbergChaptersCache = new Map();
const gutenbergInFlight = new Map();
const gutenbergRetryAfter = new Map();

const ALICE_EDITION = {
  gutendexId: 11,
  title: "Alice's Adventures in Wonderland",
  author: 'Lewis Carroll',
  description: 'Alice follows a white rabbit down a rabbit hole and discovers Wonderland, a world of peculiar creatures and impossible rules.',
};
const WRONG_ALICE_COVER = /^https?:\/\/covers\.openlibrary\.org\/b\/(?:id\/1004242|olid\/OL9033273M)-[sml]\.jpg(?:[?#].*)?$/i;

const CURATED_CATALOG = [
  { slug: 'frankenstein', gutendexId: 84, title: 'Frankenstein; or, the modern prometheus', author: 'Mary Wollstonecraft Shelley', totalChapters: 28, subjects: ['Gothic Fiction', 'Science Fiction'], description: 'Victor Frankenstein creates a sapient creature in an unorthodox scientific experiment.' },
  { slug: 'dracula', gutendexId: 345, title: 'Dracula', author: 'Bram Stoker', totalChapters: 27, subjects: ['Gothic Horror', 'Vampires'], description: 'An 1897 Gothic horror novel by Bram Stoker introducing Count Dracula.' },
  { slug: 'pride-and-prejudice', gutendexId: 1342, title: 'Pride and Prejudice', author: 'Jane Austen', totalChapters: 61, subjects: ['Classic Romance', 'Society'], description: 'Follows the turbulent relationship between Elizabeth Bennet and Fitzwilliam Darcy.' },
  { slug: 'moby-dick', gutendexId: 2701, title: 'Moby Dick; Or, The Whale', author: 'Herman Melville', totalChapters: 136, subjects: ['Adventure', 'Sea Stories'], description: 'The sailor Ishmael narrates the obsessive quest of Ahab, captain of the whaling ship Pequod.' },
  { slug: 'around-the-world-in-eighty-days', gutendexId: 103, title: 'Around the World in Eighty Days', author: 'Jules Verne', totalChapters: 36, subjects: ['Adventure', 'Travel'], description: 'Phileas Fogg and his valet Passepartout attempt to circumnavigate the world in 80 days.' },
  { slug: 'the-war-of-the-worlds', gutendexId: 36, title: 'The War of the Worlds', author: 'H. G. Wells', totalChapters: 27, subjects: ['Science Fiction'], description: 'One of the earliest stories to detail a conflict between mankind and an extraterrestrial race.' },
  { slug: 'the-hound-of-the-baskervilles', gutendexId: 2852, title: 'The Hound of the Baskervilles', author: 'Arthur Conan Doyle', totalChapters: 15, subjects: ['Mystery & Suspense', 'Detective'], description: 'Sherlock Holmes and Dr. Watson investigate the legend of a supernatural hound on Dartmoor.' },
  { slug: 'the-adventures-of-sherlock-holmes', gutendexId: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', totalChapters: 12, subjects: ['Detective', 'Mystery'], description: 'Twelve classic short stories featuring the consulting detective Sherlock Holmes.' },
  { slug: 'the-great-gatsby', gutendexId: 64317, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', totalChapters: 9, subjects: ['Literary Fiction', 'Jazz Age'], description: 'Jay Gatsby’s obsessive love for the beautiful former debutante Daisy Buchanan.' },
  { slug: 'the-picture-of-dorian-gray', gutendexId: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', totalChapters: 20, subjects: ['Gothic & Decadence'], description: 'A handsome young man remains youthful while his portrait ages and reflects his moral decay.' },
  { slug: 'alices-adventures-in-wonderland', ...ALICE_EDITION, totalChapters: 12, subjects: ['Fantasy', 'Childrens'] },
  { slug: 'the-time-machine', gutendexId: 35, title: 'The Time Machine', author: 'H. G. Wells', totalChapters: 16, subjects: ['Science Fiction'], description: 'The Time Traveller journeys to the year AD 802,701, encountering the Eloi and Morlocks.' },
  { slug: 'jane-eyre', gutendexId: 1260, title: 'Jane Eyre', author: 'Charlotte Brontë', totalChapters: 39, subjects: ['Romance', 'Drama'], description: 'An autobiographical novel following the emotions and experiences of heroine Jane Eyre.' },
  { slug: 'wuthering-heights', gutendexId: 768, title: 'Wuthering Heights', author: 'Emily Brontë', totalChapters: 34, subjects: ['Gothic Romance', 'Drama'], description: 'The intense, almost demonic love between Heathcliff and Catherine Earnshaw.' },
  { slug: 'the-metamorphosis', gutendexId: 5200, title: 'The Metamorphosis', author: 'Franz Kafka', totalChapters: 3, subjects: ['Psychological Fiction'], description: 'Gregor Samsa wakes one morning transformed into a monstrous vermin.' },
  { slug: 'a-tale-of-two-cities', gutendexId: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens', totalChapters: 45, subjects: ['Historical Fiction'], description: 'Set in London and Paris before and during the French Revolution.' },
  { slug: 'treasure-island', gutendexId: 120, title: 'Treasure Island', author: 'Robert Louis Stevenson', totalChapters: 34, subjects: ['Adventure'], description: 'Jim Hawkins embarks on a voyage to find buried treasure, encountering Long John Silver.' },
  { slug: 'twenty-thousand-leagues-under-the-sea', gutendexId: 164, title: 'Twenty Thousand Leagues Under the Sea', author: 'Jules Verne', totalChapters: 47, subjects: ['Science Fiction', 'Adventure'], description: 'Captain Nemo commands the submarine Nautilus on an expedition across the ocean depths.' },
  { slug: 'the-works-of-edgar-allan-poe-volume-1', gutendexId: 2147, title: 'The Works of Edgar Allan Poe', author: 'Edgar Allan Poe', totalChapters: 5, subjects: ['Macabre', 'Mystery'], description: 'A collection of macabre and mystery masterpieces by Edgar Allan Poe.' },
  { slug: 'dr-jekyll-and-mr-hyde', gutendexId: 43, title: 'Dr Jekyll and Mr Hyde', author: 'Robert Louis Stevenson', totalChapters: 10, subjects: ['Gothic & Psychological'], description: 'The dual nature of man portrayed through the respectable Dr. Jekyll and brutal Mr. Hyde.' }
].map(book => ({ ...book, coverUrl: gutenbergCover(book.gutendexId) }));

const CURATED_BY_KEY = new Map(CURATED_CATALOG.flatMap(book => [
  [book.slug, book],
  [String(book.gutendexId), book],
]));

function gutenbergCover(id) {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

function normalizeCatalogBook(book) {
  if (book.gutendexId !== ALICE_EDITION.gutendexId) return book;
  // Legacy ingestion paired Gutenberg #11 with a different work about Alice.
  // Correct only the known bad values in responses, without rewriting Atlas.
  const title = !book.title || /^alice$/i.test(book.title.trim()) ? ALICE_EDITION.title : book.title;
  const author = !book.author || /^unknown(?: author)?$/i.test(book.author.trim()) ? ALICE_EDITION.author : book.author;
  const coverUrl = WRONG_ALICE_COVER.test(book.coverUrl || '') ? gutenbergCover(book.gutendexId) : book.coverUrl;
  const description = /^Alice by Unknown Author\./i.test(book.description || '') ? ALICE_EDITION.description : book.description;
  return { ...book, title, author, coverUrl, description };
}

// Validate URL input before building a database lookup or selecting a bundled book.
function normalizeBookId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,199}$/i.test(value) ? value.toLowerCase() : null;
}

function idQuery(key) {
  return /^[a-f0-9]{24}$/.test(key) ? { _id: key } : { slug: key };
}

function positiveInteger(value, fallback = null) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d{1,16}$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function boundedFilter(value, max) {
  if (value === undefined) return '';
  return typeof value === 'string' && value.length <= max ? value.trim() : null;
}

// The table of contents sends labels and counts, not full chapter text.
function toChapterSummary(chapter) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    wordCount: chapter.wordCount,
    order: chapter.order,
  };
}

function toCatalogPage(books, total, page, limit) {
  return {
    books: books.map(normalizeCatalogBook),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
  };
}

function bookLookupError(res, storageUnavailable) {
  return storageUnavailable
    ? res.status(503).json({ error: 'Book storage is temporarily unavailable.' })
    : res.status(404).json({ error: 'Book not found.' });
}

function chapterNotFound(res) {
  return res.status(404).json({ error: 'Chapter not found.' });
}

function chapterUnavailable(res) {
  return res.status(503).json({ error: 'The chapter text is temporarily unavailable.' });
}

function getBundledBook(key, storedBook) {
  // If Atlas provided the book, its Gutenberg ID is the identity that allows
  // borrowing the same public-domain edition, even after a slug change.
  return CURATED_BY_KEY.get(storedBook ? String(storedBook.gutendexId) : key);
}

// Fetch and parse only this book's exact public-domain edition when stored text is unavailable.
async function loadGutenbergChapters(book) {
  const id = book.gutendexId;
  const urls = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
  ];

  for (const url of urls) {
    try {
      const raw = await fetchText(url, { timeout: 8000, retries: 0 });
      if (typeof raw !== 'string' || raw.length <= 500 || /^\s*(?:<!doctype html|<html)/i.test(raw)) continue;
      const { text } = cleanGutenbergText(raw);
      const chapters = parseChapters(text);
      if (chapters.length) return chapters;
    } catch {
      // The alternate path can still provide this exact edition.
    }
  }
  return null;
}

// Reuse successful parses and share an in-progress download; failed downloads have a cooldown.
function fetchGutenbergChapters(book) {
  const key = book.gutendexId;
  if (gutenbergChaptersCache.has(key)) return Promise.resolve(gutenbergChaptersCache.get(key));
  if (Date.now() < (gutenbergRetryAfter.get(key) || 0)) return Promise.resolve(null);
  if (!gutenbergInFlight.has(key)) {
    const pending = loadGutenbergChapters(book).then(chapters => {
      if (chapters) {
        gutenbergChaptersCache.set(key, chapters);
        gutenbergRetryAfter.delete(key);
      } else {
        gutenbergRetryAfter.set(key, Date.now() + 60_000);
      }
      return chapters;
    }).finally(() => gutenbergInFlight.delete(key));
    gutenbergInFlight.set(key, pending);
  }
  return gutenbergInFlight.get(key);
}

/** GET /api/books?search=&genre=&page=&limit=&sort=popular|newest|title */
router.get('/books', asyncHandler(async (req, res) => {
  const search = boundedFilter(req.query.search, 160);
  const genre = boundedFilter(req.query.genre, 80);
  const sort = req.query.sort ?? 'popular';
  const page = positiveInteger(req.query.page, 1);
  const requestedLimit = positiveInteger(req.query.limit, 20);
  if (search === null || genre === null || typeof sort !== 'string' || !Object.hasOwn(SORT_OPTIONS, sort)) {
    return res.status(400).json({ error: 'Invalid catalog search, genre, or sort.' });
  }
  const limit = Math.min(100, requestedLimit);
  const offset = (page - 1) * limit;
  if (page === null || requestedLimit === null || offset > 10_000) {
    return res.status(400).json({ error: 'Invalid catalog pagination.' });
  }

  if (connectionState() === 'connected') {
    try {
      const filter = {};
      if (search) {
        const pattern = new RegExp(escapeRegExp(search), 'i');
        filter.$or = [{ title: pattern }, { author: pattern }, { subjects: pattern }, { slug: pattern }];
        if (pattern.test(ALICE_EDITION.title) || pattern.test(ALICE_EDITION.author)) {
          filter.$or.push({ gutendexId: ALICE_EDITION.gutendexId });
        }
      }
      if (genre) filter.subjects = new RegExp(escapeRegExp(genre), 'i');

      const [books, total] = await Promise.all([
        Book.find(filter).sort(SORT_OPTIONS[sort]).skip(offset).limit(limit).maxTimeMS(5000).lean(),
        Book.countDocuments(filter).maxTimeMS(5000),
      ]);
      if (total > 0 || search || genre) return res.json(toCatalogPage(books, total, page, limit));
    } catch {
      console.warn('[catalog] Could not read the Atlas catalog; using the bundled shelf.');
    }
  }

  const query = search.toLowerCase();
  const selectedGenre = genre.toLowerCase();
  const books = CURATED_CATALOG.filter(book =>
    (!query || [book.title, book.author, book.slug, ...book.subjects].some(value => value.toLowerCase().includes(query))) &&
    (!selectedGenre || book.subjects.some(value => value.toLowerCase().includes(selectedGenre)))
  );
  if (sort === 'title') books.sort((first, second) => first.title.localeCompare(second.title));
  res.json(toCatalogPage(books.slice(offset, offset + limit), books.length, page, limit));
}));

/** GET /api/books/:id — metadata plus the chapter table of contents. */
router.get('/books/:id', asyncHandler(async (req, res) => {
  const key = normalizeBookId(req.params.id);
  if (!key) return res.status(400).json({ error: 'Invalid book ID.' });

  let storedBook;
  let storageUnavailable = connectionState() !== 'connected';
  if (!storageUnavailable) {
    try {
      storedBook = await Book.findOne(idQuery(key)).maxTimeMS(5000).lean();
      if (storedBook) {
        const chapters = await Chapter.find({ bookId: storedBook._id }).sort({ order: 1 })
          .select('chapterNumber title wordCount order').maxTimeMS(5000).lean();
        if (chapters.length) return res.json({ book: normalizeCatalogBook(storedBook), chapters: chapters.map(toChapterSummary) });
      }
    } catch {
      storageUnavailable = true;
      console.warn('[catalog] Could not read the Atlas book or table of contents.');
    }
  }

  const bundledBook = getBundledBook(key, storedBook);
  if (!bundledBook) {
    if (storedBook && !storageUnavailable) return res.json({ book: normalizeCatalogBook(storedBook), chapters: [] });
    return bookLookupError(res, storageUnavailable);
  }
  const chapters = await fetchGutenbergChapters(bundledBook);
  const book = normalizeCatalogBook(storedBook || bundledBook);
  return res.json({
    book: chapters ? { ...book, totalChapters: chapters.length } : book,
    chapters: chapters ? chapters.map(toChapterSummary) : [],
  });
}));

/** GET /api/books/:id/chapters/:chapterNum — exact chapter text and navigation. */
router.get('/books/:id/chapters/:chapterNum', asyncHandler(async (req, res) => {
  const key = normalizeBookId(req.params.id);
  if (!key) return res.status(400).json({ error: 'Invalid book ID.' });
  const chapterNumber = positiveInteger(req.params.chapterNum);
  if (chapterNumber === null) return res.status(400).json({ error: 'chapterNum must be a positive integer.' });

  let storedBook;
  let storageUnavailable = connectionState() !== 'connected';
  if (!storageUnavailable) {
    try {
      storedBook = await Book.findOne(idQuery(key)).select('title slug author gutendexId totalChapters').maxTimeMS(5000).lean();
      if (storedBook) {
        const chapter = await Chapter.findOne({ bookId: storedBook._id, chapterNumber })
          .select('chapterNumber title content wordCount order').maxTimeMS(5000).lean();
        if (chapter) {
          return res.json({
            book: normalizeCatalogBook(storedBook),
            chapter,
            navigation: {
              previous: chapterNumber > 1 ? chapterNumber - 1 : null,
              next: chapterNumber < storedBook.totalChapters ? chapterNumber + 1 : null,
            },
          });
        }
        if (storedBook.totalChapters > 0 && chapterNumber > storedBook.totalChapters) return chapterNotFound(res);
      }
    } catch {
      storageUnavailable = true;
      console.warn('[catalog] Could not read the Atlas chapter.');
    }
  }

  const bundledBook = getBundledBook(key, storedBook);
  if (!bundledBook) {
    if (!storedBook) return bookLookupError(res, storageUnavailable);
    return storageUnavailable ? chapterUnavailable(res) : chapterNotFound(res);
  }

  const chapters = await fetchGutenbergChapters(bundledBook);
  if (!chapters) return chapterUnavailable(res);
  const index = chapters.findIndex(chapter => chapter.chapterNumber === chapterNumber);
  if (index < 0) return chapterNotFound(res);
  const book = normalizeCatalogBook(storedBook || bundledBook);
  return res.json({
    book: { title: book.title, slug: book.slug, author: book.author, totalChapters: chapters.length },
    chapter: chapters[index],
    navigation: {
      previous: chapters[index - 1]?.chapterNumber ?? null,
      next: chapters[index + 1]?.chapterNumber ?? null,
    },
  });
}));

module.exports = router;
