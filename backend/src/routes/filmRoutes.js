'use strict';

const express = require('express');
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const { COLLECTION, isBookId, validatePublication, filmMetadata } = require('../films/publication');

async function atlasPublication(bookId) {
  if (mongoose.connection.readyState !== 1) throw Error('Film catalog storage is unavailable.');
  return mongoose.connection.db.collection(COLLECTION)
    .findOne({ _id: bookId, status: 'published' }, { maxTimeMS: 4000 });
}

function createFilmRouter({ directory = '', filmsOnly = false, findPublication = atlasPublication } = {}) {
  const local = directory ? path.resolve(directory) : '';
  const router = express.Router();
  async function lookup(bookId) {
    if (!isBookId(bookId)) return null;
    let record;
    if (local) {
      try {
        record = JSON.parse(await fs.readFile(path.join(local, bookId, 'published.json'), 'utf8'));
      } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    } else {
      record = await findPublication(bookId);
    }
    if (!record || record.status !== 'published' || (!local && record.storage === 'local')) return null;
    return validatePublication(record, bookId);
  }
  const unavailable = res => res.set('Cache-Control', 'no-store').status(503).json({ error: 'The film catalog is temporarily unavailable.' });
  const missing = res => res.set('Cache-Control', 'no-store').status(404).json({ error: 'This film is awaiting release.' });

  router.get('/', (_req, res) => res.set('Cache-Control', 'no-store').json({ filmsOnly }));
  router.get('/:bookId', async (req, res) => {
    try {
      const record = await lookup(req.params.bookId);
      if (!record) return missing(res);
      res.set('Cache-Control', 'public, max-age=60').json(filmMetadata(record));
    } catch { unavailable(res); }
  });

  function serve(name, type) {
    return async (req, res, next) => {
      if (!local || !/^[a-f0-9]{64}$/.test(req.params.revision)) return missing(res);
      try {
        const record = await lookup(req.params.bookId);
        if (!record || record.storage !== 'local' || record.revision !== req.params.revision) return missing(res);
        const file = path.join(local, record._id, record.revision, name);
        const info = await fs.lstat(file);
        if (!info.isFile() || !info.size || (name === 'video.mp4' && info.size !== record.bytes)) return unavailable(res);
        res.type(type).set('X-Content-Type-Options', 'nosniff');
        res.sendFile(file, { maxAge: '1d', immutable: true }, error => {
          if (error) {
            if (res.headersSent) next(error);
            else if (error.status === 416) res.status(416).end();
            else unavailable(res);
          }
        });
      } catch { unavailable(res); }
    };
  }
  router.get('/:bookId/:revision/video', serve('video.mp4', 'video/mp4'));
  router.get('/:bookId/:revision/captions', serve('captions.vtt', 'text/vtt'));
  return router;
}

module.exports = { createFilmRouter };
