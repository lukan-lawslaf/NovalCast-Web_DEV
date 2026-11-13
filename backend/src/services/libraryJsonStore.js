'use strict';

// Validate private library records and persist them as revisioned JSON files outside the public site.

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const queues = new Map();
const MAX_BYTES = 1024 * 1024;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = message => Object.assign(new Error(message), { status: 400 });
const unavailable = () => Object.assign(new Error('Your library file is unavailable. Your existing data has not been replaced.'), { status: 503 });

// Allowlisted fields keep passwords, tokens and arbitrary extra data out of library records.
function keys(value, allowed, name) {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))) throw invalid(`Invalid ${name} fields.`);
}

function text(value, max, name) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw invalid(`Invalid ${name}.`);
  return value;
}

function integer(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw invalid(`Invalid ${name}.`);
  return value;
}

function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(value) || ['__proto__', 'constructor', 'prototype'].includes(value)) throw invalid('Invalid book identifier.');
  return value;
}

function boundedArray(value, max, name, normalize) {
  if (!Array.isArray(value) || value.length > max) throw invalid(`Invalid ${name}.`);
  return value.map(normalize);
}

function bookmark(value) {
  if (Number.isSafeInteger(value)) return integer(value, 0, 1000000, 'bookmark');
  keys(value, ['chapter', 'page', 'label'], 'bookmark');
  return {
    chapter: integer(value.chapter, 1, 100000, 'bookmark chapter'),
    page: integer(value.page, 0, 1000000, 'bookmark page'),
    ...(value.label === undefined ? {} : { label: text(value.label, 160, 'bookmark label') }),
  };
}

// Normalize the saved/favorite/page information for a single book.
function libraryEntry(value) {
  keys(value, ['status', 'favorite', 'chapter', 'page', 'bookmarks'], 'library entry');
  const status = value.status ?? null;
  if (![null, 'saved', 'reading', 'completed'].includes(status)) throw invalid('Invalid library status.');
  if (value.favorite !== undefined && typeof value.favorite !== 'boolean') throw invalid('Invalid favorite value.');
  return {
    status,
    favorite: value.favorite ?? false,
    chapter: integer(value.chapter ?? 1, 1, 100000, 'chapter'),
    page: integer(value.page ?? 0, 0, 1000000, 'page'),
    bookmarks: boundedArray(value.bookmarks ?? [], 200, 'bookmarks', bookmark),
  };
}

function collection(value) {
  if (typeof value === 'string') return text(value, 80, 'collection name');
  keys(value, ['id', 'name', 'bookIds'], 'collection');
  return { id: identifier(value.id), name: text(value.name, 80, 'collection name'), bookIds: boundedArray(value.bookIds ?? [], 500, 'collection books', identifier) };
}

const UPLOAD_STRINGS = { slug: 160, title: 300, author: 200, format: 12, size: 40, genre: 80, uploadedAt: 40, lastRead: 80, listens: 40, duration: 80, narrator: 160, description: 6000, shortDescription: 1000, accent: 30, cover: 1500, coverUrl: 1500 };

// Store manuscript metadata only; the original EPUB/PDF/text file is not part of this document.
function upload(value) {
  keys(value, ['id', ...Object.keys(UPLOAD_STRINGS), 'progress', 'chapters', 'rating', 'reviews', 'chaptersList'], 'upload');
  const result = { id: identifier(value.id), title: text(value.title, 300, 'book title') };
  if (!result.title.trim()) throw invalid('A book title is required.');
  for (const [key, max] of Object.entries(UPLOAD_STRINGS)) {
    if (value[key] !== undefined) result[key] = text(value[key], max, `upload ${key}`);
  }
  for (const key of ['cover', 'coverUrl']) {
    if (!result[key]) continue;
    let url;
    try { url = new URL(result[key]); } catch { throw invalid('Invalid book cover URL.'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw invalid('Invalid book cover URL.');
  }
  if (value.progress !== undefined) result.progress = integer(value.progress, 0, 100, 'upload progress');
  if (value.chapters !== undefined) result.chapters = integer(value.chapters, 0, 100000, 'chapter count');
  if (value.reviews !== undefined) result.reviews = integer(value.reviews, 0, 100000000, 'review count');
  if (value.rating !== undefined) {
    if (typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 5) throw invalid('Invalid book rating.');
    result.rating = value.rating;
  }
  if (value.chaptersList !== undefined) result.chaptersList = boundedArray(value.chaptersList, 2000, 'chapter list', chapter => {
    keys(chapter, ['title', 'theme', 'chapterNumber', 'wordCount'], 'chapter summary');
    return {
      title: text(chapter.title, 300, 'chapter title'),
      ...(chapter.theme === undefined ? {} : { theme: text(chapter.theme, 300, 'chapter theme') }),
      chapterNumber: integer(chapter.chapterNumber, 1, 100000, 'chapter number'),
      wordCount: integer(chapter.wordCount ?? 0, 0, 10000000, 'word count'),
    };
  });
  return result;
}

function settings(value) {
  keys(value, ['font', 'fontSize', 'palette', 'lineSpacing', 'focus', 'layout'], 'settings');
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'fontSize') result[key] = integer(item, 13, 26, 'font size');
    else result[key] = text(item, 40, key);
  }
  return result;
}

// Validate the entire request, fill optional defaults, and bound collections and file size.
function normalizeDocument(value) {
  keys(value, ['schemaVersion', 'revision', 'state', 'uploads', 'settings', 'readingPlan'], 'library document');
  if (value.schemaVersion !== undefined && value.schemaVersion !== 1) throw invalid('Unsupported library file version.');
  const revision = integer(value.revision, 0, Number.MAX_SAFE_INTEGER, 'library revision');
  const state = value.state ?? { library: {}, collections: [] };
  keys(state, ['library', 'collections'], 'library state');
  const inputLibrary = state.library ?? {};
  if (!record(inputLibrary) || Object.keys(inputLibrary).length > 1000) throw invalid('Invalid library books.');
  const library = {};
  for (const [id, entry] of Object.entries(inputLibrary)) library[identifier(id)] = libraryEntry(entry);
  const uploads = boundedArray(value.uploads ?? [], 500, 'uploads', upload);
  if (new Set(uploads.map(book => book.id)).size !== uploads.length) throw invalid('Duplicate uploaded book identifiers.');
  const plan = value.readingPlan ?? { dailyMinutes: 20, favoriteGenre: '' };
  keys(plan, ['dailyMinutes', 'favoriteGenre'], 'reading plan');
  const result = {
    schemaVersion: 1,
    revision,
    state: { library, collections: boundedArray(state.collections ?? [], 100, 'collections', collection) },
    uploads,
    settings: settings(value.settings ?? {}),
    readingPlan: { dailyMinutes: integer(plan.dailyMinutes ?? 20, 5, 240, 'daily reading minutes'), favoriteGenre: text(plan.favoriteGenre ?? '', 80, 'favorite genre') },
  };
  // Bound the actual on-disk representation so every successfully saved file can be read again.
  if (Buffer.byteLength(JSON.stringify(result, null, 2) + '\n') > MAX_BYTES) throw invalid('Your library file is too large.');
  return result;
}

function emptyDocument() {
  return normalizeDocument({ revision: 0 });
}

// Each store uses one directory; the shared queue coordinates writes within this Node process.
function createLibraryJsonStore({ directory = path.resolve(__dirname, '../../data/libraries') } = {}) {
  const root = path.resolve(directory);

  // Hash the verified ID so account text cannot become a path or reveal the ID in a filename.
  function filename(userId) {
    if (typeof userId !== 'string' || !userId || userId.length > 256) throw invalid('Invalid account identity.');
    return path.join(root, createHash('sha256').update(userId).digest('hex') + '.json');
  }

  // A first visit gets defaults; a damaged existing file is reported, never silently reset.
  async function read(userId) {
    const target = filename(userId);
    try {
      const raw = await fs.readFile(target, 'utf8');
      if (Buffer.byteLength(raw) > MAX_BYTES) throw unavailable();
      return normalizeDocument(JSON.parse(raw));
    } catch (error) {
      if (error.code === 'ENOENT') return emptyDocument();
      throw unavailable();
    }
  }

  // Serialize this account's saves, then compare revisions to stop stale clients overwriting newer data.
  async function save(userId, value) {
    const document = normalizeDocument(value);
    const target = filename(userId);
    const previous = queues.get(target) || Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
      const current = await read(userId);
      if (current.revision !== document.revision) {
        throw Object.assign(new Error('Your library changed elsewhere. Refresh and merge before saving.'), { status: 409, document: current });
      }
      if (current.revision === Number.MAX_SAFE_INTEGER) throw unavailable();
      const next = { ...document, revision: current.revision + 1 };
      const temporary = target + '.' + randomUUID() + '.tmp';
      try {
        await fs.mkdir(root, { recursive: true, mode: 0o700 });
        const handle = await fs.open(temporary, 'wx', 0o600);
        try {
          await handle.writeFile(JSON.stringify(next, null, 2) + '\n', 'utf8');
          await handle.sync();
        } finally {
          await handle.close();
        }
        // Replace only after the temporary file is fully written and flushed.
        await fs.rename(temporary, target);
        return next;
      } catch {
        throw unavailable();
      } finally {
        await fs.unlink(temporary).catch(() => {});
      }
    });
    queues.set(target, pending);
    try { return await pending; }
    finally { if (queues.get(target) === pending) queues.delete(target); }
  }

  return { read, save };
}

module.exports = { createLibraryJsonStore, normalizeDocument, emptyDocument };
