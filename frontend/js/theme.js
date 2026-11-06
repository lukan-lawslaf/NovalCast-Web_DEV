(function initializeNovelCastTheme(window, document) {
  'use strict';

  const STORAGE_KEY = 'novelcast-theme';
  const THEMES = new Set(['dark', 'light']);
  const root = document.documentElement;

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

  function setTheme(theme, options = {}) {
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

  function toggle() {
    return setTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest && event.target.closest('[data-theme-toggle]');
    if (!button || button.disabled) return;

    const requestedTheme = normalizeTheme(button.dataset.themeToggle);
    if (requestedTheme) setTheme(requestedTheme);
    else toggle();
  });

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
