// Apply the saved light/dark theme and coordinate the optional ink transition between themes.
(function initializeNovelCastTheme(window, document) {
  'use strict';

  const STORAGE_KEY = 'novelcast-theme';
  const THEMES = new Set(['dark', 'light']);
  const root = document.documentElement;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let activeTransition = null;

  // Accept only supported theme names before using browser-stored values.
  function normalizeTheme(theme) {
    return typeof theme === 'string' && THEMES.has(theme) ? theme : null;
  }

  function readSavedTheme() {
    try {
      return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  // Keep all theme buttons, labels and pressed states consistent with the active theme.
  function syncToggles(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const fixedTarget = normalizeTheme(button.dataset.themeToggle);
      const target = fixedTarget || 'light';
      const isSelected = target === theme;
      const nextTheme = theme === 'light' ? 'dark' : 'light';

      button.setAttribute('aria-label', target === 'light' ? 'Light mode' : 'Dark mode');
      button.setAttribute('aria-pressed', String(isSelected));
      button.title = `Switch to ${nextTheme} mode`;

      const icon = button.querySelector('[data-theme-icon]');
      if (icon && icon.tagName !== 'SVG') {
        icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
      }

      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = target === 'light' ? 'Light mode' : 'Dark mode';
    });
  }

  // Change root classes/colors, optionally remember the choice and notify theme listeners.
  function applyTheme(theme, options = {}) {
    const nextTheme = normalizeTheme(theme);
    if (!nextTheme) return getTheme();

    const previousTheme = getTheme();
    root.dataset.theme = nextTheme;
    root.classList.toggle('dark', nextTheme === 'dark');
    root.classList.toggle('light', nextTheme === 'light');
    root.style.colorScheme = nextTheme;

    if (options.persist !== false) {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // The live theme still applies if storage is disabled or full.
      }
    }

    syncToggles(nextTheme);
    if (previousTheme !== nextTheme) {
      document.dispatchEvent(new CustomEvent('novelcast:themechange', {
        detail: { theme: nextTheme, previousTheme },
      }));
    }
    return nextTheme;
  }

  function getTheme() {
    return normalizeTheme(root.dataset.theme) || 'dark';
  }

  // Release the previous transition mask and optionally finish its pending theme change.
  function cancelTransition(commitPending = false) {
    const active = activeTransition;
    if (!active) return;
    activeTransition = null;
    if (commitPending && !active.applied) applyTheme(active.theme);
    active.transition?.skipTransition();
    active.ink?.cleanup();
    root.removeAttribute('data-theme-transition');
  }

  // Public setters stay immediate, including calls made before the first paint.
  function setTheme(theme, options = {}) {
    if (!normalizeTheme(theme)) return getTheme();
    cancelTransition();
    return applyTheme(theme, options);
  }

  function toggle() {
    return setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  // Use the ink reveal only when supported and allowed; otherwise apply the theme immediately.
  function transitionTo(theme) {
    if (typeof document.startViewTransition !== 'function' || typeof window.NovelCastThemeInk?.prepare !== 'function' || reducedMotion?.matches ||
        document.visibilityState === 'hidden' || root.hasAttribute('data-book-opening')) {
      return setTheme(theme);
    }

    cancelTransition();
    if (theme === getTheme()) return theme;

    const active = { theme, applied: false, transition: null, ink: null };
    try {
      active.ink = window.NovelCastThemeInk?.prepare();
    } catch {
      return setTheme(theme);
    }
    activeTransition = active;
    root.setAttribute('data-theme-transition', 'ink');
    try {
      active.transition = document.startViewTransition(() => {
        // A skipped transition can still run its callback after a newer click.
        if (activeTransition !== active) return;
        active.applied = true;
        applyTheme(theme);
      });
    } catch {
      return setTheme(theme);
    }

    const finish = () => {
      if (activeTransition === active) {
        if (!active.applied) applyTheme(theme);
        activeTransition = null;
        active.ink?.cleanup();
        root.removeAttribute('data-theme-transition');
      }
    };
    active.transition.ready.then(() => {
      if (activeTransition !== active || !active.ink) return;
      active.ink.start(() => {
        if (activeTransition === active) active.transition.skipTransition();
      }, () => {
        if (activeTransition === active) setTheme(theme);
      });
    }).catch(() => {
      if (activeTransition === active) setTheme(theme);
    });
    active.transition.finished.then(finish, finish);
    return theme;
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest && event.target.closest('[data-theme-toggle]');
    if (!button || button.disabled) return;

    const requestedTheme = normalizeTheme(button.dataset.themeToggle);
    const currentTheme = activeTransition?.theme || getTheme();
    transitionTo(requestedTheme || (currentTheme === 'light' ? 'dark' : 'light'));
  });

  // Settle before another route's cover animation or a backgrounded page takes over.
  window.addEventListener('hashchange', () => cancelTransition(true));
  window.addEventListener('pagehide', () => cancelTransition(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cancelTransition(true);
  });
  reducedMotion?.addEventListener('change', (event) => {
    if (event.matches) cancelTransition(true);
  });
  window.addEventListener('resize', () => cancelTransition(true));

  window.NovelCastTheme = Object.freeze({
    getTheme,
    setTheme,
    toggle,
    syncToggles: () => syncToggles(getTheme()),
  });

  // Default to dark unless the visitor explicitly saved a preference. This is
  // applied immediately so the browser paints the correct theme on first load.
  setTheme(readSavedTheme() || 'dark', { persist: false });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncToggles(getTheme()), { once: true });
  }
})(window, document);
