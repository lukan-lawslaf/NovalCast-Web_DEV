// Check theme changes, animation cleanup and reduced-motion behavior in an isolated DOM.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const themeSource = fs.readFileSync(path.resolve(__dirname, '../frontend/js/theme.js'), 'utf8');

// Let a test decide when an asynchronous animation is ready or finished.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Provide browser features and motion preferences without opening a real page.
function createHarness({
  reducedMotion = false, hidden = false, viewTransitions = true, autoUpdate = true, ink,
} = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button id="toggle" data-theme-toggle aria-label="Light mode" aria-pressed="false">
      <span data-theme-icon></span><span data-theme-label></span>
    </button>
    <button id="fixed-dark" data-theme-toggle="dark"></button>
  </body></html>`, { url: 'https://novelcast.example/', runScripts: 'outside-only' });
  const { window } = dom;
  // Model the browser motion preference and its listeners so tests can change it on demand.
  const mediaListeners = new Set();
  const media = {
    matches: reducedMotion,
    // Support modern and legacy media-query listeners so preference changes can be dispatched.
    addEventListener(type, listener) { if (type === 'change') mediaListeners.add(listener); },
    removeEventListener(type, listener) { if (type === 'change') mediaListeners.delete(listener); },
    addListener(listener) { mediaListeners.add(listener); },
    removeListener(listener) { mediaListeners.delete(listener); },
  };
  window.matchMedia = () => media;
  if (ink !== false) {
    window.NovelCastThemeInk = ink || {
      prepare() { return { start() {}, cleanup() {} }; },
    };
  }
  let isHidden = hidden;
  Object.defineProperty(window.document, 'hidden', { configurable: true, get: () => isHidden });
  Object.defineProperty(window.document, 'visibilityState', {
    configurable: true,
    get: () => isHidden ? 'hidden' : 'visible',
  });

  // Keep transition promises under test control to reproduce overlapping updates and cleanup.
  const transitions = [];
  if (viewTransitions) {
    window.document.startViewTransition = (update) => {
      const ready = deferred();
      const finished = deferred();
      const callbackDone = deferred();
      const transition = {
        update,
        ready,
        finished,
        callbackDone,
        updateCalled: false,
        skipped: false,
        // Record cancellation without requiring the browser view-transition API.
        skipTransition() { this.skipped = true; },
        // Run the captured update on demand and settle its promise even if it throws.
        runUpdate() {
          transition.updateCalled = true;
          try {
            callbackDone.resolve(update());
          } catch (error) {
            callbackDone.reject(error);
          }
          return callbackDone.promise;
        },
      };
      transitions.push(transition);
      // A real browser runs the callback after taking its old-state snapshot.
      // Keeping it controlled here lets each test decide when the new theme applies.
      if (autoUpdate) Promise.resolve().then(() => transition.runUpdate());
      return {
        ready: ready.promise,
        finished: finished.promise,
        skipTransition: () => transition.skipTransition(),
        updateCallbackDone: callbackDone.promise,
      };
    };
  }

  window.eval(themeSource);

  // Click the theme control and allow the resulting asynchronous work to progress.
  function clickToggle(id = 'toggle') {
    window.document.getElementById(id).click();
    return Promise.resolve().then(() => Promise.resolve());
  }

  // Click the theme control immediately to exercise rapid or overlapping interactions.
  function clickToggleNow(id = 'toggle') {
    window.document.getElementById(id).click();
  }

  // Simulate a document visibility change so hidden-page behavior can be tested.
  function setHidden(next) {
    isHidden = next;
    window.document.dispatchEvent(new window.Event('visibilitychange'));
  }

  // Change the simulated reduced-motion preference and notify registered listeners.
  function changeMotion(matches) {
    media.matches = matches;
    for (const listener of mediaListeners) listener({ matches });
  }

  return {
    dom, window, document: window.document, transitions, media,
    clickToggle, clickToggleNow, changeMotion, setHidden,
  };
}

// Build a controlled ink renderer for checking animation behavior without relying on real drawing.
function makeInkRenderer() {
  const calls = { prepare: 0, start: [], cleanup: 0 };
  const ink = {
    // Record preparation and return controls that capture animation callbacks and cleanup.
    prepare() {
      calls.prepare += 1;
      return {
        // Preserve callbacks for tests to trigger cancellation or failure explicitly.
        start(onCancel, onError) { calls.start.push({ onCancel, onError }); },
        // Count cleanup calls so tests can detect leaked animation resources.
        cleanup() { calls.cleanup += 1; },
      };
    },
  };
  return { ink, calls };
}

// Let queued promise callbacks run before the test inspects their effects.
async function flushMicrotasks() {
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
}

// Scenario: setTheme stays synchronous, persists, updates every toggle, and emits the theme change. The checks below exercise this behavior as one independent case.
test('setTheme stays synchronous, persists, updates every toggle, and emits the theme change', () => {
  const h = createHarness();
  const changes = [];
  h.document.addEventListener('novelcast:themechange', (event) => changes.push(event.detail));
  assert.equal(h.window.NovelCastTheme.setTheme('light'), 'light');
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.dataset.theme, 'light');
  assert.equal(h.document.documentElement.style.colorScheme, 'light');
  assert.equal(h.window.localStorage.getItem('novelcast-theme'), 'light');
  assert.equal(h.document.getElementById('toggle').getAttribute('aria-pressed'), 'true');
  assert.equal(h.document.getElementById('toggle').getAttribute('aria-label'), 'Light mode');
  assert.equal(h.document.querySelector('[data-theme-icon]').textContent, 'dark_mode');
  assert.equal(h.document.getElementById('fixed-dark').getAttribute('aria-pressed'), 'false');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].theme, 'light');
  assert.equal(changes[0].previousTheme, 'dark');
  assert.equal(h.transitions.length, 0, 'programmatic changes are immediate and do not animate');
  h.dom.window.close();
});

// Scenario: theme toggle animates its delegated click and clears the marker when finished. The checks below exercise this behavior as one independent case.
test('theme toggle animates its delegated click and clears the marker when finished', async () => {
  const h = createHarness();
  await h.clickToggle();
  assert.equal(h.transitions.length, 1);
  assert.equal(h.transitions[0].updateCalled, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), true);

  h.transitions[0].finished.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: ink renderer starts only after readiness and cleans up once on normal finish. The checks below exercise this behavior as one independent case.
test('ink renderer starts only after readiness and cleans up once on normal finish', async () => {
  const { ink, calls } = makeInkRenderer();
  const h = createHarness({ ink });
  h.clickToggleNow();
  assert.equal(calls.prepare, 1);
  assert.equal(calls.start.length, 0, 'renderer waits for the transition ready signal');
  assert.equal(calls.cleanup, 0);
  h.transitions[0].ready.resolve();
  await flushMicrotasks();
  assert.equal(calls.start.length, 1);

  h.transitions[0].finished.resolve();
  await flushMicrotasks();
  assert.equal(calls.cleanup, 1);
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: cancellation before readiness cleans the renderer once and prevents it from starting. The checks below exercise this behavior as one independent case.
test('cancellation before readiness cleans the renderer once and prevents it from starting', async () => {
  const { ink, calls } = makeInkRenderer();
  const h = createHarness({ ink });
  h.clickToggleNow();
  const transition = h.transitions[0];

  h.window.dispatchEvent(new h.window.HashChangeEvent('hashchange'));
  assert.equal(transition.skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(calls.cleanup, 1);
  transition.ready.resolve();
  await flushMicrotasks();
  transition.finished.resolve();
  await flushMicrotasks();
  assert.equal(calls.start.length, 0);
  assert.equal(calls.cleanup, 1, 'late readiness and finish must not clean up a second time');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: a renderer preparation failure falls back to an immediate theme change. The checks below exercise this behavior as one independent case.
test('a renderer preparation failure falls back to an immediate theme change', () => {
  let prepareCalls = 0;
  const h = createHarness({ ink: { prepare() { prepareCalls += 1; throw new Error('canvas unavailable'); } } });
  h.clickToggleNow();
  assert.equal(prepareCalls, 1);
  assert.equal(h.transitions.length, 0);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: renderer failure callback settles the theme and cleans up once. The checks below exercise this behavior as one independent case.
test('renderer failure callback settles the theme and cleans up once', async () => {
  const { ink, calls } = makeInkRenderer();
  const h = createHarness({ ink });
  h.clickToggleNow();
  const transition = h.transitions[0];
  transition.ready.resolve();
  await flushMicrotasks();
  assert.equal(calls.start.length, 1);

  calls.start[0].onError(new Error('renderer failed'));
  assert.equal(transition.skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(calls.cleanup, 1);
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);

  transition.finished.resolve();
  await flushMicrotasks();
  assert.equal(calls.cleanup, 1);
  h.dom.window.close();
});

// Scenario: a missing ink renderer uses the immediate theme switch. The checks below exercise this behavior as one independent case.
test('a missing ink renderer uses the immediate theme switch', async () => {
  const h = createHarness({ ink: false });
  await h.clickToggle();
  assert.equal(h.transitions.length, 0);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: reduced motion, hidden pages, and active book openings switch immediately. The checks below exercise this behavior as one independent case.
test('reduced motion, hidden pages, and active book openings switch immediately', async (t) => {
  const cases = [
    ['reduced motion', { reducedMotion: true }],
    ['hidden document', { hidden: true }],
  ];
  for (const [label, options] of cases) {
    await t.test(label, async () => {
      const h = createHarness(options);
      await h.clickToggle();
      assert.equal(h.transitions.length, 0);
      assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
      assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
      h.dom.window.close();
    });
  }
  await t.test('book-opening transition', async () => {
    const h = createHarness();
    h.document.documentElement.setAttribute('data-book-opening', '');
    await h.clickToggle();
    assert.equal(h.transitions.length, 0);
    assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
    h.dom.window.close();
  });
});

// Scenario: switches immediately when view transitions are unavailable or throw. The checks below exercise this behavior as one independent case.
test('switches immediately when view transitions are unavailable or throw', async (t) => {
  await t.test('unsupported browser', async () => {
    const h = createHarness({ viewTransitions: false });
    await h.clickToggle();
    assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
    assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
    h.dom.window.close();
  });
  await t.test('startViewTransition throws', async () => {
    const h = createHarness();
    h.document.startViewTransition = () => { throw new Error('transition unavailable'); };
    await h.clickToggle();
    assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
    assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
    h.dom.window.close();
  });
});

// Scenario: cleans up when the transition rejects. The checks below exercise this behavior as one independent case.
test('cleans up when the transition rejects', async () => {
  const h = createHarness();
  await h.clickToggle();
  h.transitions[0].ready.reject(new Error('snapshot failed'));
  h.transitions[0].finished.reject(new Error('transition failed'));
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: settling the page before the update callback prevents a stale callback. The checks below exercise this behavior as one independent case.
test('settling the page before the update callback prevents a stale callback', async (t) => {
  const cases = [
    ['hash navigation', (h) => h.window.dispatchEvent(new h.window.HashChangeEvent('hashchange'))],
    ['page hide', (h) => h.window.dispatchEvent(new h.window.PageTransitionEvent('pagehide'))],
    ['reduced motion', (h) => h.changeMotion(true)],
  ];
  for (const [label, cancel] of cases) {
    await t.test(label, async () => {
      const h = createHarness({ autoUpdate: false });
      h.clickToggleNow();
      const transition = h.transitions[0];
      assert.equal(h.window.NovelCastTheme.getTheme(), 'dark');

      cancel(h);
      assert.equal(transition.skipped, true);
      assert.equal(h.window.NovelCastTheme.getTheme(), 'light', 'cancellation commits the pending preference');
      assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);

      await transition.runUpdate();
      assert.equal(h.window.NovelCastTheme.getTheme(), 'light', 'the late callback cannot restore stale state');
      assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
      h.dom.window.close();
    });
  }
});

// Scenario: a ready rejection before the update callback applies the requested theme and ignores the late callback. The checks below exercise this behavior as one independent case.
test('a ready rejection before the update callback applies the requested theme and ignores the late callback', async () => {
  const h = createHarness({ autoUpdate: false });
  h.clickToggleNow();
  const transition = h.transitions[0];
  transition.ready.reject(new Error('snapshot unavailable'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(transition.skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  await transition.runUpdate();
  assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: a synchronous programmatic setter overrides a pending click before its callback. The checks below exercise this behavior as one independent case.
test('a synchronous programmatic setter overrides a pending click before its callback', async () => {
  const h = createHarness({ autoUpdate: false });
  const changes = [];
  h.document.addEventListener('novelcast:themechange', (event) => changes.push(event.detail.theme));
  h.clickToggleNow();
  const transition = h.transitions[0];
  assert.equal(h.window.NovelCastTheme.setTheme('dark'), 'dark');
  assert.equal(transition.skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'dark');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  await transition.runUpdate();
  assert.equal(h.window.NovelCastTheme.getTheme(), 'dark');
  assert.deepEqual(changes, []);
  h.dom.window.close();
});

// Scenario: rapid clicks keep the newest transition and theme intent in control. The checks below exercise this behavior as one independent case.
test('rapid clicks keep the newest transition and theme intent in control', async () => {
  const h = createHarness();
  await h.clickToggle();
  const first = h.transitions[0];
  await h.clickToggle();
  const second = h.transitions[1];
  assert.equal(first.skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'dark', 'two rapid toggles return to the original theme');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), true);

  first.finished.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), true,
    'finishing an older transition must not clear the current transition marker');
  second.finished.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: a stale callback from a cancelled transition cannot override the newest click. The checks below exercise this behavior as one independent case.
test('a stale callback from a cancelled transition cannot override the newest click', async () => {
  const h = createHarness();
  const changes = [];
  h.document.addEventListener('novelcast:themechange', (event) => changes.push(event.detail.theme));
  h.clickToggleNow();
  h.clickToggleNow();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.transitions.length, 1, 'returning to the already active theme cancels the pending wipe');
  assert.equal(h.transitions[0].skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'dark');
  assert.deepEqual(changes, []);
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.transitions[0].finished.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'dark', 'the cancelled callback cannot apply its light theme');
  h.dom.window.close();
});

// Scenario: a programmatic theme change cancels an in-flight animation. The checks below exercise this behavior as one independent case.
test('a programmatic theme change cancels an in-flight animation', async () => {
  const h = createHarness();
  await h.clickToggle();
  const transition = h.transitions[0];
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), true);

  assert.equal(h.window.NovelCastTheme.setTheme('dark'), 'dark');
  assert.equal(transition.skipped, true);
  assert.equal(h.window.NovelCastTheme.getTheme(), 'dark');
  assert.equal(h.window.localStorage.getItem('novelcast-theme'), 'dark');
  assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
  h.dom.window.close();
});

// Scenario: navigation, page hide, and enabling reduced motion stop an in-flight animation. The checks below exercise this behavior as one independent case.
test('navigation, page hide, and enabling reduced motion stop an in-flight animation', async (t) => {
  for (const [label, cancel] of [
    ['hash navigation', (h) => h.window.dispatchEvent(new h.window.HashChangeEvent('hashchange'))],
    ['page hide', (h) => h.window.dispatchEvent(new h.window.PageTransitionEvent('pagehide'))],
    ['visibility hidden', (h) => h.setHidden(true)],
    ['reduced motion change', (h) => h.changeMotion(true)],
  ]) {
    await t.test(label, async () => {
      const h = createHarness();
      await h.clickToggle();
      const transition = h.transitions[0];
      cancel(h);
      assert.equal(transition.skipped, true);
      assert.equal(h.document.documentElement.hasAttribute('data-theme-transition'), false);
      assert.equal(h.window.NovelCastTheme.getTheme(), 'light');
      h.dom.window.close();
    });
  }
});
