// Show the entrance bookshelf, handle its drag/keyboard controls, and animate opening a selected book.
window.NovelCastViews = window.NovelCastViews || {};

let landingDialIndex;

// Keep bookshelf position and drag state inside this mount; the abort signal releases its listeners.
function mountLandingBookDial(shelf, controls, motion, signal, isOpening) {
  const books = Array.from(shelf.querySelectorAll('.book-3d-wrapper'));
  const status = controls.querySelector('[data-dial-title]');
  const wrap = index => ((index % books.length) + books.length) % books.length;
  const relative = index => wrap(index - position + books.length / 2) - books.length / 2;
  const compressedSteps = distance => (1 - .88 ** distance) / .12;
  let position = landingDialIndex ?? Math.max(0, books.findIndex(book => book.classList.contains('book-featured')));
  let destination = position;
  let coverWidth;
  let spineStep;
  let edge;
  let frame = 0;
  let drag;
  let suppressClick = false;

  // Translate each book relative to the selection using CSS position/scale variables.
  function placeBooks() {
    books.forEach((book, index) => {
      const distance = relative(index);
      const gap = Math.abs(distance);
      const center = Math.max(0, 1 - gap);
      const face = center * center * (3 - 2 * center);
      // Reserve room for the front cover at the center, then compress the far spines along the arc.
      const acrossCenter = Math.min(1, Math.max(-1, distance));
      const spread = (acrossCenter + Math.sin(Math.PI * acrossCenter) / Math.PI) / 2;
      const x = Math.sign(distance) * compressedSteps(gap) * spineStep + coverWidth * spread;
      book.style.visibility = gap >= edge ? 'hidden' : '';
      book.style.opacity = Math.min(1, Math.max(0, (edge - gap) * 2));
      book.style.setProperty('--dial-x', `${x}px`);
      book.style.setProperty('--dial-height', `${(1 - .865 ** gap) ** 1.5 * coverWidth * .3}px`);
      book.style.setProperty('--dial-scale', Math.max(.3, .865 ** gap));
      book.style.setProperty('--dial-yaw', `${(90 + Math.max(-8, Math.min(8, distance * 1.7))) * (1 - face)}deg`);
      book.style.setProperty('--dial-layer', Math.round(30 - gap * 4));
    });
  }

  // Recalculate shelf spacing from the available viewport width.
  function measure() {
    const width = shelf.clientWidth;
    const sideBooks = Math.max(1, Math.min(Math.floor((books.length - 1) / 2), Math.floor(width / 105)));
    edge = Math.min(books.length / 2, sideBooks + .5);
    coverWidth = books[0].offsetWidth;
    spineStep = Math.max(0, width * .44 - coverWidth / 2) / compressedSteps(sideBooks);
    placeBooks();
  }

  // Update the selected cover, its label and optional keyboard focus.
  function select(index, focus) {
    landingDialIndex = wrap(index);
    books.forEach((book, i) => {
      const selected = i === landingDialIndex;
      book.tabIndex = selected ? 0 : -1;
      if (selected) book.setAttribute('aria-current', 'true');
      else book.removeAttribute('aria-current');
    });
    const book = books[landingDialIndex];
    status.textContent = book.getAttribute('aria-label');
    if (focus) book.focus({ preventScroll: true });
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    shelf.classList.remove('is-turning');
  }

  // Move toward a chosen book, respecting the reduced-motion preference.
  function snap(index, focus = false) {
    stop();
    destination = index;
    select(index, focus);
    const start = position;
    if (motion.matches || start === index) {
      position = index;
      placeBooks();
      return;
    }

    shelf.classList.add('is-turning');
    const startTime = performance.now();
    function settle(now) {
      const progress = motion.matches ? 1 : Math.min(1, (now - startTime) / 550);
      position = start + (index - start) * (1 - (1 - progress) ** 3);
      placeBooks();
      if (progress < 1) frame = requestAnimationFrame(settle);
      else stop();
    }
    frame = requestAnimationFrame(settle);
  }

  // Advance or reverse the selection, wrapping around the bookshelf.
  function step(direction, focus) {
    if (drag?.moving || isOpening()) return;
    snap((frame ? destination : Math.round(position)) + direction, focus);
  }

  shelf.dataset.dialReady = '';
  controls.hidden = false;
  measure();
  select(position, false);
  const resize = new ResizeObserver(measure);
  resize.observe(shelf);
  signal.addEventListener('abort', () => { stop(); resize.disconnect(); }, { once: true });

  shelf.addEventListener('dragstart', event => event.preventDefault(), { signal });
  shelf.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || isOpening()) return;
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { signal });

  window.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moving) {
      if (Math.abs(dx) < 7 || Math.abs(dx) <= Math.abs(event.clientY - drag.y)) return;
      stop();
      drag.moving = true;
      drag.start = position;
      shelf.setPointerCapture(event.pointerId);
      shelf.classList.add('is-dragging', 'is-turning');
    }
    position = drag.start - dx / (spineStep + coverWidth / 2);
    if (motion.matches) position = Math.round(position);
    placeBooks();
  }, { signal });

  // Finish the drag and settle on the nearest book.
  function endDrag(event) {
    if (event.pointerId !== drag?.id) return;
    const moved = drag.moving;
    drag = null;
    if (!moved) return;
    suppressClick = true;
    shelf.classList.remove('is-dragging');
    snap(Math.round(position), shelf.contains(document.activeElement));
  }

  window.addEventListener('pointerup', endDrag, { signal });
  window.addEventListener('pointercancel', endDrag, { signal });
  shelf.addEventListener('lostpointercapture', endDrag, { signal });
  shelf.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true, signal });

  controls.querySelectorAll('[data-dial-step]').forEach(button => {
    button.addEventListener('click', () => step(Number(button.dataset.dialStep), false), { signal });
  });
  shelf.closest('.landing-original').addEventListener('keydown', event => {
    const onBook = shelf.contains(event.target);
    if (!onBook && !controls.contains(event.target)) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1, onBook);
  }, { signal });

  return {
    stop,
    selectBook(book) {
      const index = books.indexOf(book);
      if (index === landingDialIndex && !frame) return false;
      snap(Math.round(position + relative(index)), true);
      return true;
    },
  };
}

window.NovelCastViews.landing = {
  // Return screen HTML; the router inserts it before init runs.
  render: function () {
    return `
      <!-- NovelCast Focused Cinematic Landing Page (Reference: test.html / animated_hero) -->
      <div class="landing-original relative w-full min-h-screen flex flex-col justify-between bg-[#05070A] overflow-hidden select-none">
        
        <!-- Ambient Animated ASCII Art Background (21st.dev) -->
        <div class="landing-ascii absolute inset-0 z-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
          <video
            class="landing-ascii-video"
            src="https://assets.21st.dev/ascii-recipes/videos/user_3HdhXqtaGNK6PDvN2DFY8vAT2Sr/aaa3f286-9a3c-491d-ba90-4e016ab73ef1.mp4"
            poster="https://assets.21st.dev/ascii-recipes/thumbnails/user_3HdhXqtaGNK6PDvN2DFY8vAT2Sr/5a8e1637-89e6-4132-8e00-61fbb69fda53.webp"
            loop
            muted
            playsinline
          ></video>
        </div>

        <!-- Top Editorial Floating Nav -->
        <header class="landing-header relative z-50 w-full px-6 md:px-12 py-5 flex items-center justify-between">
          <a class="flex items-center gap-3 group focus:outline-none cursor-pointer" href="#/landing">
            <img src="logo.svg" alt="" class="landing-brand-mark h-8 w-auto object-contain" />
            <span class="font-serif text-xl tracking-tight font-medium text-white group-hover:text-neutral-200 transition-colors">
              NovelCast
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-8 text-[13px] tracking-wide text-neutral-400 font-normal">
            <a class="hover:text-white transition-colors duration-200" href="#/home">Catalogs</a>
            <a class="hover:text-white transition-colors duration-200" href="#/search">Editions</a>
            <a class="hover:text-white transition-colors duration-200" href="#/book?book=pride-and-prejudice">Audiobooks</a>
            <a class="hover:text-white transition-colors duration-200" href="#/library">Sanctuary</a>
          </nav>

          <div class="landing-header-actions flex items-center text-[13px]">
            <a class="text-neutral-300 hover:text-white font-medium transition-colors hidden sm:inline-block" href="#/search">
              Browse All
            </a>
            <button class="nc-theme-toggle" data-theme-toggle type="button" aria-label="Light mode" aria-pressed="false">
              <span class="material-symbols-outlined" data-theme-icon aria-hidden="true">light_mode</span>
            </button>
            <a class="bg-white text-black font-semibold px-5 py-2 rounded-full text-xs hover:bg-neutral-200 active:scale-95 transition-all shadow-md shadow-white/10 flex items-center gap-1.5" href="#/home">
              <span>Enter Library</span>
              <span class="text-sm leading-none">→</span>
            </a>
          </div>
        </header>

        <!-- Seductive Minimal Hook -->
        <div class="relative z-30 text-center max-w-xl mx-auto px-4 pt-1 pointer-events-auto">
          <p class="text-[11px] md:text-xs uppercase tracking-[0.32em] text-[#E0C070] font-semibold mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Private Press &amp; Voice Sanctuary
          </p>
          <p class="text-sm md:text-base text-neutral-300 font-light tracking-wide leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Where stories breathe. Bound for devotion, voiced in quiet reverie.
          </p>
        </div>

        <!-- Editorial title and rotary books -->
        <div class="landing-book-showcase">
          <h1 class="landing-hero-title font-serif font-normal text-white/95 drop-shadow-[0_25px_30px_rgba(0,0,0,0.8)]">
            NovelCast
          </h1>

          <!-- Parade Stage Container -->
          <div class="parade-stage">
            <div class="landing-original-row" role="group" aria-label="Book dial" aria-describedby="landing-dial-hint">
              
              ${window.NCPage.landingShelf()}

            </div>
          </div>
        </div>

        <div class="landing-dial-controls" role="group" aria-label="Turn the book dial" hidden>
          <button type="button" data-dial-step="-1" aria-label="Previous book">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 3-5 5 5 5"/></svg>
          </button>
          <div class="landing-dial-caption">
            <p data-dial-title aria-live="polite"></p>
            <p id="landing-dial-hint">Drag, swipe, or use the arrows</p>
          </div>
          <button type="button" data-dial-step="1" aria-label="Next book">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>
          </button>
        </div>

      </div>
    `;
  },
  // Find the inserted elements, attach interactions and prepare cleanup for navigation.
  init: function () {
    const bgVideo = document.querySelector('.landing-ascii-video');
    const controller = new AbortController();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const signal = controller.signal;
    let turn;
    // This closure remembers this screen's resources so leaving the route can release them.
    this.destroy = () => {
      controller.abort();
      turn?.cancel();
      bgVideo?.pause();
    };
    function syncBackgroundMotion() {
      if (motion.matches) bgVideo?.pause();
      else bgVideo?.play().catch(() => {});
    }
    syncBackgroundMotion();
    motion.addEventListener('change', syncBackgroundMotion, { signal });

    const shelf = document.querySelector('.landing-original-row');
    const controls = document.querySelector('.landing-dial-controls');
    if (!shelf?.firstElementChild) return;
    const dial = mountLandingBookDial(shelf, controls, motion, signal, () => Boolean(turn));
    document.addEventListener('novelcast:books-loaded', event => {
      const liveBooks = new Map(event.detail.books.map(book => [book.id, book]));
      shelf.querySelectorAll('[data-shelf-book]').forEach(link => {
        const book = liveBooks.get(link.dataset.shelfBook);
        if (book?.coverUrl) link.querySelector('.book-cover-art').innerHTML = window.NovelCastView.cover(book, { eager: true });
      });
    }, { signal });

    shelf.addEventListener('click', async event => {
      const book = event.target.closest('a.book-3d-wrapper');
      if (!book || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      if (turn || dial.selectBook(book)) {
        event.preventDefault();
        return;
      }
      if (motion.matches || typeof book.animate !== 'function') return;
      event.preventDefault();
      dial.stop();
      const cover = book.querySelector('.book-cover-art');
      const startTransform = getComputedStyle(book).transform;
      book.classList.add('is-opening');
      turn = book.animate([
        { transform: startTransform },
        { offset: .42, transform: 'perspective(920px) translate3d(0, -14px, 32px) rotateZ(-5deg) rotateY(-67deg) rotateX(7deg)' },
        { offset: .86, transform: 'perspective(920px) translate3d(0, -23px, 58px) rotateZ(-2deg) rotateY(6deg) rotateX(-3deg)' },
        { transform: 'perspective(920px) translate3d(0, -22px, 55px) rotateZ(0deg) rotateY(0deg) rotateX(0deg)' }
      ], { duration: 540, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });

      try {
        await turn.finished;
        if (!signal.aborted) window.NovelCastRouter.openBook(book.hash, cover);
      } catch {
        // Leaving the landing page cancels the pending turn.
      }
    }, { signal });
  }
};
