'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('../backend/node_modules/express');
const mongoose = require('../backend/node_modules/mongoose');
const backend = require('../backend/index');
const { createIngestRouter } = require('../backend/src/routes/ingestRoutes');
const Book = require('../backend/src/models/Book');
const Chapter = require('../backend/src/models/Chapter');

const localFetch = global.fetch;

async function open(t, app) {
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections?.();
  }));
  return (path, options) => localFetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}

test('catalog outages never substitute unrelated books, chapters, or synthetic text', async (t) => {
  const sources = [];
  const first = 'The harbor passage introduces a solitary narrator and remains unique.';
  const second = 'The crossing passage contains a distinctive second scene near dawn.';
  const raw = `*** START OF THE PROJECT GUTENBERG EBOOK FIXTURE ***\n\nCHAPTER I. The harbor\n\n${`${first} `.repeat(20)}\n\nCHAPTER II. The crossing\n\n${`${second} `.repeat(20)}\n\n*** END OF THE PROJECT GUTENBERG EBOOK FIXTURE ***`;
  global.fetch = async (url) => {
    sources.push(String(url));
    return String(url).includes('/345/') ? new Response(raw) : new Response('', { status: 503 });
  };
  t.after(() => { global.fetch = localFetch; });
  const get = await open(t, backend);

  for (const id of ['unlisted-title', 'contains-dracula', 'constructor']) {
    const missing = await get(`/api/books/${id}/chapters/1`);
    assert.equal(missing.status, 503);
    assert.equal((await missing.json()).chapter, undefined);
  }
  assert.equal((await get('/api/books/unlisted-title')).status, 503);
  assert.equal((await get('/api/books/dracula/chapters/1other')).status, 400);
  assert.equal((await get('/api/books?sort=constructor')).status, 400);
  assert.equal((await get('/api/books?page=1000000000')).status, 400);
  assert.equal(sources.length, 0, 'invalid or unrelated requests must not download another book');

  const bundled = await (await get('/api/books?limit=100')).json();
  assert.equal(bundled.books.length, 20);
  for (const book of bundled.books) {
    assert.equal(book.coverUrl, `https://www.gutenberg.org/cache/epub/${book.gutendexId}/pg${book.gutendexId}.cover.medium.jpg`);
  }

  const [detail, chapter] = await Promise.all([
    get('/api/books/dracula'), get('/api/books/345/chapters/2'),
  ]);
  assert.equal(detail.status, 200);
  assert.equal(chapter.status, 200);
  assert.deepEqual((await detail.json()).chapters.map(({ chapterNumber }) => chapterNumber), [1, 2]);
  const selected = await chapter.json();
  assert.equal(selected.book.slug, 'dracula');
  assert.equal(selected.chapter.chapterNumber, 2);
  assert.ok(selected.chapter.content.includes(second));
  assert.ok(!selected.chapter.content.includes(first));
  assert.deepEqual(selected.navigation, { previous: 1, next: null });
  assert.equal((await get('/api/books/dracula/chapters/99999')).status, 404);
  assert.equal(sources.length, 1, 'both exact aliases share the same public download');

  const unavailableDetails = await get('/api/books/frankenstein');
  assert.equal(unavailableDetails.status, 200);
  assert.deepEqual((await unavailableDetails.json()).chapters, []);
  const unavailableText = await get('/api/books/frankenstein/chapters/1');
  assert.equal(unavailableText.status, 503);
  assert.equal((await unavailableText.json()).chapter, undefined);
  assert.equal(sources.length, 3, 'recent failures are not retried on every chapter request');
});

test('catalog responses correct legacy Alice artwork without changing healthy covers or stored data', async (t) => {
  const alice = Object.freeze({
    _id: 'alice-test', slug: 'alices-adventures-in-wonderland', gutendexId: 11,
    title: 'Alice', author: 'Unknown Author', description: 'Alice by Unknown Author. First published in 2001.',
    coverUrl: 'https://covers.openlibrary.org/b/id/1004242-L.jpg',
  });
  const wuthering = Object.freeze({
    _id: 'wuthering-test', slug: 'wuthering-heights', gutendexId: 768,
    title: 'Wuthering Heights', author: 'Emily Brontë', coverUrl: 'https://covers.openlibrary.org/b/id/12818862-L.jpg',
  });
  const originals = { find: Book.find, count: Book.countDocuments, book: Book.findOne, chapters: Chapter.find, state: mongoose.connection.readyState };
  const match = filter => filter.$or ? filter.$or.some(item => item.gutendexId === 11) ? [alice] : [] : [alice, wuthering];
  const query = result => ({
    sort() { return this; }, skip() { return this; }, limit() { return this; }, select() { return this; },
    maxTimeMS() { return this; }, lean: async () => result,
  });
  Book.find = filter => query(match(filter));
  Book.countDocuments = filter => ({ maxTimeMS: async () => match(filter).length });
  Book.findOne = filter => query([alice, wuthering].find(book => book.slug === filter.slug));
  Chapter.find = () => query([{ chapterNumber: 1, title: 'Chapter I', wordCount: 100, order: 1 }]);
  mongoose.connection.readyState = 1;
  t.after(() => {
    Book.find = originals.find;
    Book.countDocuments = originals.count;
    Book.findOne = originals.book;
    Chapter.find = originals.chapters;
    mongoose.connection.readyState = originals.state;
  });
  const get = await open(t, backend);

  const listing = await (await get('/api/books')).json();
  assert.equal(listing.books[0].title, "Alice's Adventures in Wonderland");
  assert.equal(listing.books[0].author, 'Lewis Carroll');
  assert.match(listing.books[0].description, /Wonderland/);
  assert.match(listing.books[0].coverUrl, /gutenberg\.org\/cache\/epub\/11\/pg11\.cover\.medium\.jpg$/);
  assert.equal(listing.books[1].coverUrl, wuthering.coverUrl);

  const details = await (await get(`/api/books/${alice.slug}`)).json();
  assert.deepEqual(details.book, listing.books[0]);
  const byAuthor = await (await get('/api/books?search=Lewis%20Carroll')).json();
  assert.deepEqual(byAuthor.books, [listing.books[0]]);
  assert.equal(alice.title, 'Alice');
  assert.match(alice.coverUrl, /1004242-L\.jpg$/);
});

test('both ingestion writes require the configured operator token before reading the body', async (t) => {
  const adminToken = 'isolated-test-token-for-ingest-operator';
  const calls = [];
  const app = express();
  const routes = {
    storageReady: () => true,
    ingestOne: async (input) => {
      calls.push(input);
      return { book: { slug: 'frankenstein' }, stats: {} };
    },
    ingestShelf: async ({ books }) => {
      calls.push(books.map(({ gutendexId }) => gutendexId));
      return { results: [{ book: { slug: books[0].slug } }], failures: [] };
    },
  };
  app.use('/api', createIngestRouter({ ...routes, adminToken }));
  app.use('/disabled', createIngestRouter({ ...routes, adminToken: '' }));
  app.use('/offline', createIngestRouter({ ...routes, adminToken, storageReady: () => false }));
  const request = await open(t, app);
  const post = (path, body, token) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

  for (const path of ['/api/ingest', '/api/ingest/curated']) {
    const denied = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(denied.status, 401, 'authorization precedes JSON parsing');
    assert.match(denied.headers.get('www-authenticate'), /^Bearer/);
    assert.equal((await post(path, {}, 'incorrect-token')).status, 401);
  }
  assert.equal((await post('/disabled/ingest', { gutendexId: 84 }, adminToken)).status, 503);
  assert.equal((await post('/offline/ingest', { gutendexId: 84 }, adminToken)).status, 503);
  assert.equal((await post('/api/ingest', { gutendexId: 1.5 }, adminToken)).status, 400);
  assert.equal((await post('/api/ingest', { gutendexId: 84, search: 'Frankenstein' }, adminToken)).status, 400);
  assert.equal((await post('/api/ingest/curated', { only: [84, 999] }, adminToken)).status, 400);
  assert.equal(calls.length, 0);

  const one = await post('/api/ingest', { gutendexId: 84, featured: false }, adminToken);
  const shelf = await post('/api/ingest/curated', { only: [84] }, adminToken);
  assert.equal(one.status, 201);
  assert.equal((await one.json()).book.slug, 'frankenstein');
  assert.equal(shelf.status, 201);
  assert.deepEqual(calls, [{ gutendexId: 84, search: undefined, slug: undefined, featured: false }, [84]]);
});
