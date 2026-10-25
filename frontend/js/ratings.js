(function () {
  const base = ((window.__ENV__ || {}).API_BASE || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
  async function request(book, score, signal) {
    const token = window.NovelCastAuth && await window.NovelCastAuth.getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}/books/${encodeURIComponent(book.slug || book.id)}/ratings`, {
      method: score === undefined ? 'GET' : 'PUT', headers, signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      body: score === undefined ? undefined : JSON.stringify({ score }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load ratings. Please try again.');
    book.rating = data.average || 0;
    book.reviews = data.count;
    window.NovelCast.setBookRating(book.slug || book.id, data);
    const current = window.NovelCast.getBook(book.slug || book.id);
    if (current) { current.rating = book.rating; current.reviews = book.reviews; }
    return data;
  }

  window.NovelCastRatings = {
    mount(host, book) {
      if (!host) return () => {};
      const controller = new AbortController();
      const content = host.querySelector('[data-rating-content]');
      let summary = null;
      let saving = false;
      const isPrivate = String(book.id).startsWith('upload-');
      const signedIn = () => window.NovelCastAuth && window.NovelCastAuth.isAuthenticated();
      function paint(message) {
        if (controller.signal.aborted) return;
        const count = summary ? summary.count : 0;
        const score = summary ? summary.myRating : null;
        content.innerHTML = `
          <div class="rating-summary"><strong>${summary && count ? summary.average.toFixed(1) : '—'}</strong>
            <div><span class="rating-summary-label">Reader rating</span><p>${summary ? (count ? `${count.toLocaleString()} ${count === 1 ? 'rating' : 'ratings'}` : 'Be the first to rate this book') : 'Ratings unavailable'}</p></div>
          </div>
          <div class="rating-distribution" aria-label="Rating distribution">${[5, 4, 3, 2, 1].map(value => {
            const votes = summary ? summary.distribution[value - 1] : 0;
            const percent = count ? Math.round(votes / count * 100) : 0;
            return `<div><span>${value} <span aria-hidden="true">★</span></span><meter min="0" max="100" value="${percent}" aria-label="${value} stars: ${votes} ratings"></meter><span>${percent}%</span></div>`;
          }).join('')}</div>
          <div class="rating-entry"><h4>${score ? 'Your rating' : 'How was your read?'}</h4>
          <p>${isPrivate ? 'Community ratings are available for catalog books.' : signedIn() ? 'Choose a star. You can change your rating anytime.' : 'Sign in to share your rating with other readers.'}</p>
          ${isPrivate ? '' : `<fieldset class="rating-stars" ${saving || !summary ? 'disabled' : ''}><legend class="sr-only">Rate this book from 1 to 5 stars</legend>${[1,2,3,4,5].map(value => `<label class="${value <= score ? 'is-selected' : ''}"><input type="radio" name="book-rating" value="${value}" aria-label="${value} ${value === 1 ? 'star' : 'stars'}" ${score === value ? 'checked' : ''}><span aria-hidden="true">★</span></label>`).join('')}</fieldset>`}
          <p class="rating-feedback" role="status">${window.NovelCast.escapeHtml(message || (score ? `You rated this book ${score} out of 5.` : ''))}</p>
          ${!signedIn() && !isPrivate ? `<a class="rating-signin" href="#/login?redirect=${encodeURIComponent('book?book=' + (book.slug || book.id))}">Sign in to rate <span aria-hidden="true">↗</span></a>` : ''}
          ${!summary && !isPrivate ? '<button type="button" class="rating-retry">Try again</button>' : ''}</div>`;
        const hero = document.getElementById('book-hero-rating');
        if (hero && summary) hero.textContent = count ? summary.average.toFixed(1) : 'New';
        const heroCount = document.getElementById('book-hero-rating-count');
        if (heroCount && summary) heroCount.textContent = count ? `(${count.toLocaleString()} ${count === 1 ? 'rating' : 'ratings'})` : '(no ratings yet)';
      }
      async function load() {
        try { summary = await request(book, undefined, controller.signal); paint(); }
        catch (error) { if (error.name !== 'AbortError') paint(error.message); }
      }
      host.addEventListener('change', async event => {
        if (!event.target.matches('input[name="book-rating"]') || saving) return;
        if (!signedIn()) {
          location.hash = `#/login?redirect=${encodeURIComponent('book?book=' + (book.slug || book.id))}`;
          return;
        }
        saving = true;
        const score = Number(event.target.value);
        paint('Saving your rating…');
        try { summary = await request(book, score, controller.signal); saving = false; paint('Your rating has been saved. Thank you for sharing.'); }
        catch (error) { saving = false; if (error.name !== 'AbortError') paint(error.message); }
      }, { signal: controller.signal });
      host.addEventListener('click', event => { if (event.target.closest('.rating-retry')) load(); }, { signal: controller.signal });
      document.addEventListener('novelcast:auth', load, { signal: controller.signal });
      if (isPrivate) paint(); else load();
      return () => controller.abort();
    }
  };
})();
