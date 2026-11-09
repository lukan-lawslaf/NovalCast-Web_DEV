// Full local UI -> authenticated API -> disk -> download flow, with fake accounts only.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('../backend/node_modules/express');
const { chromium } = require('playwright');
const { createLibraryRouter } = require('../backend/src/routes/libraryRoutes');
const { createLibraryJsonStore } = require('../backend/src/services/libraryJsonStore');

const sdk = `(() => {
  const listeners = [];
  const session = () => JSON.parse(localStorage.getItem('test.session') || 'null');
  const notify = () => listeners.forEach(fn => fn(session() ? 'SIGNED_IN' : 'SIGNED_OUT', session()));
  window.addEventListener('storage', e => { if (e.key === 'test.session') notify(); });
  window.supabase = { createClient: () => ({ auth: {
    getSession: async () => ({ data: { session: session() }, error: null }),
    onAuthStateChange: fn => { listeners.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async ({email}) => {
      const id = email.startsWith('two') ? 'reader-two' : 'reader-one';
      const user = { id, email, email_confirmed_at: '2026-01-01' };
      const value = { user, access_token: id };
      localStorage.setItem('test.session', JSON.stringify(value)); notify();
      return { data: { user, session: value }, error: null };
    },
    signOut: async () => { localStorage.removeItem('test.session'); notify(); return { error: null }; }
  } }) };
})();`;

test('desktop and mobile library submits to disk, restores accounts, handles offline saves and downloads JSON', { timeout: 90000 }, async t => {
  const root = path.resolve(__dirname, '../outputs');
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'library-browser-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), root);
    await fs.rm(directory, { recursive: true, force: true });
  });
  const store = createLibraryJsonStore({ directory });
  const app = express();
  let offline = false;
  app.use(express.json());
  app.use('/api/me/library', (req, res, next) => offline ? res.status(503).json({ error: 'Test server is offline.' }) : next());
  app.use('/api', createLibraryRouter({ store, verifyUser: async req => {
    const id = (req.headers.authorization || '').replace('Bearer ', '');
    if (!['reader-one', 'reader-two'].includes(id)) throw Object.assign(new Error('Sign in required.'), { status: 401 });
    return { id };
  } }));
  app.get('/api/books', (req, res) => res.json({ books: [] }));
  app.get('/api/ratings', (req, res) => res.json({ ratings: [] }));
  let base;
  app.get('/js/env.js', (req, res) => res.type('js').send(`window.__ENV__=${JSON.stringify({ SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-public-key' })};window.__ENV__.API_BASE=${JSON.stringify(base + '/api')};`));
  app.use(express.static(path.resolve(__dirname, '../frontend')));
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  await context.addInitScript(() => {
    if (!localStorage.getItem('novelcast.state.v1')) localStorage.setItem('novelcast.state.v1', JSON.stringify({
      library: { dracula: { status: 'saved', favorite: true, chapter: 1, page: 0, bookmarks: [] } }, collections: [],
    }));
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.href.includes('supabase-js')) return route.fulfill({ contentType: 'text/javascript', body: sdk });
    if (url.hostname === 'cdn.tailwindcss.com') return route.fulfill({ contentType: 'text/javascript', body: 'window.tailwind = {};' });
    return route.fulfill({ contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const login = async email => {
    await page.goto(base + '/#/login?redirect=library');
    await page.locator('#sanctuary-id').fill(email);
    await page.locator('#master-cipher').fill('test-password');
    await page.locator('#btn-submit').click();
    await page.waitForSelector('#reading-plan-form');
    await page.waitForFunction(() => window.NovelCastLibrary.getStatus().phase === 'synced');
  };
  await login('one@example.test');
  await page.locator('#daily-minutes').fill('4');
  await page.locator('#reading-plan-form button[type=submit]').click();
  assert.equal(await page.locator('#daily-minutes').evaluate(el => el.validity.rangeUnderflow), true);
  assert.equal((await store.read('reader-one')).revision, 0);
  await page.locator('#daily-minutes').fill('35');
  await page.locator('#favorite-genre').fill('Mystery');
  await page.locator('#reading-plan-form button[type=submit]').click();
  await page.waitForFunction(() => window.NovelCastLibrary.getStatus().phase === 'synced');
  assert.equal((await store.read('reader-one')).readingPlan.dailyMinutes, 35);
  await page.evaluate(() => window.NovelCast.saveBookState('pride-and-prejudice', { status: 'saved', favorite: true }));
  await page.waitForFunction(() => window.NovelCastLibrary.getStatus().phase === 'synced');
  assert.equal((await store.read('reader-one')).state.library['pride-and-prejudice'].favorite, true);
  assert.equal((await store.read('reader-one')).state.library.dracula, undefined);
  await page.locator('#import-device-bookmarks').click();
  await page.waitForFunction(() => window.NovelCastLibrary.getStatus().phase === 'synced');
  assert.equal((await store.read('reader-one')).state.library.dracula.favorite, true);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#download-library-json').click()]);
  const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(exported.readingPlan.dailyMinutes, 35);
  assert.equal(exported.state.library['pride-and-prejudice'].favorite, true);
  assert.equal(/password|access_token|test-public-key|one@example/.test(JSON.stringify(exported)), false);
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('novelcast.library.')) localStorage.removeItem(key);
  });
  await page.reload();
  await page.waitForFunction(() => window.NovelCastLibrary.getStatus().phase === 'synced');
  assert.equal(await page.locator('#daily-minutes').inputValue(), '35');
  assert.equal(await page.locator('[data-library-remove="pride-and-prejudice"]').count(), 1);
  await page.screenshot({ path: path.join(root, 'library-sync-desktop.png'), fullPage: true });
  offline = true;
  await page.locator('#daily-minutes').fill('45');
  await page.locator('#reading-plan-form button[type=submit]').click();
  await page.waitForFunction(() => /offline/.test(window.NovelCastLibrary.getStatus().message));
  assert.equal((await store.read('reader-one')).readingPlan.dailyMinutes, 35);
  await page.reload();
  await page.waitForSelector('#daily-minutes');
  assert.equal(await page.locator('#daily-minutes').inputValue(), '45');
  offline = false;
  await page.locator('#retry-sync').click();
  await page.waitForFunction(() => window.NovelCastLibrary.getStatus().phase === 'synced');
  assert.equal((await store.read('reader-one')).readingPlan.dailyMinutes, 45);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#daily-minutes').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#favorite-genre').evaluate(el => el === document.activeElement), true);
  await page.screenshot({ path: path.join(root, 'library-sync-mobile.png'), fullPage: true });
  const second = await context.newPage();
  await second.goto(base + '/#/library');
  await second.waitForSelector('#reading-plan-form');
  await page.locator('#btn-lib-signout').click();
  await second.waitForURL('**/#/login?redirect=library');
  assert.equal(await second.locator('#reading-plan-form').count(), 0);
  await second.close();
  await login('two@example.test');
  assert.equal(await page.locator('#daily-minutes').inputValue(), '20');
  assert.equal(await page.locator('[data-library-remove]').count(), 0);
  await page.locator('#btn-lib-signout').click();
  await login('one@example.test');
  assert.equal(await page.locator('#daily-minutes').inputValue(), '45');
  assert.equal(await page.locator('[data-library-remove="pride-and-prejudice"]').count(), 1);
  assert.deepEqual(errors, []);
});
