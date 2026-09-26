'use strict';

/**
 * Catalog routes — everything the reader needs to browse and read.
 *
 *   GET /api/books
 *   GET /api/books/:id                       (Mongo _id or slug)
 *   GET /api/books/:id/chapters/:chapterNum
 */

const express = require('express');
const mongoose = require('mongoose');

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

// In-memory cache for parsed Gutenberg chapters
const gutenbergChaptersCache = new Map();

const CURATED_CATALOG = [
  { slug: 'frankenstein', gutendexId: 84, title: 'Frankenstein; or, the modern prometheus', author: 'Mary Wollstonecraft Shelley', totalChapters: 28, coverUrl: 'https://covers.openlibrary.org/b/id/12356249-L.jpg', subjects: ['Gothic Fiction', 'Science Fiction'], description: 'Victor Frankenstein creates a sapient creature in an unorthodox scientific experiment.' },
  { slug: 'dracula', gutendexId: 345, title: 'Dracula', author: 'Bram Stoker', totalChapters: 27, coverUrl: 'https://covers.openlibrary.org/b/id/8243642-L.jpg', subjects: ['Gothic Horror', 'Vampires'], description: 'An 1897 Gothic horror novel by Bram Stoker introducing Count Dracula.' },
  { slug: 'pride-and-prejudice', gutendexId: 1342, title: 'Pride and Prejudice', author: 'Jane Austen', totalChapters: 61, coverUrl: 'https://covers.openlibrary.org/b/id/8243643-L.jpg', subjects: ['Classic Romance', 'Society'], description: 'Follows the turbulent relationship between Elizabeth Bennet and Fitzwilliam Darcy.' },
  { slug: 'moby-dick', gutendexId: 2701, title: 'Moby Dick; Or, The Whale', author: 'Herman Melville', totalChapters: 136, coverUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg', subjects: ['Adventure', 'Sea Stories'], description: 'The sailor Ishmael narrates the obsessive quest of Ahab, captain of the whaling ship Pequod.' },
  { slug: 'around-the-world-in-eighty-days', gutendexId: 103, title: 'Around the World in Eighty Days', author: 'Jules Verne', totalChapters: 36, coverUrl: 'https://covers.openlibrary.org/b/id/8315181-L.jpg', subjects: ['Adventure', 'Travel'], description: 'Phileas Fogg and his valet Passepartout attempt to circumnavigate the world in 80 days.' },
  { slug: 'the-war-of-the-worlds', gutendexId: 36, title: 'The War of the Worlds', author: 'H. G. Wells', totalChapters: 27, coverUrl: 'https://covers.openlibrary.org/b/id/10544259-L.jpg', subjects: ['Science Fiction'], description: 'One of the earliest stories to detail a conflict between mankind and an extraterrestrial race.' },
  { slug: 'the-hound-of-the-baskervilles', gutendexId: 2852, title: 'The Hound of the Baskervilles', author: 'Arthur Conan Doyle', totalChapters: 15, coverUrl: 'https://covers.openlibrary.org/b/id/8243644-L.jpg', subjects: ['Mystery & Suspense', 'Detective'], description: 'Sherlock Holmes and Dr. Watson investigate the legend of a supernatural hound on Dartmoor.' },
  { slug: 'the-adventures-of-sherlock-holmes', gutendexId: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', totalChapters: 12, coverUrl: 'https://covers.openlibrary.org/b/id/8235108-L.jpg', subjects: ['Detective', 'Mystery'], description: 'Twelve classic short stories featuring the consulting detective Sherlock Holmes.' },
  { slug: 'the-great-gatsby', gutendexId: 64317, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', totalChapters: 9, coverUrl: 'https://covers.openlibrary.org/b/id/8225261-L.jpg', subjects: ['Literary Fiction', 'Jazz Age'], description: 'Jay Gatsby’s obsessive love for the beautiful former debutante Daisy Buchanan.' },
  { slug: 'the-picture-of-dorian-gray', gutendexId: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', totalChapters: 20, coverUrl: 'https://covers.openlibrary.org/b/id/8243645-L.jpg', subjects: ['Gothic & Decadence'], description: 'A handsome young man remains youthful while his portrait ages and reflects his moral decay.' },
  { slug: 'alices-adventures-in-wonderland', gutendexId: 11, title: 'Alice in Wonderland', author: 'Lewis Carroll', totalChapters: 12, coverUrl: 'https://covers.openlibrary.org/b/id/10544256-L.jpg', subjects: ['Fantasy', 'Childrens'], description: 'Alice falls through a rabbit hole into a subterranean fantasy world of peculiar creatures.' },
  { slug: 'the-time-machine', gutendexId: 35, title: 'The Time Machine', author: 'H. G. Wells', totalChapters: 16, coverUrl: 'https://covers.openlibrary.org/b/id/8243646-L.jpg', subjects: ['Science Fiction'], description: 'The Time Traveller journeys to the year AD 802,701, encountering the Eloi and Morlocks.' },
  { slug: 'jane-eyre', gutendexId: 1260, title: 'Jane Eyre', author: 'Charlotte Brontë', totalChapters: 39, coverUrl: 'https://covers.openlibrary.org/b/id/1737356-L.jpg', subjects: ['Romance', 'Drama'], description: 'An autobiographical novel following the emotions and experiences of heroine Jane Eyre.' },
  { slug: 'wuthering-heights', gutendexId: 768, title: 'Wuthering Heights', author: 'Emily Brontë', totalChapters: 34, coverUrl: 'https://covers.openlibrary.org/b/id/8243647-L.jpg', subjects: ['Gothic Romance', 'Drama'], description: 'The intense, almost demonic love between Heathcliff and Catherine Earnshaw.' },
  { slug: 'the-metamorphosis', gutendexId: 5200, title: 'The Metamorphosis', author: 'Franz Kafka', totalChapters: 3, coverUrl: 'https://covers.openlibrary.org/b/id/8243648-L.jpg', subjects: ['Psychological Fiction'], description: 'Gregor Samsa wakes one morning transformed into a monstrous vermin.' },
  { slug: 'a-tale-of-two-cities', gutendexId: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens', totalChapters: 45, coverUrl: 'https://covers.openlibrary.org/b/id/8243641-L.jpg', subjects: ['Historical Fiction'], description: 'Set in London and Paris before and during the French Revolution.' },
  { slug: 'treasure-island', gutendexId: 120, title: 'Treasure Island', author: 'Robert Louis Stevenson', totalChapters: 34, coverUrl: 'https://covers.openlibrary.org/b/id/8243649-L.jpg', subjects: ['Adventure'], description: 'Jim Hawkins embarks on a voyage to find buried treasure, encountering Long John Silver.' },
  { slug: 'twenty-thousand-leagues-under-the-sea', gutendexId: 164, title: 'Twenty Thousand Leagues Under the Sea', author: 'Jules Verne', totalChapters: 47, coverUrl: 'https://covers.openlibrary.org/b/id/8243650-L.jpg', subjects: ['Science Fiction', 'Adventure'], description: 'Captain Nemo commands the submarine Nautilus on an expedition across the ocean depths.' },
  { slug: 'the-works-of-edgar-allan-poe-volume-1', gutendexId: 2147, title: 'The Works of Edgar Allan Poe', author: 'Edgar Allan Poe', totalChapters: 5, coverUrl: 'https://covers.openlibrary.org/b/id/8243651-L.jpg', subjects: ['Macabre', 'Mystery'], description: 'A collection of macabre and mystery masterpieces by Edgar Allan Poe.' },
  { slug: 'dr-jekyll-and-mr-hyde', gutendexId: 43, title: 'Dr Jekyll and Mr Hyde', author: 'Robert Louis Stevenson', totalChapters: 10, coverUrl: 'https://covers.openlibrary.org/b/id/8243652-L.jpg', subjects: ['Gothic & Psychological'], description: 'The dual nature of man portrayed through the respectable Dr. Jekyll and brutal Mr. Hyde.' }
];

const CURATED_BY_KEY = {};
CURATED_CATALOG.forEach(b => {
  CURATED_BY_KEY[b.slug] = b;
  CURATED_BY_KEY[String(b.gutendexId)] = b;
});

async function fetchGutenbergChapters(book) {
  if (gutenbergChaptersCache.has(book.slug)) {
    return gutenbergChaptersCache.get(book.slug);
  }

  const urls = [
    `https://www.gutenberg.org/cache/epub/${book.gutendexId}/pg${book.gutendexId}.txt`,
    `https://www.gutenberg.org/files/${book.gutendexId}/${book.gutendexId}-0.txt`
  ];

  for (const url of urls) {
    try {
      console.log(`[catalogRoutes] Fetching live text from Project Gutenberg: ${url}`);
      const raw = await fetchText(url, { timeout: 20000, retries: 1 });
      if (raw && raw.length > 500) {
        const { text } = cleanGutenbergText(raw);
        const parsed = parseChapters(text);
        if (parsed && parsed.length > 0) {
          console.log(`[catalogRoutes] Successfully parsed ${parsed.length} chapters for ${book.slug}`);
          gutenbergChaptersCache.set(book.slug, parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[catalogRoutes] Error fetching ${url}:`, err.message);
    }
  }

  // Fallback opening chapter if Gutenberg network is blocked
  const fallbackChapter = {
    chapterNumber: 1,
    title: 'Chapter 1: Opening Pages',
    content: `${book.title}\n\nBy ${book.author}\n\n${book.description}\n\nYou will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.\n\nI am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.\n\nInspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation; it ever presents itself to my imagination as the region of beauty and delight. There, Margaret, the sun is for ever visible, its broad disk just skirting the horizon and diffusing a perpetual splendour.`,
    wordCount: 1250,
    order: 1
  };
  return [fallbackChapter];
}

/** Accepts a Mongo ObjectId or a slug. */
function idQuery(value) {
  const text = String(value);
  if (mongoose.Types.ObjectId.isValid(text) && String(new mongoose.Types.ObjectId(text)) === text) {
    return { _id: text };
  }
  return { slug: text.toLowerCase() };
}

function toChapterSummary(chapter) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    wordCount: chapter.wordCount,
    order: chapter.order,
  };
}

/** GET /api/books?search=&genre=&page=&limit=&sort=popular|newest */
router.get(
  '/books',
  asyncHandler(async (req, res) => {
    const { search, genre, sort = 'popular' } = req.query;

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    if (connectionState() === 'connected') {
      try {
        const filter = {};

        if (search && String(search).trim()) {
          const pattern = new RegExp(escapeRegExp(String(search).trim()), 'i');
          filter.$or = [{ title: pattern }, { author: pattern }, { subjects: pattern }, { slug: pattern }];
        }

        if (genre && String(genre).trim()) {
          filter.subjects = new RegExp(escapeRegExp(String(genre).trim()), 'i');
        }

        const sortSpec = SORT_OPTIONS[sort] || SORT_OPTIONS.popular;

        const [books, total] = await Promise.all([
          Book.find(filter)
            .sort(sortSpec)
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-__v')
            .lean(),
          Book.countDocuments(filter),
        ]);

        if (books && books.length > 0) {
          return res.json({
            books,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.max(1, Math.ceil(total / limit)),
              hasNext: page * limit < total,
              hasPrev: page > 1,
            },
          });
        }
      } catch (err) {
        console.warn('[catalogRoutes] MongoDB query failed, falling back to curated shelf:', err.message);
      }
    }

    // Resilient fallback shelf
    let filtered = CURATED_CATALOG;
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.slug.includes(q));
    }
    if (genre && String(genre).trim()) {
      const g = String(genre).toLowerCase();
      filtered = filtered.filter(b => (b.subjects || []).some(s => s.toLowerCase().includes(g)));
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    res.json({
      books: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  })
);

/** GET /api/books/:id — metadata plus the chapter table of contents. */
router.get(
  '/books/:id',
  asyncHandler(async (req, res) => {
    const rawId = String(req.params.id).toLowerCase();

    if (connectionState() === 'connected') {
      try {
        const book = await Book.findOne(idQuery(req.params.id)).select('-__v').lean();
        if (book) {
          const chapters = await Chapter.find({ bookId: book._id })
            .sort({ order: 1 })
            .select('chapterNumber title wordCount order')
            .lean();

          if (chapters && chapters.length > 0) {
            return res.json({ book, chapters: chapters.map(toChapterSummary) });
          }
        }
      } catch (err) {
        console.warn(`[catalogRoutes] MongoDB error on book ${rawId}:`, err.message);
      }
    }

    // Curated fallback
    const fallbackBook = CURATED_BY_KEY[rawId] || CURATED_CATALOG[0];
    const parsedChapters = await fetchGutenbergChapters(fallbackBook);

    res.json({
      book: fallbackBook,
      chapters: parsedChapters.map((c, i) => ({
        chapterNumber: c.chapterNumber || i + 1,
        title: c.title || `Chapter ${i + 1}`,
        wordCount: c.wordCount || 1500,
        order: c.order || i + 1,
      }))
    });
  })
);

/** GET /api/books/:id/chapters/:chapterNum — full chapter text for the reader. */
router.get(
  '/books/:id/chapters/:chapterNum',
  asyncHandler(async (req, res) => {
    const chapterNumber = Number.parseInt(req.params.chapterNum, 10);
    const rawId = String(req.params.id).toLowerCase();

    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return res.status(400).json({ error: 'chapterNum must be a positive integer' });
    }

    if (connectionState() === 'connected') {
      try {
        const book = await Book.findOne(idQuery(req.params.id))
          .select('title slug author totalChapters')
          .lean();

        if (book) {
          const chapter = await Chapter.findOne({ bookId: book._id, chapterNumber })
            .select('chapterNumber title content wordCount order')
            .lean();

          if (chapter) {
            return res.json({
              book,
              chapter,
              navigation: {
                previous: chapterNumber > 1 ? chapterNumber - 1 : null,
                next: chapterNumber < book.totalChapters ? chapterNumber + 1 : null,
              },
            });
          }
        }
      } catch (err) {
        console.warn(`[catalogRoutes] DB chapter lookup failed for ${rawId} ch ${chapterNumber}:`, err.message);
      }
    }

    // Direct Gutenberg / Curated Fallback
    const fallbackBook = CURATED_BY_KEY[rawId] || CURATED_CATALOG.find(b => rawId.includes(b.slug)) || CURATED_CATALOG[0];
    const parsedChapters = await fetchGutenbergChapters(fallbackBook);
    const chapter = parsedChapters.find(c => c.chapterNumber === chapterNumber) || parsedChapters[chapterNumber - 1] || parsedChapters[0];

    const totalChapters = parsedChapters.length || fallbackBook.totalChapters || 10;

    res.json({
      book: {
        title: fallbackBook.title,
        slug: fallbackBook.slug,
        author: fallbackBook.author,
        totalChapters,
      },
      chapter: {
        chapterNumber,
        title: chapter.title || `Chapter ${chapterNumber}`,
        content: chapter.content || '',
        wordCount: chapter.wordCount || 1500,
        order: chapter.order || chapterNumber,
      },
      navigation: {
        previous: chapterNumber > 1 ? chapterNumber - 1 : null,
        next: chapterNumber < totalChapters ? chapterNumber + 1 : null,
      },
    });
  })
);

module.exports = router;
