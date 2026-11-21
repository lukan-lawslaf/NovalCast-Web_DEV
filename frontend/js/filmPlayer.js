// Play immutable film editions. This player only reads the film catalog.
window.NovelCastFilms = (function () {
  let mode;
  let modeRequest;

  function checkMode() {
    if (mode !== undefined) return Promise.resolve(mode);
    if (!modeRequest) {
      const base = new URL(window.NovelCast.API_BASE, location.origin).href.replace(/\/$/, '');
      modeRequest = fetch(base + '/films', { signal: AbortSignal.timeout(2500) })
        .then(async response => {
          if (!response.ok) return false;
          mode = (await response.json()).filmsOnly === true;
          return mode;
        })
        .catch(() => false)
        .finally(() => { modeRequest = null; });
    }
    return modeRequest;
  }

  function endpoint(book) {
    const base = new URL(window.NovelCast.API_BASE, location.origin).href.replace(/\/$/, '');
    return new URL(base + '/films/' + encodeURIComponent(book.slug || book.id));
  }

  function mediaUrl(value, source) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Missing film media.');
    const url = new URL(value, source);
    if ((url.protocol !== 'https:' && url.origin !== source.origin) || url.username || url.password) {
      throw new Error('Invalid film media.');
    }
    return url.href;
  }

  function open(trigger, book, { restoreFocus, autoplay = true } = {}, initialFilm) {
    const dialog = document.createElement('dialog');
    dialog.className = 'nc-film-player';
    dialog.setAttribute('aria-label', book.title + ' film');
    dialog.innerHTML = `
      <header class="nc-film-heading">
        <h2></h2>
        <button type="button" data-film-close autofocus>Close</button>
      </header>
      <video controls playsinline preload="metadata" crossorigin="anonymous" hidden></video>
      <div data-film-drive hidden></div>
      <p data-film-status role="status">Opening film…</p>
      <button type="button" data-film-retry hidden>Try again</button>
      <label class="nc-film-chapter" hidden>
        <span>Chapter</span>
        <select aria-label="Jump to chapter"></select>
      </label>`;
    const heading = dialog.querySelector('h2');
    const status = dialog.querySelector('[data-film-status]');
    const retry = dialog.querySelector('[data-film-retry]');
    const video = dialog.querySelector('video');
    const drive = dialog.querySelector('[data-film-drive]');
    const chapter = dialog.querySelector('select');
    const chapterControl = chapter.closest('label');
    const controller = new AbortController();
    const listener = { signal: controller.signal };
    const source = endpoint(book);
    let chapters = [];
    let selected = 0;
    let closed = false;
    let loading = false;
    heading.textContent = book.title;

    function clearMedia() {
      drive.replaceChildren();
      drive.hidden = true;
      video.pause();
      video.removeAttribute('src');
      video.removeAttribute('poster');
      video.replaceChildren();
      video.hidden = true;
      video.load();
      chapterControl.hidden = true;
    }
    function message(text, canRetry) {
      status.hidden = false;
      status.textContent = text;
      retry.hidden = !canRetry;
    }
    function close() {
      if (closed) return;
      closed = true;
      controller.abort();
      clearMedia();
      dialog.close();
      dialog.remove();
      const origin = restoreFocus?.() || trigger;
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    }
    async function load() {
      if (loading || closed) return;
      loading = true;
      clearMedia();
      message('Opening film…', false);
      try {
        const response = initialFilm || await fetch(source, { signal: controller.signal });
        initialFilm = null;
        if (response.status === 404) {
          message('This film is awaiting release.', false);
          return;
        }
        if (!response.ok) throw new Error('Film catalog unavailable.');
        const film = await response.json();
        if (closed) return;
        if (film.driveUrl) {
          const view = new URL(film.driveUrl);
          if (view.origin !== 'https://drive.google.com' || view.username || view.password ||
              !/^\/file\/d\/[\w-]+\/view$/.test(view.pathname)) throw new Error('Invalid Drive film.');
          heading.textContent = film.title || book.title;
          const frame = document.createElement('iframe');
          const preview = new URL(view);
          preview.pathname = preview.pathname.replace(/\/view$/, '/preview');
          frame.src = preview.href;
          frame.title = heading.textContent;
          frame.allowFullscreen = true;
          const link = document.createElement('a');
          link.href = view.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Open in Google Drive';
          drive.append(frame, link);
          drive.hidden = false;
          status.hidden = true;
          return;
        }
        const src = mediaUrl(film.videoUrl, source);
        if (film.posterUrl) video.poster = mediaUrl(film.posterUrl, source);
        if (film.captionsUrl) {
          const track = document.createElement('track');
          track.kind = 'captions';
          track.srclang = 'en';
          track.label = 'English';
          track.src = mediaUrl(film.captionsUrl, source);
          video.append(track);
        }
        chapters = Array.isArray(film.chapters) ? film.chapters : [];
        selected = 0;
        chapter.replaceChildren(...chapters.map(({ title }, index) => {
          const option = document.createElement('option');
          option.value = String(index);
          option.textContent = title;
          return option;
        }));
        chapterControl.hidden = chapters.length < 2;
        chapter.disabled = true;
        video.hidden = false;
        status.hidden = true;
        video.src = src;
        if (autoplay) video.play().catch(() => {});
      } catch {
        if (!closed) message('The film could not be opened. Try again in a moment.', true);
      } finally { loading = false; }
    }
    video.addEventListener('loadedmetadata', () => { chapter.disabled = false; }, listener);
    video.addEventListener('error', () => {
      if (video.hasAttribute('src')) message('Playback was interrupted. Try opening the film again.', true);
    }, listener);
    video.addEventListener('timeupdate', () => {
      const index = chapters.findLastIndex(item => item.startSeconds <= video.currentTime);
      if (index >= 0 && index !== selected) {
        selected = index;
        chapter.value = String(index);
      }
    }, listener);
    chapter.addEventListener('change', () => {
      const value = Number(chapter.value);
      if (!chapters[value] || !Number.isFinite(video.duration)) return;
      selected = value;
      video.currentTime = chapters[value].startSeconds;
    }, listener);
    dialog.querySelector('[data-film-close]').addEventListener('click', close, listener);
    dialog.addEventListener('close', close, listener);
    retry.addEventListener('click', load, listener);
    document.body.append(dialog);
    dialog.showModal();
    void load();
    return close;
  }

  function openEdition(trigger, book, options) {
    if (mode === true) return open(trigger, book, options);
    const pending = new AbortController();
    let closed = false;
    let close;
    const filmRequest = fetch(endpoint(book), { signal: AbortSignal.any([pending.signal, AbortSignal.timeout(2500)]) })
      .catch(() => null);
    void Promise.all([checkMode(), filmRequest]).then(([filmsOnly, film]) => {
      if (closed) return;
      close = filmsOnly || film?.ok
        ? open(trigger, book, options, film)
        : window.NovelCastExperience?.open(trigger, book, options);
    });
    return () => { closed = true; pending.abort(); close?.(); };
  }

  function mount(trigger, book) {
    void checkMode();
    let close;
    const onClick = event => {
      event.preventDefault();
      close?.();
      close = openEdition(trigger, book);
    };
    trigger.addEventListener('click', onClick);
    return () => {
      trigger.removeEventListener('click', onClick);
      close?.();
    };
  }

  function mountPublished(container, book) {
    const controller = new AbortController();
    let close;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nc-film-launch';
    void fetch(endpoint(book), { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const film = await response.json();
      if (controller.signal.aborted || !container.isConnected) return;
      button.textContent = film.driveUrl ? 'Watch film preview' : 'Watch film';
      button.addEventListener('click', () => {
        close?.();
        close = open(button, book, {}, { ok: true, json: async () => film });
      }, { signal: controller.signal });
      container.append(button);
    }).catch(() => {});
    return () => { controller.abort(); close?.(); button.remove(); };
  }

  return { open, openEdition, mount, mountPublished, checkMode };
}());
