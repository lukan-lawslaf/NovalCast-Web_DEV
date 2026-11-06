const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function loadScript(window, name) {
  window.eval(readFileSync(join(__dirname, '..', 'frontend', 'js', name), 'utf8'));
}

test('profile displays a supplied photo, then returns to guest when signed out', t => {
  const dom = new JSDOM('<a id="header-user-btn"><span data-profile-guest></span><span data-profile-initials></span></a>', {
    url: 'http://localhost:3000/',
    runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  let user;
  let notify;
  window.NovelCastAuth = {
    isAuthenticated: () => Boolean(user),
    onAuthStateChange(callback) {
      notify = callback;
      callback(user);
    },
  };
  loadScript(window, 'profile.js');
  window.NovelCastProfile.init();
  const button = window.document.querySelector('#header-user-btn');
  const initials = button.querySelector('[data-profile-initials]');
  assert.equal(button.hash, '#/login');

  user = { email: 'jane@example.test', user_metadata: { name: 'Jane Reader', avatar_url: 'javascript:alert(1)' } };
  notify(user);
  assert.equal(button.hash, '#/library');
  assert.equal(initials.textContent, 'JR');
  assert.equal(button.querySelector('img'), null);

  user.user_metadata.avatar_url = 'https://images.example.test/jane.jpg';
  notify(user);
  const photo = button.querySelector('img');
  assert.equal(photo.referrerPolicy, 'no-referrer');
  assert.equal(initials.hidden, false);
  photo.dispatchEvent(new window.Event('load'));
  assert.equal(photo.hidden, false);
  assert.equal(initials.hidden, true);

  user = null;
  notify(user);
  assert.equal(button.hash, '#/login');
  assert.equal(button.querySelector('img'), null);
  assert.equal(initials.textContent, '');
});

test('an uploaded book is only resolved for the signed-in account and is never cached in the public catalog', t => {
  const dom = new JSDOM('', { url: 'http://localhost:3000/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.fetch = async () => ({ ok: true, json: async () => ({ books: [] }) });
  loadScript(window, 'data.js');
  let user = { id: 'first-user' };
  window.NovelCastAuth = { getUser: () => user, isAuthenticated: () => Boolean(user) };
  window.localStorage.setItem('novelcast.uploads.first-user', JSON.stringify([{ id: 'upload-private', title: 'Private manuscript' }]));
  assert.equal(window.NovelCast.getExactBook('upload-private').title, 'Private manuscript');
  assert.equal(window.NovelCast.byId['upload-private'], undefined);
  user = { id: 'second-user' };
  assert.equal(window.NovelCast.getExactBook('upload-private'), null);
  user = null;
  assert.equal(window.NovelCast.getExactBook('upload-private'), null);
});

test('catalog artwork treats URL and edition metadata as data', t => {
  const dom = new JSDOM('<main></main>', { url: 'http://localhost:3000/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.fetch = async () => ({ ok: true, json: async () => ({ books: [], ratings: [] }) });
  loadScript(window, 'data.js');
  loadScript(window, 'ui.js');
  const main = window.document.querySelector('main');
  const book = {
    id: '" onload="alert(1)',
    title: 'An edition',
    genre: '</text><script>alert(1)</script><text>',
    coverUrl: 'javascript:alert(1)',
  };
  main.innerHTML = window.NovelCastView.cover(book);
  assert.equal(main.querySelector('img, script, [onload]'), null);
  assert.match(main.textContent, /<SCRIPT>/);
  book.coverUrl = 'https://covers.example.test/cover.jpg?edition=1&volume=2';
  main.innerHTML = window.NovelCastView.cover(book);
  assert.equal(main.querySelector('img').getAttribute('src'), book.coverUrl);
});

test('Romance search keeps Wuthering Heights and its correct fallback cover when Atlas returns no matches', async t => {
  const dom = new JSDOM('<main></main>', {
    url: 'http://localhost:3000/#/search?genre=Romance',
    runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.fetch = async () => ({ ok: true, json: async () => ({ books: [] }) });
  for (const file of ['data.js', 'ui.js', 'pages.js', 'views/searchView.js']) loadScript(window, file);
  const view = window.NovelCastViews.search;
  const { document } = window;
  document.querySelector('main').innerHTML = view.render();
  view.init();

  assert.equal(document.querySelector('#search-input').value, '');
  assert.equal(document.querySelector('[data-filter="Romance"]').getAttribute('aria-pressed'), 'true');
  const wutheringCover = () => document.querySelector('#search-results-grid [data-book-link="wuthering-heights"] img');
  const expected = 'https://www.gutenberg.org/cache/epub/768/pg768.cover.medium.jpg';
  assert.equal(wutheringCover()?.src, expected);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(wutheringCover()?.src, expected);
  document.querySelector('#search-input').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(document.querySelector('[data-filter="all"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('#search-results-section').classList.contains('hidden'), true);
  view.destroy();
});
