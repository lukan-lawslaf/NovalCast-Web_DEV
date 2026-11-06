document.addEventListener('novelcast:state', () => {
  document.dispatchEvent(new CustomEvent('novelcast:refresh'));
});

(function () {
  function syncFavorite(button, state) {
    const active = Boolean(state.library[button.dataset.favoriteToggle]?.favorite);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    const icon = button.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.classList.toggle('is-filled', active);
      icon.textContent = active ? 'bookmark' : 'bookmark_add';
    }
  }

  document.addEventListener('novelcast:state', () => {
    const state = window.NovelCast.loadState();
    document.querySelectorAll('[data-favorite-toggle]').forEach(button => syncFavorite(button, state));
  });

  function installAudioOffLinks(scope) {
    if (window.NovelCastAudio) window.NovelCastAudio.bind(scope);
  }

  window.NovelCastUI = Object.assign(window.NovelCastUI || {}, {
  installBookLinks: function (scope) {
    (scope || document).querySelectorAll('[data-book-link]').forEach((a) => {
      if (a.dataset.bookLinkBound) return;
      a.dataset.bookLinkBound = '1';
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        const id = a.dataset.bookLink;
        if (!id) return;
        const target = a.dataset.bookTarget || 'details';
        const map = { details: 'book', book: 'reader', scroll: 'reader' };
        if (window.NovelCastRouter) {
          e.preventDefault();
          window.NovelCastRouter.navigate(map[target] || 'book', { book: id });
          return;
        }
        const fileMap = { details: 'book-details.html', book: 'read-book.html', scroll: 'read-scroll.html' };
        const url = window.NovelCast.bookUrl(fileMap[target] || 'book-details.html', id);
        if (a.tagName === 'A') return;
        e.preventDefault();
        location.href = url;
      });
    });
  },
  installFavoriteToggle: function (scope) {
    (scope || document).querySelectorAll('[data-favorite-toggle]').forEach((btn) => {
      if (btn.dataset.favoriteToggleBound) return;
      btn.dataset.favoriteToggleBound = '1';
      const id = btn.dataset.favoriteToggle;
      syncFavorite(btn, window.NovelCast.loadState());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = window.NovelCast.loadState();
        const entry = window.NovelCast.ensureEntry(state, id);
        const isFav = !entry.favorite;
        entry.favorite = isFav;
        if (isFav && !entry.status) entry.status = 'saved';
        window.NovelCast.saveState(state);
        window.NovelCast.toast(isFav ? 'Added to favorites' : 'Removed from favorites');
      });
    });
  },
  installLibraryToggle: function (scope) {
    (scope || document).querySelectorAll('[data-library-toggle]').forEach((btn) => {
      if (btn.dataset.libraryToggleBound) return;
      btn.dataset.libraryToggleBound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.libraryToggle;
        window.NovelCast.saveBookState(id, { status: 'saved' });
        window.NovelCast.toast(`${window.NovelCast.getBook(id).title} saved to library`);
      });
    });
  },
  installAudioOffLinks: installAudioOffLinks,
});

window.NovelCastView = Object.assign({}, window.NovelCastView, window.NovelCastUI);
})();
window.NovelCastApp = Object.assign(window.NovelCastApp || {}, {
  toggleAudio: function (trackId, options) {
    if (window.NovelCastAudio) return window.NovelCastAudio.playBook(trackId, options);
  },
  bindInteractiveElements: function (scope) {
    if (window.NovelCastUI) {
      window.NovelCastUI.installBookLinks(scope);
      window.NovelCastUI.installFavoriteToggle(scope);
      window.NovelCastUI.installLibraryToggle(scope);
      window.NovelCastUI.installAudioOffLinks(scope);
    }
  }
});
