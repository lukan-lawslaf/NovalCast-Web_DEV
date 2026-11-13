'use strict';

// Operator-only import routes validate requests before the ingestion service changes Atlas.

const express = require('express');
const { createHash, timingSafeEqual } = require('node:crypto');
const env = require('../config/env');
const { connectionState } = require('../config/db');
const { ingestBook, ingestCurated, CURATED_BOOKS } = require('../services/ingestService');

const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 512;
const MAX_SEARCH_LENGTH = 160;
const MAX_SLUG_LENGTH = 80;

const digest = (token) => createHash('sha256').update(token, 'utf8').digest();
const isBookId = (value) => Number.isSafeInteger(value) && value > 0;
const isBoundedText = (value, max) => typeof value === 'string' && value.length <= max && Boolean(value.trim());
const isObjectBody = (value) => value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value));

function createIngestRouter({
  adminToken = env.INGEST_ADMIN_TOKEN,
  ingestOne = ingestBook,
  ingestShelf = ingestCurated,
  storageReady = () => connectionState() === 'connected',
} = {}) {
  const router = express.Router();
  const parseBody = express.json({ limit: '8kb' });
  const configured = typeof adminToken === 'string' && adminToken.length >= MIN_TOKEN_LENGTH &&
    adminToken.length <= MAX_TOKEN_LENGTH && !/\s/.test(adminToken);
  const expectedDigest = configured ? digest(adminToken) : null;
  let running = false;

  // Compare fixed-size token hashes before parsing a potentially untrusted request body.
  function requireAdmin(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!expectedDigest) {
      return res.status(503).json({ error: 'HTTP catalog ingestion is disabled.' });
    }
    const token = /^Bearer (\S{1,512})$/i.exec(req.get('Authorization') || '')?.[1];
    if (!token || !timingSafeEqual(digest(token), expectedDigest)) {
      res.set('WWW-Authenticate', 'Bearer realm="NovelCast ingestion"');
      return res.status(401).json({ error: 'An ingestion operator token is required.' });
    }
    next();
  }

  // One import runs at a time, and the lock is released even when that import fails.
  async function runIngestion(res, run) {
    if (running) return res.status(409).json({ error: 'A catalog import is already running. Try again shortly.' });
    if (!storageReady()) return res.status(503).json({ error: 'Catalog storage is temporarily unavailable.' });
    running = true;
    try {
      return await run();
    } finally {
      running = false;
    }
  }

  /** POST /api/ingest — import one book by exact Gutendex ID or title search. */
  router.post('/ingest', requireAdmin, parseBody, async (req, res) => {
    if (!isObjectBody(req.body)) return res.status(400).json({ error: 'Provide a JSON object.' });
    const { gutendexId, search, slug, featured } = req.body || {};
    const hasId = gutendexId !== undefined;
    const hasSearch = search !== undefined;
    if (hasId === hasSearch || (hasId && !isBookId(gutendexId)) || (hasSearch && !isBoundedText(search, MAX_SEARCH_LENGTH))) {
      return res.status(400).json({ error: 'Provide either a positive integer gutendexId or a search of at most 160 characters.' });
    }
    if (slug !== undefined && !isBoundedText(slug, MAX_SLUG_LENGTH)) {
      return res.status(400).json({ error: 'A custom slug must be a nonempty string of at most 80 characters.' });
    }
    if (featured !== undefined && typeof featured !== 'boolean') {
      return res.status(400).json({ error: 'Featured must be true or false.' });
    }

    return runIngestion(res, async () => {
      const result = await ingestOne({ gutendexId, search: search?.trim(), slug: slug?.trim(), featured });
      res.status(201).json(result);
    });
  });

  /** GET /api/ingest/curated — public read-only shelf definition. */
  router.get('/ingest/curated', (req, res) => {
    res.json({ total: CURATED_BOOKS.length, books: CURATED_BOOKS, running });
  });

  /** POST /api/ingest/curated — import all titles or an exact subset. */
  router.post('/ingest/curated', requireAdmin, parseBody, async (req, res) => {
    if (!isObjectBody(req.body)) return res.status(400).json({ error: 'Provide a JSON object.' });
    const { only } = req.body || {};
    let books = CURATED_BOOKS;
    if (only !== undefined) {
      if (!Array.isArray(only) || !only.length || only.length > CURATED_BOOKS.length || !only.every(isBookId)) {
        return res.status(400).json({ error: 'Only must be a nonempty array of curated Gutendex IDs.' });
      }
      const ids = new Set(only);
      books = CURATED_BOOKS.filter((entry) => ids.has(entry.gutendexId));
      if (books.length !== ids.size) return res.status(400).json({ error: 'Only contains an unknown curated Gutendex ID.' });
    }

    return runIngestion(res, async () => {
      const { results, failures } = await ingestShelf({ books });
      res.status(results.length ? 201 : 502).json({
        ingested: results.length,
        failed: failures.length,
        failures: failures.map(({ gutendexId }) => ({ gutendexId, error: 'The book could not be imported.' })),
        books: results.map((result) => result.book),
      });
    });
  });

  return router;
}

module.exports = createIngestRouter();
module.exports.createIngestRouter = createIngestRouter;
