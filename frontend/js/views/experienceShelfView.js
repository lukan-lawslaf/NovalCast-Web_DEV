// Browse and launch V4 experiences from the catalog.
window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.experienceShelf = (function () {
  const featuredId = 'around-the-world-in-eighty-days';
  const illustratedBooks = new Set([
    'frankenstein',
    'the-picture-of-dorian-gray',
    'alices-adventures-in-wonderland',
    'the-adventures-of-sherlock-holmes',
    'pride-and-prejudice',
    'dracula',
    'the-time-machine',
    'dr-jekyll-and-mr-hyde',
    'moby-dick',
    featuredId,
    'treasure-island',
    'the-war-of-the-worlds',
    'twenty-thousand-leagues-under-the-sea',
    'jane-eyre',
    'the-metamorphosis',
    'the-great-gatsby',
    'the-hound-of-the-baskervilles',
    'the-works-of-edgar-allan-poe-volume-1',
    'a-tale-of-two-cities',
    'wuthering-heights'
  ]);
  const leadBooks = [
    featuredId,
    'alices-adventures-in-wonderland',
    'the-war-of-the-worlds',
    'the-adventures-of-sherlock-holmes',
    'pride-and-prejudice',
    'dracula'
  ];
  const genres = [
    { id: 'adventure', name: 'Adventure', matches: /\badventure\b|\btravel\b/i },
    { id: 'gothic', name: 'Gothic', matches: /gothic|horror/i },
    { id: 'speculative', name: 'Sci-fi & Fantasy', matches: /science fiction|fantasy/i },
    { id: 'mystery', name: 'Mystery', matches: /mystery|detective|suspense/i },
    { id: 'drama', name: 'Drama & Classics', matches: /.*/ }
  ];

  function catalog() {
    const books = window.NovelCast.books.filter(book => book?.id && book.title);
    const featured = books.find(book => book.id === featuredId) || books[0];
    const front = leadBooks.map(id => books.find(book => book.id === id)).filter(Boolean);
    return { featured, books: [...front, ...books.filter(book => !leadBooks.includes(book.id))] };
  }

  function playIcon() {
    return '<span class="exs-play-icon" aria-hidden="true"></span>';
  }

  function illustrationUrl(book) {
    return illustratedBooks.has(book.id) ? `assets/experience/covers/${book.id}.webp` : '';
  }

  function featuredAction(book) {
    if (!book) return '';
    const { escapeHtml, bookUrl } = window.NovelCast;
    return `
      <div class="exs-featured">
        <div class="exs-featured-copy">
          <p class="exs-eyebrow">Featured story</p>
          <h2>${escapeHtml(book.title)}</h2>
        </div>
        <a class="exs-hero-play" href="${escapeHtml(bookUrl('#/experience', book.id))}"
          data-experience-book="${escapeHtml(book.id)}"
          aria-label="Play ${escapeHtml(book.title)}">${playIcon()}<span>Play</span></a>
      </div>
    `;
  }

  function bookCard(book, index) {
    const { escapeHtml, bookUrl } = window.NovelCast;
    const genre = genres.find(group => group.matches.test(book.genre || ''));
    const illustration = illustrationUrl(book);
    const coverBook = illustration
      ? { ...book, gutendexId: undefined, coverUrl: illustration }
      : book;
    const displayTitle = book.id === 'the-war-of-the-worlds' ? 'The War of the Worlds' : book.title;
    const title = escapeHtml(displayTitle);
    const author = escapeHtml(book.author);
    const longestWord = Math.max(...displayTitle.split(/\s+/).map(word => word.length));
    const letteringSize = longestWord >= 12 ? ' exs-cover-lettering-small'
      : longestWord >= 10 ? ' exs-cover-lettering-medium' : '';
    return `
      <li class="exs-card-item" data-exs-genre="${genre.id}">
        <a class="exs-card" href="${escapeHtml(bookUrl('#/experience', book.id))}"
          data-experience-book="${escapeHtml(book.id)}" aria-label="Experience ${title} by ${author}">
          <div class="exs-cover-stage">
            <div class="exs-cover">
              <div class="exs-cover-front${illustration ? ' exs-cover-illustrated' : ''}">
                <div class="exs-cover-art" aria-hidden="true">${window.NovelCastView.cover(coverBook, { eager: index < 6 })}</div>
                ${book.id === 'the-war-of-the-worlds' ? '<video class="exs-motion-poster" muted playsinline preload="none" src="assets/experience/worlds-motion.mp4" aria-hidden="true" tabindex="-1"></video>' : ''}
                ${illustration ? `<h3 class="exs-cover-lettering${letteringSize}">${title}</h3>` : ''}
              </div>
              <span class="exs-card-play" aria-hidden="true">${playIcon()}</span>
            </div>
          </div>
          <div class="exs-card-details">
            ${illustration ? '' : `<h3>${title}</h3>`}
            <p>${author}</p>
            <p class="exs-card-genre">${escapeHtml(book.genre || genre.name)}</p>
          </div>
        </a>
      </li>
    `;
  }

  function listMarkup(books) {
    return books.map(bookCard).join('');
  }

  function filmstrip() {
    const frames = leadBooks.map(id => `
      <img src="${illustrationUrl({ id })}" alt="" loading="lazy" decoding="async">`).join('');
    return `
      <div class="exs-filmstrip" data-exs-filmstrip aria-hidden="true">
        <div class="exs-filmstrip-track">
          <div>${frames}</div><div>${frames}</div>
        </div>
      </div>`;
  }

  function render() {
    const { featured, books } = catalog();
    return `
      <div id="experience-shelf" class="exs-shelf">
        <section class="exs-hero" aria-labelledby="exs-page-title">
          <div class="exs-hero-image" aria-hidden="true">
            <img src="assets/experience/matinee.webp" alt="" fetchpriority="high" decoding="async">
          </div>
          <div class="exs-hero-inner">
            <div class="exs-hero-copy">
              <h1 id="exs-page-title" tabindex="-1">Experience</h1>
              <p>Cinematic scenes, a full cast of voices, and the sounds of the story.</p>
            </div>
            <div class="exs-hero-feature" data-exs-feature>${featuredAction(featured)}</div>
          </div>
          <div class="exs-hero-curtain" aria-hidden="true" hidden>
            <span><span class="exs-curtain-velvet"></span></span>
            <span><span class="exs-curtain-velvet"></span></span>
          </div>
        </section>
        <section class="exs-collection" aria-labelledby="exs-collection-title">
          <div class="exs-collection-inner exs-collection-heading">
            <h2 id="exs-collection-title">The collection</h2>
            <p role="status" data-exs-count>${books.length} ${books.length === 1 ? 'story' : 'stories'}</p>
          </div>
          ${filmstrip()}
          <div class="exs-collection-inner">
            <div class="exs-filters" role="group" aria-label="Filter by genre">
              <button type="button" data-exs-filter="all" aria-pressed="true" aria-controls="exs-books">All stories</button>
              ${genres.map(genre => `<button type="button" data-exs-filter="${genre.id}" aria-pressed="false" aria-controls="exs-books">${genre.name}</button>`).join('')}
            </div>
            <p class="exs-empty" data-exs-empty ${books.length ? 'hidden' : ''}>There are no stories in this collection yet.</p>
            <ul class="exs-grid" id="exs-books" role="list">${listMarkup(books)}</ul>
          </div>
        </section>
      </div>
    `;
  }

  const view = {
    render,
    init() {
      const root = document.getElementById('experience-shelf');
      if (!root) return;
      void window.NovelCastFilms?.checkMode();
      const controller = new AbortController();
      const listener = { signal: controller.signal };
      const feature = root.querySelector('[data-exs-feature]');
      const list = root.querySelector('#exs-books');
      const count = root.querySelector('[data-exs-count]');
      const empty = root.querySelector('[data-exs-empty]');
      const filters = Array.from(root.querySelectorAll('[data-exs-filter]'));
      const strip = root.querySelector('[data-exs-filmstrip]');
      const stripObserver = typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => strip.classList.toggle('is-visible', entry.isIntersecting))
        : null;
      if (stripObserver) stripObserver.observe(strip);
      else strip.classList.add('is-visible');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const supportsTilt = matchMedia('(hover: hover) and (pointer: fine)');
      const requested = new URLSearchParams(location.hash.split('?')[1] || '').get('book');
      let requestedOpened = false;
      let activeFilter = 'all';
      let closeExperience;
      let movingPoster;

      function stopPoster() {
        if (!movingPoster) return;
        movingPoster.pause();
        movingPoster.classList.remove('is-playing');
        movingPoster = null;
      }

      function previewPoster(event) {
        if (reducedMotion.matches || (event.type === 'pointerover' && !supportsTilt.matches)) return;
        const poster = event.target.closest('.exs-card')?.querySelector('.exs-motion-poster');
        if (!poster || movingPoster === poster) return;
        stopPoster();
        movingPoster = poster;
        poster.currentTime = 0;
        poster.play().then(() => {
          if (movingPoster === poster) poster.classList.add('is-playing');
        }).catch(() => {});
      }
      function leavePoster(event) {
        if (!movingPoster) return;
        if (!movingPoster.closest('.exs-card')?.contains(event.relatedTarget)) stopPoster();
      }
      list.addEventListener('pointerover', previewPoster, listener);
      list.addEventListener('focusin', previewPoster, listener);
      list.addEventListener('pointerout', leavePoster, listener);
      list.addEventListener('focusout', leavePoster, listener);
      reducedMotion.addEventListener('change', stopPoster, listener);

      const motion = window.NovelCastShelfMotion.mount(root, list, { reducedMotion, supportsTilt });

      this.destroy = () => {
        stripObserver?.disconnect();
        motion.destroy();
        stopPoster();
        closeExperience?.();
        controller.abort();
      };

      function applyFilter() {
        let visible = 0;
        for (const item of list.children) {
          item.hidden = activeFilter !== 'all' && item.dataset.exsGenre !== activeFilter;
          if (!item.hidden) visible++;
        }
        for (const filter of filters) {
          filter.setAttribute('aria-pressed', String(filter.dataset.exsFilter === activeFilter));
        }
        count.textContent = `${visible} ${visible === 1 ? 'story' : 'stories'}`;
        empty.hidden = visible > 0;
        empty.textContent = activeFilter === 'all'
          ? 'There are no stories in this collection yet.'
          : 'There are no stories in this genre yet.';
      }

      function findTrigger(container, id) {
        return Array.from(container.querySelectorAll('[data-experience-book]'))
          .find(link => link.dataset.experienceBook === id);
      }

      function openBook(trigger, book) {
        const open = window.NovelCastFilms?.openEdition || window.NovelCastExperience?.open;
        if (!open || !book) return false;
        stopPoster();
        const origin = feature.contains(trigger) ? feature : list;
        closeExperience?.();
        closeExperience = open(trigger, book, {
          fromShelf: true,
          coverUrl: illustrationUrl(book),
          restoreFocus: () => findTrigger(origin, book.id) || root.querySelector('#exs-page-title')
        });
        return true;
      }

      function openRequestedBook() {
        if (!requested || requestedOpened) return;
        const book = window.NovelCast.getExactBook(requested);
        if (!book) return;
        const trigger = findTrigger(list, book.id);
        if (trigger) requestedOpened = openBook(trigger, book);
      }

      root.addEventListener('click', event => {
        const filter = event.target.closest('[data-exs-filter]');
        if (filter && filter.dataset.exsFilter !== activeFilter) {
          stopPoster();
          activeFilter = filter.dataset.exsFilter;
          applyFilter();
          motion.refresh();
        }
        if (event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('[data-experience-book]');
        if (link && openBook(link, window.NovelCast.getExactBook(link.dataset.experienceBook))) {
          // Open within the user gesture so playback can start with sound.
          requestedOpened = true;
          event.preventDefault();
        }
      }, listener);

      document.addEventListener('novelcast:books-loaded', () => {
        stopPoster();
        const { featured, books } = catalog();
        // Avoid taking a control out of the page while the user is interacting with it.
        const restoreFocus = document.activeElement?.closest('#experience-shelf [data-experience-book]');
        const focusedBook = restoreFocus?.dataset.experienceBook;
        const featuredFocused = restoreFocus && feature.contains(restoreFocus);
        feature.innerHTML = featuredAction(featured);
        list.innerHTML = listMarkup(books);
        applyFilter();
        if (focusedBook) {
          const target = featuredFocused ? feature : list;
          const replacement = findTrigger(target, focusedBook);
          (replacement || root.querySelector('#exs-page-title')).focus({ preventScroll: true });
        }
        motion.refresh();
        openRequestedBook();
      }, listener);

      openRequestedBook();
    }
  };
  return view;
})();
