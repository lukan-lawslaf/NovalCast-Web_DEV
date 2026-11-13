// Check sign-in, sign-up and session errors with fake Supabase responses in JSDOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
// Allow queued authentication work to run before inspecting its result.
const settle = () => new Promise(resolve => setImmediate(resolve));

// Build a fresh browser-like page and replace Supabase calls with test responses.
function fixture(t, handlers = {}, storedUser) {
  const dom = new JSDOM('<main id="app-view"></main>', { url: 'http://127.0.0.1:3000/#/login', runScripts: 'outside-only' });
  // Restore or release the test resources even if an assertion fails.
  t.after(() => dom.window.close());
  const w = dom.window;
  let clientOptions;
  w.__ENV__ = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-public-key' };
  if (storedUser) w.localStorage.setItem('novelcast.auth.user.v1', JSON.stringify(storedUser));
  // Capture client options and supply a fake auth API; individual scenarios override its methods.
  w.supabase = { createClient(url, key, options) {
    clientOptions = options;
    return { auth: {
      // Start with no session; handler overrides simulate sign-in, signup, and network failures.
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => {}, ...handlers,
    } };
  } };
  // Stub unrelated UI and fail if an authentication error incorrectly navigates away.
  w.NovelCast = { toast: () => {}, escapeHtml: value => String(value).replace(/</g, '&lt;') };
  w.NovelCastRouter = { navigate: () => { throw new Error('Unexpected navigation after failed authentication'); } };
  w.eval(fs.readFileSync('frontend/js/auth.js', 'utf8'));
  return { w, auth: w.NovelCastAuth, options: () => clientOptions };
}

// Scenario: signup, signin and resend normalize network failures without authenticating. The checks below exercise this behavior as one independent case.
test('signup, signin and resend normalize network failures without authenticating', async t => {
  // Reuse the same provider failure across all three operations to compare their error handling.
  const network = async () => ({ data: null, error: { status: 0, message: 'NetworkError when attempting to fetch resource.' } });
  const { auth } = fixture(t, { signUp: network, signInWithPassword: network, resend: network });
  for (const operation of [() => auth.signUp('reader@example.test', 'test-password'), () => auth.signIn('reader@example.test', 'test-password'), () => auth.resendConfirmation('reader@example.test')]) {
    await assert.rejects(operation, error => error.code === 'auth_unavailable' && /unreachable/.test(error.message) && !/NetworkError/.test(error.message));
    assert.equal(auth.isAuthenticated(), false);
  }
});

// Scenario: credential and confirmation errors remain distinguishable; expired cache is cleared. The checks below exercise this behavior as one independent case.
test('credential and confirmation errors remain distinguishable; expired cache is cleared', async t => {
  const { auth, w } = fixture(t, {
    signInWithPassword: async () => ({ error: { message: 'Invalid login credentials', status: 400 } }),
    signUp: async () => ({ data: { user: { id: 'pending-user' }, session: null }, error: null }),
  }, { id: 'expired-user', email: 'reader@example.test' });
  await auth.init();
  assert.equal(auth.getUser(), null);
  assert.equal(w.localStorage.getItem('novelcast.auth.user.v1'), null);
  await assert.rejects(() => auth.signIn('reader@example.test', 'bad-password'), /Invalid login credentials/);
  const signup = await auth.signUp('reader@example.test', 'test-password');
  assert.equal(signup.session, null);
  assert.equal(auth.getUser(), null);
});

// Scenario: request timeout aborts the actual fetch. The checks below exercise this behavior as one independent case.
test('request timeout aborts the actual fetch', async t => {
  const { w, auth, options } = fixture(t);
  await auth.init();
  const originalTimeout = w.setTimeout.bind(w);
  w.setTimeout = fn => originalTimeout(fn, 5);
  let signal;
  // Keep fetch pending until its abort signal fires, proving timeout reaches the actual request.
  w.fetch = (url, request) => new Promise((resolve, reject) => {
    signal = request.signal;
    signal.addEventListener('abort', () => reject(new w.DOMException('Aborted', 'AbortError')), { once: true });
  });
  await assert.rejects(options().global.fetch('https://auth.example.test/auth/v1/signup'), error => error.name === 'AbortError');
  assert.equal(signal.aborted, true);
});

// Scenario: unconfirmed accounts get the resend path and missing sessions cannot report success. The checks below exercise this behavior as one independent case.
test('unconfirmed accounts get the resend path and missing sessions cannot report success', async t => {
  const pending = fixture(t, { signInWithPassword: async () => ({ error: { status: 400, message: 'Email not confirmed' } }) });
  await assert.rejects(() => pending.auth.signIn('reader@example.test', 'test-password'), error => error.code === 'email_not_confirmed');
  const missing = fixture(t, { signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }) });
  await assert.rejects(() => missing.auth.signIn('reader@example.test', 'test-password'), /did not complete/);
  assert.equal(missing.auth.isAuthenticated(), false);
});

// Scenario: session restoration subscribes once and a newer sign-out wins over an old session response. The checks below exercise this behavior as one independent case.
test('session restoration subscribes once and a newer sign-out wins over an old session response', async t => {
  let callback, restore, subscriptions = 0, reads = 0;
  const user = { id: 'reader', email_confirmed_at: '2026-01-01' };
  const { auth } = fixture(t, {
    getSession: () => { reads++; return new Promise(resolve => { restore = resolve; }); },
    onAuthStateChange: fn => { subscriptions++; callback = fn; },
  }, user);
  const first = auth.init();
  const second = auth.init();
  callback('SIGNED_OUT', null);
  restore({ data: { session: { user } }, error: null });
  await Promise.all([first, second]);
  assert.equal(auth.getUser(), null);
  assert.equal(subscriptions, 1);
  assert.equal(reads, 1);
  callback('SIGNED_IN', { user });
  assert.equal(auth.getUser().id, 'reader');
  callback('TOKEN_REFRESHED', null);
  assert.equal(auth.getUser(), null);
});

// Scenario: sign-out clears private UI state before a slow remote sign-out completes. The checks below exercise this behavior as one independent case.
test('sign-out clears private UI state before a slow remote sign-out completes', async t => {
  let finish;
  const user = { id: 'reader', email_confirmed_at: '2026-01-01' };
  const { auth, w } = fixture(t, { signOut: () => new Promise(resolve => { finish = resolve; }) }, user);
  w.NovelCastRouter.navigate = () => {};
  const pending = auth.signOut();
  assert.equal(auth.getUser(), null);
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(await auth.getAccessToken(), null);
  finish({ error: null });
  await pending;
});

// Scenario: signup prevents duplicates, restores controls, and renders error text safely. The checks below exercise this behavior as one independent case.
test('signup prevents duplicates, restores controls, and renders error text safely', async t => {
  let finish, calls = 0;
  const { w } = fixture(t, { signUp: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  w.eval(fs.readFileSync('frontend/js/views/loginView.js', 'utf8'));
  const view = w.NovelCastViews.login;
  w.document.getElementById('app-view').innerHTML = view.render();
  view.init();
  w.document.getElementById('tab-signup').click();
  w.document.getElementById('sanctuary-name').value = 'Test Reader';
  w.document.getElementById('sanctuary-id').value = 'reader@example.test';
  w.document.getElementById('master-cipher').value = 'test-password';
  const form = w.document.getElementById('auth-form');
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(calls, 1);
  assert.equal(w.document.getElementById('btn-submit').disabled, true);
  finish({ error: { message: '<img src=x onerror=alert(1)>', status: 400 } });
  await settle();
  const alert = w.document.getElementById('auth-alert');
  assert.match(alert.textContent, /<img/);
  assert.equal(alert.querySelector('img'), null);
  assert.equal(w.document.getElementById('btn-submit').disabled, false);
  assert.equal(w.document.getElementById('tab-signin').disabled, false);
  view.destroy();
});
