document.addEventListener('novelcast:state', () => {
  document.dispatchEvent(new CustomEvent('novelcast:refresh'));
});

(function () {
  const root = document.body;
  if (!root) return;

  function renderStars(value) {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i += 1) {
      const isFull = i < full;
      const isHalf = !isFull && i === full && half;
      html += `<span class="material-symbols-outlined star-badge${isFull || isHalf ? ' is-filled' : ''}${isHalf ? ' is-half' : ''}" aria-hidden="true">${isHalf ? 'star_half' : 'star'}</span>`;
    }
    return html;
  }

  function coverSvg(book) {
    const tone = book.accent || '#1b212e';
    const initials = book.title.replace(/[^A-Z0-9 ]/g, '').split(' ').slice(0, 2).map((w) => w[0]).join('');
    return `<svg viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice" class="cover-art" aria-hidden="true">
      <defs><linearGradient id="g-${book.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="#05070A"/></linearGradient></defs>
      <rect width="200" height="280" fill="url(#g-${book.id})"/>
      <rect x="0" y="0" width="200" height="280" fill="rgba(0,0,0,0.35)"/>
      <text x="20" y="50" fill="rgba(255,255,255,0.6)" font-family="serif" font-size="11" letter-spacing="3">${book.genre.toUpperCase()}</text>
      <text x="100" y="160" fill="white" font-family="serif" font-size="42" font-weight="700" text-anchor="middle">${initials}</text>
      <text x="100" y="200" fill="rgba(255,255,255,0.75)" font-family="serif" font-size="11" text-anchor="middle">${book.title}</text>
      <text x="100" y="245" fill="rgba(255,255,255,0.45)" font-family="sans-serif" font-size="9" text-anchor="middle">${book.author}</text>
    </svg>`;
  }

  function installBookLinks(scope) {
    (scope || document).querySelectorAll('[data-book-link]').forEach((a) => {
      if (a.dataset.bookLinkBound) return;
      a.dataset.bookLinkBound = '1';
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        const id = a.dataset.bookLink;
        if (!id) return;
        const target = a.dataset.bookTarget || 'details';
        const map = { details: 'book-details.html', book: 'read-book.html', scroll: 'read-scroll.html' };
        const url = window.NovelCast.bookUrl(map[target] || 'book-details.html', id);
        if (a.tagName === 'A') return;
        e.preventDefault();
        location.href = url;
      });
    });
  }

  function installLibraryToggle(scope) {
    (scope || document).querySelectorAll('[data-library-toggle]').forEach((btn) => {
      if (btn.dataset.libraryToggleBound) return;
      btn.dataset.libraryToggleBound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.libraryToggle;
        const entry = window.NovelCast.saveBookState(id, { status: 'saved' });
        window.NovelCast.toast(`${window.NovelCast.getBook(id).title} saved to library`);
      });
    });
  }

  function installFavoriteToggle(scope) {
    (scope || document).querySelectorAll('[data-favorite-toggle]').forEach((btn) => {
      if (btn.dataset.favoriteToggleBound) return;
      btn.dataset.favoriteToggleBound = '1';
      const id = btn.dataset.favoriteToggle;
      const sync = () => {
        const state = window.NovelCast.loadState();
        const isFav = !!(state.library[id] && state.library[id].favorite);
        btn.classList.toggle('is-active', isFav);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.classList.toggle('is-filled', isFav);
          icon.textContent = isFav ? 'bookmark' : 'bookmark_add';
        }
        btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      };
      sync();
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = window.NovelCast.loadState();
        const entry = window.NovelCast.ensureEntry(state, id);
        const isFav = !entry.favorite;
        entry.favorite = isFav;
        if (isFav && !entry.status) entry.status = 'saved';
        window.NovelCast.saveState(state);
        sync();
        window.NovelCast.toast(isFav ? 'Added to favorites' : 'Removed from favorites');
      });
      document.addEventListener('novelcast:state', sync);
    });
  }

  function installAudioOffLinks(scope) {
    (scope || document).querySelectorAll('[data-audio-stub]').forEach((a) => {
      if (a.dataset.audioStubBound) return;
      a.dataset.audioStubBound = '1';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'coming-soon.html?feature=audio';
      });
    });
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
      const sync = () => {
        const state = window.NovelCast.loadState();
        const isFav = !!(state.library[id] && state.library[id].favorite);
        btn.classList.toggle('is-active', isFav);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.classList.toggle('is-filled', isFav);
          icon.textContent = isFav ? 'bookmark' : 'bookmark_add';
        }
        btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      };
      sync();
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = window.NovelCast.loadState();
        const entry = window.NovelCast.ensureEntry(state, id);
        const isFav = !entry.favorite;
        entry.favorite = isFav;
        if (isFav && !entry.status) entry.status = 'saved';
        window.NovelCast.saveState(state);
        sync();
        window.NovelCast.toast(isFav ? 'Added to favorites' : 'Removed from favorites');
      });
      document.addEventListener('novelcast:state', sync);
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
  installAudioOffLinks: function (scope) {
    (scope || document).querySelectorAll('[data-audio-stub]').forEach((a) => {
      if (a.dataset.audioStubBound) return;
      a.dataset.audioStubBound = '1';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'coming-soon.html?feature=audio';
      });
    });
  },
});

window.NovelCastView = Object.assign({}, window.NovelCastView, window.NovelCastUI);
})();