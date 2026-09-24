window.NovelCastView = (function () {
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
  function cover(book) {
    if (!book) return '';
    if (book.id === 'ikigai') {
      return `<div class="w-full h-full bg-[#A0CAD7] flex flex-col items-center justify-between p-3.5 text-center relative overflow-hidden">
        <div class="text-[7px] tracking-[0.2em] uppercase text-[#355263] font-medium">The International Bestseller</div>
        <div class="my-auto">
          <div class="w-20 h-14 mx-auto mb-2 opacity-85">
            <svg class="w-full h-full" fill="none" viewBox="0 0 100 80">
              <path d="M10 65 Q 40 45 65 30 T 95 15" fill="none" stroke="#463A32" stroke-width="2.5"></path>
              <circle cx="45" cy="40" fill="#E8B0B8" r="3.5"></circle>
              <circle cx="58" cy="32" fill="#F4CCD2" r="4.5"></circle>
              <circle cx="70" cy="25" fill="#E8B0B8" r="3"></circle>
              <circle cx="82" cy="18" fill="#F4CCD2" r="4"></circle>
              <circle cx="35" cy="50" fill="#E5A6AF" r="3"></circle>
            </svg>
          </div>
          <h3 class="font-serifTitle text-[22px] tracking-[0.18em] font-bold text-[#1E2E3A] leading-tight">IKIGAI</h3>
          <p class="text-[8px] tracking-wide text-[#344D5E] font-medium mt-1">The Japanese Secret<br>to a Long and Happy Life</p>
        </div>
        <div class="text-[6.5px] tracking-tight text-[#486375] font-semibold">
          HÉCTOR GARCÍA AND FRANCESC MIRALLES
        </div>
      </div>`;
    }
    if (book.cover) {
      return `<img src="${book.cover}" alt="${window.NovelCast.escapeHtml(book.title)}" class="w-full h-full object-cover brightness-95 group-hover:scale-105 transition-transform duration-300" loading="lazy" />`;
    }
    const tone = book.accent || '#161d28';
    const initials = (book.title || 'Novel').replace(/[^A-Z0-9 ]/gi, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'NC';
    const format = (book.format || 'MANUSCRIPT').toUpperCase();

    return `<svg viewBox="0 0 200 284" preserveAspectRatio="xMidYMid slice" class="cover-art w-full h-full select-none" aria-hidden="true">
      <defs>
        <linearGradient id="cover-bg-${book.id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e2738"/>
          <stop offset="50%" stop-color="#121722"/>
          <stop offset="100%" stop-color="#0b0e15"/>
        </linearGradient>
        <linearGradient id="gold-foil-${book.id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fcedbf"/>
          <stop offset="50%" stop-color="#f5d77f"/>
          <stop offset="100%" stop-color="#c59f3e"/>
        </linearGradient>
        <radialGradient id="glow-${book.id}" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="rgba(245, 215, 127, 0.18)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <!-- Book Binding Base -->
      <rect width="200" height="284" fill="url(#cover-bg-${book.id})"/>
      <rect width="200" height="284" fill="url(#glow-${book.id})"/>
      <!-- Spine Shadow Left Groove -->
      <rect x="0" y="0" width="10" height="284" fill="rgba(0,0,0,0.45)"/>
      <line x1="10" y1="0" x2="10" y2="284" stroke="rgba(245, 215, 127, 0.25)" stroke-width="1"/>
      <!-- Ornamental Gold Borders -->
      <rect x="18" y="16" width="166" height="252" rx="4" fill="none" stroke="url(#gold-foil-${book.id})" stroke-width="1.2" stroke-dasharray="800" opacity="0.8"/>
      <rect x="22" y="20" width="158" height="244" rx="2" fill="none" stroke="url(#gold-foil-${book.id})" stroke-width="0.6" opacity="0.45"/>
      <!-- Header Badge -->
      <text x="100" y="44" fill="url(#gold-foil-${book.id})" font-family="sans-serif" font-size="7.5" font-weight="700" letter-spacing="3" text-anchor="middle" opacity="0.9">${format}</text>
      <circle cx="100" cy="53" r="1.5" fill="#f5d77f" opacity="0.7"/>
      <!-- Center Emblem Monogram -->
      <circle cx="100" cy="115" r="32" fill="#131924" stroke="url(#gold-foil-${book.id})" stroke-width="1" opacity="0.85"/>
      <circle cx="100" cy="115" r="28" fill="none" stroke="url(#gold-foil-${book.id})" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="100" y="124" fill="url(#gold-foil-${book.id})" font-family="serif" font-size="22" font-weight="700" text-anchor="middle">${initials}</text>
      <!-- Title & Author -->
      <text x="100" y="180" fill="#ffffff" font-family="'Cinzel', serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">
        ${window.NovelCast.escapeHtml((book.title || 'Novel').slice(0, 18))}
      </text>
      ${(book.title && book.title.length > 18) ? `<text x="100" y="196" fill="#f5d77f" font-family="'Cinzel', serif" font-size="10.5" text-anchor="middle" opacity="0.9">${window.NovelCast.escapeHtml(book.title.slice(18, 36))}</text>` : ''}
      <line x1="70" y1="218" x2="130" y2="218" stroke="url(#gold-foil-${book.id})" stroke-width="0.8" opacity="0.5"/>
      <text x="100" y="235" fill="#c3c8d4" font-family="sans-serif" font-size="8.5" text-anchor="middle" letter-spacing="0.5">${window.NovelCast.escapeHtml((book.author || 'Sanctuary Edition').slice(0, 22))}</text>
      <!-- Footer Emblem -->
      <text x="100" y="258" fill="url(#gold-foil-${book.id})" font-size="8" text-anchor="middle" opacity="0.7">✦ NOVELCAST ✦</text>
    </svg>`;
  }
  function findBook(id) { return window.NovelCast.getBook(id); }
  return { stars, cover, findBook };
})();