(function () {
  const NC = window.NovelCast;
  const { escapeHtml } = NC;
  const params = NC.readQuery();
  const findBook = (id) => NC.getBook(id);

  function bookHref(page, id, chapter) { return NC.bookUrl(page, id, chapter); }

  function featuredCard(book, variant) {
    if (variant === 'secondary') {
      return `<div class="relative flex-[1_0_460px] bg-[#141822] rounded-[22px] border border-appCardBorder/50 p-6 md:p-7 overflow-hidden shadow-xl flex flex-col justify-between opacity-85" data-purpose="secondary-hero-card" style="border: 1px solid rgba(243, 209, 130, 0.22); box-shadow: rgba(243, 209, 130, 0.1) 0px 0px 20px -4px, rgba(0, 0, 0, 0.6) 0px 15px 25px -10px;">
  <div>
    <h2 class="text-2xl md:text-[25px] font-bold tracking-wider text-[#F8F1E2] uppercase font-sans">${escapeHtml(book.title)}</h2>
    <p class="text-[12.5px] text-[#A6AFBD] mt-1">Written by : <span class="text-[#CCD3DE]">${escapeHtml(book.author)}</span></p>
    <div class="flex items-center gap-4 text-[11.5px] text-[#939DB0] mt-3.5">
      <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px]">visibility</span>${escapeHtml(book.listens)}</span>
      <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px]">schedule</span>${escapeHtml(book.duration)}</span>
      <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px]">menu_book</span>${book.chapters} chapters</span>
    </div>
    <div class="mt-4">
      <span class="text-[12px] font-semibold text-[#8B95A6] block mb-1">Description</span>
      <p class="text-[12px] leading-relaxed text-[#959EAE] line-clamp-3">${escapeHtml(book.description)}</p>
    </div>
  </div>
  <div class="flex items-center gap-3 mt-6 pt-1">
    <button class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-goldAccent text-[#161B22] text-[12.5px] font-bold shadow-md hover:bg-[#ffe196] transition-all" data-audio-stub="book-${book.id}" type="button"><span class="material-symbols-outlined text-[16px]">play_arrow</span><span>Listen Now</span></button>
    <a class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-transparent border border-[#3E4759] text-[#ECEFF4] text-[12.5px] font-medium hover:border-[#67758F] transition-all" href="#/reader?book=${book.id}"><span class="material-symbols-outlined text-[16px]">menu_book</span><span>Read Now</span></a>
  </div>
</div>`;
    }
    return `<div class="relative flex-[1_0_660px] max-w-[690px] bg-[#141822] rounded-[22px] border border-appCardBorder p-6 md:p-7 overflow-hidden shadow-2xl flex justify-between gap-6" data-purpose="primary-hero-card" style="border: 1px solid rgba(243, 209, 130, 0.32); box-shadow: rgba(243, 209, 130, 0.16) 0px 0px 25px -4px, rgba(0, 0, 0, 0.7) 0px 20px 30px -10px;">
  <div class="bokeh-dot w-48 h-48 -top-12 right-24 bg-white/[0.04]"></div>
  <div class="bokeh-dot w-36 h-36 bottom-2 left-1/3 bg-white/[0.02]"></div>
  <div class="bokeh-dot w-28 h-28 top-8 left-12 bg-white/[0.03]"></div>
  <div class="relative z-10 flex flex-col justify-between flex-1 pr-2">
    <div>
      <div class="flex items-center gap-3">
        <h2 class="text-2xl md:text-[26px] font-bold tracking-wider text-[#F8F1E2] uppercase font-sans">${escapeHtml(book.title)}</h2>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#202735] border border-[#2B3547] text-[11px] font-semibold text-[#E5E9F0]">
          <span class="material-symbols-outlined text-goldAccent fill-goldAccent text-[13px]">star</span>${book.rating.toFixed(1)}
        </span>
      </div>
      <p class="text-[12.5px] text-[#A6AFBD] mt-1 font-normal">Written by : <span class="text-[#CCD3DE]">${escapeHtml(book.author)}</span></p>
      <div class="flex items-center gap-4 text-[11.5px] text-[#939DB0] mt-3.5">
        <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px]">visibility</span>${escapeHtml(book.listens)}</span>
        <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px]">schedule</span>${escapeHtml(book.duration)}</span>
        <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[13px]">menu_book</span>${book.chapters} chapters</span>
      </div>
      <div class="mt-4">
        <span class="text-[12px] font-semibold text-[#8B95A6] block mb-1">Description</span>
        <p class="text-[12px] leading-relaxed text-[#959EAE] line-clamp-3">${escapeHtml(book.description)}</p>
      </div>
    </div>
    <div class="flex items-center gap-3 mt-6 pt-1">
      <button class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-goldAccent text-[#161B22] text-[12.5px] font-bold shadow-md hover:bg-[#ffe196] transition-all transform active:scale-95" data-audio-stub="book-${book.id}" type="button"><span class="material-symbols-outlined text-[16px]">play_arrow</span><span>Listen Now</span></button>
      <a class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-transparent border border-[#3E4759] hover:border-[#67758F] text-[#ECEFF4] text-[12.5px] font-medium transition-all transform active:scale-95" href="#/reader?book=${book.id}"><span class="material-symbols-outlined text-[16px]">menu_book</span><span>Read Now</span></a>
      <div class="text-[#7A8394] ml-1">
        <svg class="w-4 h-4 rotate-45" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <rect height="14" rx="2" width="14" x="5" y="5"></rect>
        </svg>
      </div>
    </div>
  </div>
  <div class="relative shrink-0 flex items-center justify-center pr-2">
    <div class="absolute -top-3 -right-2 z-20 bg-gradient-to-r from-[#F0CA75] to-[#F8D88E] text-[#141822] text-[10.5px] font-bold uppercase tracking-wider py-1 px-4 rounded-md shadow-md">${book.trending ? 'Trending' : 'Featured'}</div>
    <div class="w-[145px] h-[205px] rounded-lg overflow-hidden book-shadow book-spine relative border border-[#496078]/30">
      ${window.NovelCastView.cover(book)}
    </div>
  </div>
</div>`;
  }

  function popularCard(book) {
    return `<div class="flex flex-col group cursor-pointer" data-book-link="${book.id}" data-book-target="details">
  <a href="#/book?book=${book.id}" class="block">
    <div class="relative w-full aspect-[1/1.42] rounded-xl overflow-hidden book-shadow book-spine bg-[#1B212E] border border-white/5 transition-transform duration-200 group-hover:-translate-y-1">
      <div class="absolute top-2 left-2 z-20 flex items-center gap-1 bg-[#1A212E]/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-white">
        <span class="text-goldAccent text-[9px]">★</span> ${book.rating.toFixed(1)}
      </div>
      <div class="absolute inset-0">${window.NovelCastView.cover(book)}</div>
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>
      <div class="absolute bottom-2 left-2 right-2 text-center text-[10px] font-serif tracking-widest text-[#FFECC7] uppercase pointer-events-none truncate">${escapeHtml(book.title)}</div>
    </div>
  </a>
  <div class="mt-2.5 flex flex-col">
    <a href="#/book?book=${book.id}" class="text-[12px] font-medium text-[#D6DCE7] hover:text-goldAccent transition-colors truncate">${escapeHtml(book.title)}</a>
    <div class="flex items-center justify-between text-[11px] text-[#768092] mt-0.5">
      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">visibility</span>${escapeHtml(book.listens)}</span>
      <button class="favorite-toggle text-[#768092] hover:text-goldAccent transition-colors" data-favorite-toggle="${book.id}" aria-label="Bookmark" type="button">
        <span class="material-symbols-outlined text-[16px]">bookmark_add</span>
      </button>
    </div>
  </div>
</div>`;
  }

  function libraryHeroCard(book) {
    const state = NC.loadState().library[book.id] || {};
    const status = state.status || 'saved';
    return `<article class="relative bg-surface-container-low/95 rounded-lg p-space-lg flex flex-col justify-between overflow-hidden shadow-xl group hover:shadow-[0_12px_40px_-8px_rgba(245,215,127,0.18)] transition-all">
      <div class="absolute -right-12 -top-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-0 right-8 bg-gradient-to-r from-primary-container to-surface-tint text-on-tertiary px-space-md py-1 rounded-b-DEFAULT font-label-caps text-label-caps uppercase tracking-wider shadow-md">${status === 'reading' ? 'Active Reading' : status === 'completed' ? 'Completed' : 'Saved'}</div>
      <div class="flex flex-col sm:flex-row gap-space-lg items-start relative z-10">
        <div class="flex-1 flex flex-col gap-space-xs">
          <div class="flex items-center gap-space-sm">
            <h3 class="font-headline-xl text-headline-xl text-primary font-bold tracking-wide">${escapeHtml(book.title)}</h3>
            <div class="flex items-center gap-1 bg-surface-container-lowest/80 px-space-xs py-0.5 rounded-full text-primary-container">
              <span class="material-symbols-outlined text-[14px]">star</span>
              <span class="font-label-numeric text-label-numeric">${book.rating.toFixed(1)}</span>
            </div>
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant">Written by : ${escapeHtml(book.author)}</p>
          <div class="flex flex-wrap items-center gap-space-md text-on-surface-variant mt-space-2xs">
            <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[15px] text-primary-container">visibility</span><span class="font-label-numeric text-label-numeric">${escapeHtml(book.listens)}</span></div>
            <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[15px] text-primary-container">schedule</span><span class="font-label-numeric text-label-numeric">${escapeHtml(book.duration)}</span></div>
            <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[15px] text-primary-container">format_list_numbered</span><span class="font-label-numeric text-label-numeric">${book.chapters} chapters</span></div>
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">${escapeHtml(book.description)}</p>
          <div class="mt-space-sm flex flex-col gap-1 w-full max-w-sm">
            <div class="flex justify-between text-[10px] text-on-surface-variant font-label-caps uppercase tracking-wider"><span>Progress</span><span>${Math.round(((state.chapter || 0) / Math.max(1, book.chaptersList.length - 1)) * 100)}%</span></div>
            <div class="relative w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 bg-primary-container rounded-full" style="width: ${Math.round(((state.chapter || 0) / Math.max(1, book.chaptersList.length - 1)) * 100)}%"></div>
            </div>
          </div>
          <div class="flex items-center gap-space-xs mt-space-md">
            <a class="inline-flex items-center gap-space-2xs px-space-md py-1.5 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm shadow-md hover:brightness-105" href="${bookHref('read-book.html', book.id)}">
              <span class="material-symbols-outlined text-[16px]">play_arrow</span><span>Resume</span>
            </a>
            <a class="inline-flex items-center gap-space-2xs px-space-md py-1.5 rounded-full bg-surface-container text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high" href="${bookHref('book-details.html', book.id)}">
              <span class="material-symbols-outlined text-[16px]">info</span><span>Details</span>
            </a>
          </div>
        </div>
        <div class="relative shrink-0 w-[140px] aspect-[2/3] rounded-lg overflow-hidden book-shadow book-spine bg-surface-container-highest border border-outline-variant/30">
          ${window.NovelCastView.cover(book)}
        </div>
      </div>
    </article>`;
  }

  function savedCard(book) {
    const state = NC.loadState().library[book.id] || {};
    return `<a class="flex flex-col group cursor-pointer" href="${bookHref('book-details.html', book.id)}" data-book-link="${book.id}" data-book-target="details">
      <div class="relative w-full aspect-[2/3] rounded-DEFAULT overflow-hidden bg-surface-container-low shadow-xl mb-space-sm transform transition-all duration-300 group-hover:-translate-y-1.5">
        <div class="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-surface-container-lowest/85 backdrop-blur-md px-2 py-0.5 rounded-full">
          <span class="material-symbols-outlined text-primary-container text-[14px]">star</span>
          <span class="font-label-numeric text-label-numeric text-primary">${book.rating.toFixed(1)}</span>
        </div>
        <div class="absolute inset-0">${window.NovelCastView.cover(book)}</div>
        <div class="absolute inset-0 bg-surface-container-lowest/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(245,215,127,0.5)]">
            <span class="material-symbols-outlined text-[24px]">play_arrow</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col">
        <h4 class="font-headline-sm text-headline-sm text-on-surface truncate group-hover:text-primary-container transition-colors">${escapeHtml(book.title)}</h4>
        <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${escapeHtml(book.author)}</p>
        <div class="flex items-center justify-between mt-1 text-outline">
          <div class="flex items-center gap-1 font-label-numeric text-[11px]"><span class="material-symbols-outlined text-[13px]">visibility</span><span>${escapeHtml(book.listens)}</span></div>
          <button class="favorite-toggle" data-favorite-toggle="${book.id}" aria-label="Toggle bookmark" type="button"><span class="material-symbols-outlined text-[16px]">${state.favorite ? 'bookmark' : 'bookmark_add'}</span></button>
        </div>
      </div>
    </a>`;
  }

  function searchHighlight(book) {
    return `<section class="w-full max-w-7xl mx-auto mb-space-2xl">
      <div class="relative w-full rounded-lg bg-surface-container-low shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden p-space-lg md:p-space-xl backdrop-blur-xl">
        <div class="absolute -right-16 -top-16 w-80 h-80 bg-primary-container/10 rounded-full blur-[70px] pointer-events-none"></div>
        <div class="absolute left-1/3 bottom-0 w-60 h-60 bg-secondary-container/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
          <div class="lg:col-span-8 flex flex-col justify-center">
            <div class="flex items-center gap-space-sm mb-space-xs">
              <span class="font-label-caps text-label-caps uppercase text-primary-container tracking-widest flex items-center gap-1">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span> Curator's Selection
              </span>
            </div>
            <div class="flex items-center gap-space-md flex-wrap mb-space-xs">
              <h1 class="font-headline-xl text-headline-xl text-primary font-bold tracking-wide">${escapeHtml(book.title)}</h1>
              <div class="flex items-center gap-1 bg-surface-container-lowest/80 px-space-sm py-0.5 rounded-full">
                <span class="material-symbols-outlined text-primary-container text-[16px]">star</span>
                <span class="font-label-numeric text-label-numeric text-primary font-bold">${book.rating.toFixed(1)}</span>
              </div>
              <span class="px-space-sm py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-badge text-label-badge shadow-[0_0_12px_rgba(245,215,127,0.3)]">Trending #${NC.books.indexOf(book) + 1}</span>
            </div>
            <p class="font-body-md text-body-md text-secondary mb-space-sm">Written by : <span class="text-on-surface font-medium">${escapeHtml(book.author)}</span> • Narrated by <span class="text-primary-container">${escapeHtml(book.narrator)}</span></p>
            <div class="flex items-center gap-space-lg mb-space-md text-on-surface-variant font-label-numeric text-label-numeric flex-wrap">
              <div class="flex items-center gap-space-2xs"><span class="material-symbols-outlined text-[16px] text-primary-container">visibility</span><span>${escapeHtml(book.listens)} listeners</span></div>
              <div class="flex items-center gap-space-2xs"><span class="material-symbols-outlined text-[16px] text-primary-container">schedule</span><span>${escapeHtml(book.duration)}</span></div>
              <div class="flex items-center gap-space-2xs"><span class="material-symbols-outlined text-[16px] text-primary-container">auto_stories</span><span>${book.chapters} chapters</span></div>
            </div>
            <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed mb-space-md">${escapeHtml(book.description)}</p>
            <div class="flex items-center gap-space-md flex-wrap">
              <button class="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-semibold" data-audio-stub="search-${book.id}" type="button"><span class="material-symbols-outlined text-[20px]">play_circle</span><span>Listen Now</span></button>
              <a class="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-surface-container text-primary-container font-headline-sm text-headline-sm font-semibold" href="${bookHref('read-book.html', book.id)}"><span class="material-symbols-outlined text-[20px]">menu_book</span><span>Read Now</span></a>
              <button class="w-11 h-11 rounded-full bg-surface-container text-secondary hover:text-primary-container flex items-center justify-center favorite-toggle" data-favorite-toggle="${book.id}" type="button" aria-label="Add to library"><span class="material-symbols-outlined text-[20px]">bookmark_add</span></button>
            </div>
          </div>
          <div class="lg:col-span-4 flex justify-center items-center relative">
            <a class="relative group cursor-pointer" href="${bookHref('book-details.html', book.id)}" data-book-link="${book.id}" data-book-target="details">
              <div class="absolute -inset-4 bg-gradient-to-tr from-primary-container/25 via-primary-container/10 to-transparent rounded-lg blur-2xl"></div>
              <div class="relative w-48 sm:w-56 h-72 sm:h-80 rounded-lg overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.8)] bg-surface-container-highest transform transition-transform duration-500 group-hover:scale-105">
                ${window.NovelCastView.cover(book)}
                <div class="absolute top-3 right-3 bg-surface-container-lowest/80 backdrop-blur-md px-space-xs py-0.5 rounded-full flex items-center gap-1">
                  <span class="material-symbols-outlined text-primary-container text-[14px]">headphones</span>
                  <span class="font-label-numeric text-[11px] text-primary">Demo audio</span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>`;
  }

  function genreCard(name, count, icon) {
    return `<a class="relative rounded-DEFAULT bg-surface-container-low p-space-lg overflow-hidden shadow-lg group cursor-pointer hover:bg-surface-container transition-all duration-300" href="search.html?q=${encodeURIComponent(name.toLowerCase().split(' ')[0])}">
      <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-primary-container/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
      <div class="relative z-10 flex flex-col justify-between h-36">
        <div class="flex items-start justify-between">
          <div class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-[24px]">${icon}</span>
          </div>
          <span class="font-label-numeric text-label-numeric text-secondary bg-surface-container-lowest/70 px-space-xs py-0.5 rounded-full">${count} titles</span>
        </div>
        <div>
          <h3 class="font-headline-md text-headline-md text-primary group-hover:text-primary-container transition-colors">${escapeHtml(name)}</h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant truncate">Curated ${name.toLowerCase()} selections</p>
        </div>
      </div>
    </a>`;
  }

  function detailHero(book) {
    return `<section class="relative rounded-lg bg-surface-container-low shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden p-space-lg sm:p-space-xl lg:p-space-2xl">
      <div class="absolute -top-12 -right-12 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 left-1/3 w-80 h-80 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
        <div class="lg:col-span-7 flex flex-col gap-space-md">
          <div class="flex flex-wrap items-center gap-space-sm">
            <h1 class="font-display-lg text-display-lg text-primary tracking-wide uppercase font-extrabold">${escapeHtml(book.title)}</h1>
            <div class="flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-highest">
              <span class="material-symbols-outlined text-primary-container text-[16px]">star</span>
              <span class="font-label-numeric text-label-numeric text-primary-container font-semibold">${(book.rating || 4.8).toFixed(1)}</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant">(${(book.reviews || 84).toLocaleString()})</span>
            </div>
            <span class="px-space-md py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps font-bold uppercase">${book.trending ? 'Trending #1' : 'Featured'}</span>
          </div>
          <p class="text-on-surface-variant">Written by: <span class="text-on-surface font-headline-sm ml-1">${escapeHtml(book.author)}</span></p>
          <p class="flex items-center gap-1.5 text-on-surface-variant font-body-sm"><span class="material-symbols-outlined text-[16px] text-primary-container">mic</span> Narrated by: <span class="text-on-surface font-medium">${escapeHtml(book.narrator)}</span></p>
          <div class="flex flex-wrap items-center gap-space-md text-on-surface-variant font-label-numeric py-space-xs">
            <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-secondary">visibility</span><span>${escapeHtml(book.listens)} listens</span></div>
            <span class="text-surface-variant">•</span>
            <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-secondary">schedule</span><span>${escapeHtml(book.duration)}</span></div>
            <span class="text-surface-variant">•</span>
            <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-secondary">menu_book</span><span>${book.chapters} chapters</span></div>
          </div>
          <div class="space-y-space-2xs">
            <span class="font-label-caps text-label-caps text-primary-container uppercase tracking-wider block">Description</span>
            <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">${escapeHtml(book.description)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-space-md pt-space-xs">
            <button class="flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm hover:scale-105 transition-transform shadow-[0_4px_24px_rgba(245,215,127,0.35)]" data-audio-stub="detail-${book.id}" type="button"><span class="material-symbols-outlined text-[20px]">play_arrow</span><span>Listen Now</span></button>
            <a class="flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded-full bg-surface-container-high text-primary-container font-headline-sm text-headline-sm hover:bg-surface-bright transition-all" href="#/reader?book=${book.id}"><span class="material-symbols-outlined text-[20px]">auto_stories</span><span>Read Now</span></a>
            <div class="flex items-center gap-space-xs ml-auto sm:ml-0">
              <button class="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant hover:text-primary-container flex items-center justify-center favorite-toggle" data-favorite-toggle="${book.id}" aria-label="Bookmark" type="button"><span class="material-symbols-outlined text-[20px]">bookmark_add</span></button>
              <button class="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant hover:text-primary-container flex items-center justify-center" data-audio-stub="detail-share-${book.id}" type="button" aria-label="Share"><span class="material-symbols-outlined text-[20px]">share</span></button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-5 flex justify-center lg:justify-end">
          <div class="relative group">
            <div class="absolute -inset-4 bg-primary-container/20 rounded-2xl blur-2xl"></div>
            <div class="relative w-64 sm:w-72 md:w-80 aspect-[2/3] rounded-DEFAULT overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.85)]">
              ${window.NovelCastView.cover(book)}
              <div class="absolute top-4 right-4 z-20 bg-primary-container text-on-primary-container font-label-badge uppercase font-extrabold px-space-sm py-1 rounded">Featured</div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function chapterList(book) {
    const list = book.chaptersList || [];
    const total = book.chapters || list.length || 1;
    return `<div class="flex items-center justify-between mb-space-md">
      <h3 class="font-headline-lg text-headline-lg text-primary">Chapter Index</h3>
      <span class="font-label-numeric text-label-numeric text-primary-container">${list.length} of ${total}</span>
    </div>
    <div class="space-y-space-2xs">${list.map((c, i) => `<a class="flex items-center justify-between p-space-md rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container transition-all" href="${bookHref('read-book.html', book.id, i)}" data-book-link="${book.id}" data-book-target="book"><div class="flex items-center gap-space-md"><span class="font-label-numeric text-label-numeric text-primary-container/70">${String(i + 1).padStart(2, '0')}</span><div><h4 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(c.title || 'Chapter ' + (i + 1))}</h4><span class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(c.theme || 'Sanctuary passage')}</span></div></div><span class="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span></a>`).join('')}</div>`;
  }

  function reviews(book) {
    const summaries = [
      { name: 'Maya S.', stars: 5, text: 'A gentle, deliberate guide that held my attention across long evening reads.' },
      { name: 'Andre P.', stars: 4, text: 'Original demo content but the pacing here is honest and the tone is steady.' },
      { name: 'Lin J.', stars: 5, text: 'Sample review text used only to demonstrate the layout and review list.' },
    ];
    return `<section class="lg:col-span-5 flex flex-col gap-space-xl">
      <h3 class="font-headline-md text-headline-md text-primary">Audience Reviews</h3>
      <div class="bg-surface-container-low rounded-lg p-space-lg">
        <div class="flex items-end gap-space-md">
          <span class="font-headline-lg text-headline-lg text-primary">${(book.rating || 4.8).toFixed(1)}</span>
          <div class="flex flex-col"><span class="font-label-numeric text-primary-container">${window.NovelCastView.stars(book.rating || 4.8)}</span><span class="font-body-sm text-on-surface-variant">${(book.reviews || 84).toLocaleString()} ratings</span></div>
        </div>
        <div class="mt-space-md grid grid-cols-2 gap-space-xs">
          <div class="flex items-center gap-2"><span class="text-primary-container font-label-numeric">5★</span><div class="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden"><div class="h-full bg-primary-container" style="width: 84%"></div></div><span class="font-label-numeric text-on-surface-variant">84%</span></div>
          <div class="flex items-center gap-2"><span class="text-primary-container font-label-numeric">4★</span><div class="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden"><div class="h-full bg-primary-container" style="width: 11%"></div></div><span class="font-label-numeric text-on-surface-variant">11%</span></div>
          <div class="flex items-center gap-2"><span class="text-primary-container font-label-numeric">3★</span><div class="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden"><div class="h-full bg-primary-container" style="width: 3%"></div></div><span class="font-label-numeric text-on-surface-variant">3%</span></div>
          <div class="flex items-center gap-2"><span class="text-primary-container font-label-numeric">2★</span><div class="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden"><div class="h-full bg-primary-container" style="width: 2%"></div></div><span class="font-label-numeric text-on-surface-variant">2%</span></div>
        </div>
        <ul class="mt-space-md space-y-space-sm">${summaries.map((r) => `<li class="flex flex-col gap-space-2xs border-t border-outline-variant/30 pt-space-sm"><div class="flex items-center justify-between"><span class="font-headline-sm text-headline-sm text-primary">${escapeHtml(r.name)}</span><span class="font-label-numeric text-primary-container">${window.NovelCastView.stars(r.stars)}</span></div><p class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(r.text)}</p></li>`).join('')}</ul>
      </div>
    </section>`;
  }

  function likeRow(book) {
    return `<section class="flex flex-col gap-space-md pt-space-md">
      <div class="flex items-center justify-between"><h3 class="font-headline-xl text-headline-xl text-primary font-bold">You Might Also Like</h3><a class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-container uppercase tracking-wider" href="search.html">View All</a></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-space-md">${NC.books.filter((b) => b.id !== book.id).slice(0, 5).map(popularCard).join('')}</div>
    </section>`;
  }

  window.NCPage = {
    featuredCard, popularCard, libraryHeroCard, savedCard, searchHighlight, genreCard, detailHero, chapterList, reviews, likeRow,
  };
})();