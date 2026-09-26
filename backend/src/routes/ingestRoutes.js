'use strict';

/**
 * Ingestion routes.
 *
 *   POST /api/ingest           — ingest one book by Gutendex id or title search
 *   POST /api/ingest/curated   — ingest the entire curated shelf
 *   GET  /api/ingest/curated   — inspect the curated shelf definition
 *
 * Ingesting pulls a full novel over the network and then writes every chapter,
 * so calls are serialised: a second concurrent request gets a 409 instead of
 * hammering Project Gutenberg.
 */

const express = require('express');

const { ingestBook, ingestCurated, CURATED_BOOKS } = require('../services/ingestService');

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

let ingestInFlight = null;

function acquireLock(label) {
  if (ingestInFlight) {
    const error = new Error(`An ingest is already running (${ingestInFlight}). Try again shortly.`);
    error.status = 409;
    throw error;
  }
  ingestInFlight = label;
}

function releaseLock() {
  ingestInFlight = null;
}

/** POST /api/ingest  { gutendexId: 84 }  or  { search: "The Picture of Dorian Gray" } */
router.post(
  '/ingest',
  asyncHandler(async (req, res) => {
    const { gutendexId, search, slug, featured } = req.body || {};

    if (!gutendexId && !search) {
      return res.status(400).json({ error: 'Provide "gutendexId" (number) or "search" (string).' });
    }
    if (gutendexId && Number.isNaN(Number(gutendexId))) {
      return res.status(400).json({ error: '"gutendexId" must be a number.' });
    }

    const label = gutendexId ? `id ${gutendexId}` : `search "${search}"`;
    acquireLock(label);

    try {
      const result = await ingestBook({
        gutendexId: gutendexId ? Number(gutendexId) : undefined,
        search: search ? String(search).trim() : undefined,
        slug: slug ? String(slug) : undefined,
        featured: typeof featured === 'boolean' ? featured : undefined,
      });

      res.status(201).json(result);
    } finally {
      releaseLock();
    }
  })
);

/** GET /api/ingest/curated — the shelf definition, no side effects. */
router.get('/ingest/curated', (req, res) => {
  res.json({ total: CURATED_BOOKS.length, books: CURATED_BOOKS, running: ingestInFlight });
});

/**
 * POST /api/ingest/curated — seed the whole shelf over HTTP.
 * This takes a few minutes; prefer `npm run seed` for the same job.
 */
router.post(
  '/ingest/curated',
  asyncHandler(async (req, res) => {
    const only = req.body && req.body.only ? new Set(req.body.only.map(Number)) : null;
    const books = only ? CURATED_BOOKS.filter((entry) => only.has(entry.gutendexId)) : CURATED_BOOKS;

    if (!books.length) {
      return res.status(400).json({ error: 'No curated books matched "only".' });
    }

    acquireLock(`curated (${books.length} books)`);

    try {
      const { results, failures } = await ingestCurated({ books });
      res.status(results.length ? 201 : 500).json({
        ingested: results.length,
        failed: failures.length,
        failures,
        books: results.map((result) => result.book),
      });
    } finally {
      releaseLock();
    }
  })
);

module.exports = router;
