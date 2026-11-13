// Check cover and synopsis matching with fake Open Library responses.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { enrich } = require('../backend/src/services/openLibraryService');

// Replace the external catalog with controlled search results for each test.
function mockLibrary(t, docs) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    const path = new URL(url).pathname;
    calls.push(path);
    if (path === '/search.json') return Response.json({ docs });
    return Response.json({ description: { value: 'A verified work synopsis.' } });
  };
  // Restore or release the test resources even if an assertion fails.
  t.after(() => { global.fetch = original; });
  return calls;
}

// Scenario: cover enrichment skips unrelated search hits even when they have artwork. The checks below exercise this behavior as one independent case.
test('cover enrichment skips unrelated search hits even when they have artwork', async (t) => {
  const calls = mockLibrary(t, [
    { key: '/works/OL1W', title: 'Wuthering Heights', author_name: ['Another Author'], cover_i: 1 },
    { key: '/works/OL2W', title: 'The Poems of Emily Brontë', author_name: ['Emily Brontë'], cover_i: 2 },
    { key: '/works/OL3W', title: 'Wuthering Heights: A Novel', author_name: ['Brontë, Emily'], cover_i: 3 },
  ]);
  const result = await enrich({ title: 'Wuthering Heights', author: 'Emily Bronte\u0308' });
  assert.equal(result.workKey, '/works/OL3W');
  assert.match(result.coverUrl, /\/id\/3-L\.jpg/);
  assert.deepEqual(calls, ['/search.json', '/works/OL3W.json']);
});

// Scenario: cover enrichment declines ambiguous titles, unknown authors, and invalid artwork identifiers. The checks below exercise this behavior as one independent case.
test('cover enrichment declines ambiguous titles, unknown authors, and invalid artwork identifiers', async (t) => {
  const calls = mockLibrary(t, [
    { key: '/works/OL1W', title: 'Alice', author_name: ['Anonymous'], cover_i: 1 },
    { key: '/works/OL2W', title: "Alice's Adventures in Wonderland", author_name: ['Lewis Carroll'], cover_i: -1, cover_edition_key: '../unrelated' },
  ]);
  const unrelated = await enrich({ title: 'Alice', author: 'Unknown Author' });
  const matching = await enrich({ title: 'Alice’s Adventures in Wonderland', author: 'Lewis Carroll' });
  assert.equal(unrelated.coverUrl, '');
  assert.equal(unrelated.workKey, null);
  assert.equal(matching.coverUrl, '');
  assert.equal(matching.workKey, '/works/OL2W');
  assert.deepEqual(calls, ['/search.json', '/works/OL2W.json']);
});
