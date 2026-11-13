// Build small presentation helpers, including stars, safe cover images and fallback SVG artwork.
window.NovelCastView = (function () {
  let coverSequence = 0;

  // Return five icon slots reflecting the displayed numeric rating.
  function stars(value) {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i += 1) {
      const isFull = i < full;
      const isHalf = !isFull && i === full && half;
      html += `<span class="material-symbols-outlined icon-star${isFull || isHalf ? ' is-filled' : ''}${isHalf ? ' is-half' : ''}" aria-hidden="true">${isHalf ? 'star_half' : 'star'}</span>`;
    }
    return html;
  }
  // Prefer an approved image URL and fall back to generated artwork if loading fails.
  function cover(book, { eager = false } = {}) {
    if (!book) return '';
    const imgUrl = safeCoverUrl(book.coverUrl || book.cover);
    if (imgUrl) {
      return `<img src="${window.NovelCast.escapeHtml(imgUrl)}" alt="${window.NovelCast.escapeHtml(book.title)}" class="w-full h-full object-cover brightness-95 group-hover:scale-105 transition-transform duration-300" loading="${eager ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" /><div class="w-full h-full" style="display:none;">${fallbackCoverSvg(book)}</div>`;
    }
    return fallbackCoverSvg(book);
  }

  // Reject unsafe protocols and URLs containing credentials before building image markup.
  function safeCoverUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, window.location.href);
      return !url.username && !url.password &&
        (url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === location.origin))
        ? url.href : '';
    } catch {
      return '';
    }
  }

  // Create an escaped book cover with unique gradient IDs so repeated cards do not clash.
  function fallbackCoverSvg(book) {
    const coverId = ++coverSequence;
    const initials = (book.title || 'Novel').replace(/[^A-Z0-9 ]/gi, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'NC';
    const format = window.NovelCast.escapeHtml(String(book.genre || book.format || 'CLASSIC').toUpperCase());

    return `<svg viewBox="0 0 200 284" preserveAspectRatio="xMidYMid slice" class="cover-art w-full h-full select-none" aria-hidden="true">
      <defs>
        <linearGradient id="cover-bg-${coverId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e2738"/>
          <stop offset="50%" stop-color="#121722"/>
          <stop offset="100%" stop-color="#0b0e15"/>
        </linearGradient>
        <linearGradient id="gold-foil-${coverId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fcedbf"/>
          <stop offset="50%" stop-color="#f5d77f"/>
          <stop offset="100%" stop-color="#c59f3e"/>
        </linearGradient>
        <radialGradient id="glow-${coverId}" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="rgba(245, 215, 127, 0.18)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <!-- Book Binding Base -->
      <rect width="200" height="284" fill="url(#cover-bg-${coverId})"/>
      <rect width="200" height="284" fill="url(#glow-${coverId})"/>
      <!-- Spine Shadow Left Groove -->
      <rect x="0" y="0" width="10" height="284" fill="rgba(0,0,0,0.45)"/>
      <line x1="10" y1="0" x2="10" y2="284" stroke="rgba(245, 215, 127, 0.25)" stroke-width="1"/>
      <!-- Ornamental Gold Borders -->
      <rect x="18" y="16" width="166" height="252" rx="4" fill="none" stroke="url(#gold-foil-${coverId})" stroke-width="1.2" stroke-dasharray="800" opacity="0.8"/>
      <rect x="22" y="20" width="158" height="244" rx="2" fill="none" stroke="url(#gold-foil-${coverId})" stroke-width="0.6" opacity="0.45"/>
      <!-- Header Badge -->
      <text x="100" y="44" fill="url(#gold-foil-${coverId})" font-family="sans-serif" font-size="7.5" font-weight="700" letter-spacing="3" text-anchor="middle" opacity="0.9">${format}</text>
      <circle cx="100" cy="53" r="1.5" fill="#f5d77f" opacity="0.7"/>
      <!-- Center Emblem Monogram -->
      <circle cx="100" cy="115" r="32" fill="#131924" stroke="url(#gold-foil-${coverId})" stroke-width="1" opacity="0.85"/>
      <circle cx="100" cy="115" r="28" fill="none" stroke="url(#gold-foil-${coverId})" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="100" y="124" fill="url(#gold-foil-${coverId})" font-family="serif" font-size="22" font-weight="700" text-anchor="middle">${initials}</text>
      <!-- Title & Author -->
      <text x="100" y="180" fill="#ffffff" font-family="'Cinzel', serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">
        ${window.NovelCast.escapeHtml((book.title || 'Novel').slice(0, 18))}
      </text>
      ${(book.title && book.title.length > 18) ? `<text x="100" y="196" fill="#f5d77f" font-family="'Cinzel', serif" font-size="10.5" text-anchor="middle" opacity="0.9">${window.NovelCast.escapeHtml(book.title.slice(18, 36))}</text>` : ''}
      <line x1="70" y1="218" x2="130" y2="218" stroke="url(#gold-foil-${coverId})" stroke-width="0.8" opacity="0.5"/>
      <text x="100" y="235" fill="#c3c8d4" font-family="sans-serif" font-size="8.5" text-anchor="middle" letter-spacing="0.5">${window.NovelCast.escapeHtml((book.author || 'Sanctuary Edition').slice(0, 22))}</text>
      <!-- Footer Emblem -->
      <text x="100" y="258" fill="url(#gold-foil-${coverId})" font-size="8" text-anchor="middle" opacity="0.7">✦ NOVELCAST ✦</text>
    </svg>`;
  }
  function findBook(id) { return window.NovelCast.getBook(id); }
  return { stars, cover, findBook };
})();
