const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('rating form saves, edits, rolls back errors, redirects guests, and cleans up', async () => {
  const dom = new JSDOM('<section id="book-ratings"><div data-rating-content>Loading</div></section>', {
    url: 'http://127.0.0.1:3000/#/book?book=dracula', runScripts: 'outside-only',
  });
  const { window } = dom;
  const book = { id: 'dracula', slug: 'dracula' };
  let signedIn = true, fail = false, writes = 0;
  let summary = { count: 0, average: null, distribution: [0,0,0,0,0], myRating: null };
  window.AbortSignal.timeout = () => new window.AbortController().signal;
  window.AbortSignal.any = signals => signals[0];
  window.NovelCastAuth = { getAccessToken: async () => signedIn ? 'verified-session' : null, isAuthenticated: () => signedIn };
  window.NovelCast = {
    getBook: () => book, setBookRating: () => {},
    escapeHtml: text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  };
  window.fetch = async (url, options) => {
    if (options.method === 'PUT') {
      writes++;
      if (fail) return { ok: false, json: async () => ({ error: '<img src=x onerror=alert(1)> unavailable' }) };
      const score = JSON.parse(options.body).score;
      const distribution = [0,0,0,0,0]; distribution[score - 1] = 1;
      summary = { count: 1, average: score, distribution, myRating: score };
    }
    return { ok: true, json: async () => summary };
  };
  window.eval(fs.readFileSync('frontend/js/ratings.js', 'utf8'));
  const host = window.document.querySelector('#book-ratings');
  const unmount = window.NovelCastRatings.mount(host, book);
  const choose = async score => {
    const input = host.querySelector(`input[value="${score}"]`);
    input.checked = true;
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
  };
  await settle();
  assert.match(host.textContent, /Be the first/);
  await choose(5);
  assert.equal(host.querySelector('input:checked').value, '5');
  assert.equal(book.rating, 5);
  assert.equal(book.reviews, 1);
  await choose(2);
  assert.equal(book.rating, 2);
  assert.equal(book.reviews, 1);
  fail = true;
  await choose(4);
  assert.equal(host.querySelector('input:checked').value, '2');
  assert.equal(host.querySelector('img'), null);
  assert.equal(book.rating, 2);
  const previousWrites = writes;
  signedIn = false;
  await choose(3);
  assert.equal(writes, previousWrites);
  assert.match(window.location.hash, /login\?redirect=book%3Fbook%3Ddracula/);
  unmount();
  await choose(1);
  assert.equal(writes, previousWrites);
  dom.window.close();
});
