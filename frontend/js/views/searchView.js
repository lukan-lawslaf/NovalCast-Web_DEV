window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.search = {
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const initialQ = query.q || '';
    const featured = NC.books[0];

    const genres = [
      { name: 'Philosophy', desc: 'Inner wisdom & meaning of life', count: '12 books', icon: 'psychology' },
      { name: 'Memoir', desc: 'True personal human journeys', count: '8 books', icon: 'auto_stories' },
      { name: 'Classic Fiction', desc: 'Timeless literary masterpieces', count: '15 books', icon: 'menu_book' },
      { name: 'Self-Development', desc: 'Mindfulness & practical productivity', count: '19 books', icon: 'trending_up' },
      { name: 'Poetry', desc: 'Rhythmic, evocative lyricism', count: '6 books', icon: 'history_edu' },
      { name: 'Sci-Fi', desc: 'Futuristic worlds & technology', count: '11 books', icon: 'rocket_launch' }
    ];

    return `
      <!-- Search & Filter Header Section (Stitch Reference) -->
      <section class="relative w-full pt-2 pb-6 flex flex-col gap-space-lg">
        <!-- Ambient gold background glow behind search -->
        <div class="absolute -top-10 left-1/3 w-80 h-32 bg-primary-container/10 blur-[90px] pointer-events-none -z-10 rounded-full"></div>
        
        <!-- Search Input Bar -->
        <div class="flex flex-col md:flex-row items-center gap-space-md w-full max-w-5xl mx-auto">
          <div class="relative w-full flex items-center bg-surface-container-low/90 rounded-full px-space-lg py-space-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 focus-within:bg-surface-container group border border-outline-variant/30 focus-within:border-primary-container/60">
            <span class="material-symbols-outlined text-outline group-focus-within:text-primary-container text-[24px] mr-space-sm transition-colors">search</span>
            <input 
              class="bg-transparent border-none outline-none w-full text-on-surface placeholder:text-outline font-body-md text-body-md selection:bg-primary-container selection:text-on-primary-container" 
              id="search-input" 
              placeholder="Search by title, author, narrator, or genre..." 
              type="text"
              value="${NC.escapeHtml(initialQ)}"
            />
            <div class="flex items-center gap-space-xs text-on-surface-variant">
              <button id="search-clear" class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors hidden" title="Clear search" type="button">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
              <button class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors" title="Voice Search" type="button">
                <span class="material-symbols-outlined text-[18px]">mic</span>
              </button>
              <span class="hidden sm:inline-block px-space-xs py-0.5 rounded bg-surface-container-highest text-outline font-label-numeric text-[10px]">ESC</span>
            </div>
          </div>
        </div>

        <!-- Filter Pills Carousel -->
        <div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-space-2xs w-full max-w-5xl mx-auto px-space-2xs" id="search-chips">
          <button class="filter-chip px-space-md py-space-xs rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm shadow-[0_0_18px_rgba(245,215,127,0.3)] transition-all flex items-center gap-space-2xs whitespace-nowrap shrink-0" data-filter="all" type="button">
            <span>Trending Now</span>
            <span class="text-[11px] font-label-numeric">✦</span>
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="philosophy" type="button">
            Japanese Philosophy
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="memoir" type="button">
            Self-Discovery
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="classic" type="button">
            Bestsellers
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="fantasy" type="button">
            Fantasy & Lore
          </button>
        </div>
      </section>

      <!-- Live Search Results (hidden when empty) -->
      <section id="search-results-section" class="mb-10 max-w-6xl mx-auto ${initialQ ? '' : 'hidden'}">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[18px] font-bold text-[#F3DCA0]" id="results-count">Results</h3>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5" id="search-results-grid"></div>
      </section>

      <!-- Default Discovery View -->
      <div id="search-default-view" class="${initialQ ? 'hidden' : ''} max-w-6xl mx-auto">
        <!-- Featured Spotlight Card (Modeled after Stitch Search screen) -->
        ${featured ? `
          <section class="w-full mb-space-2xl">
            <div class="relative w-full rounded-lg bg-surface-container-low shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden p-space-lg md:p-space-xl backdrop-blur-xl border border-outline-variant/30">
              <div class="absolute -right-16 -top-16 w-80 h-80 bg-primary-container/10 rounded-full blur-[70px] pointer-events-none"></div>
              <div class="absolute left-1/3 bottom-0 w-60 h-60 bg-secondary-container/20 rounded-full blur-[80px] pointer-events-none"></div>
              <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                <!-- Left Editorial Synopsis Details -->
                <div class="lg:col-span-8 flex flex-col justify-center">
                  <div class="flex items-center gap-space-sm mb-space-xs">
                    <span class="font-label-caps text-label-caps uppercase text-primary-container tracking-widest flex items-center gap-1">
                      <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                      Curator's Nocturnal Highlight
                    </span>
                  </div>
                  <div class="flex items-center gap-space-md flex-wrap mb-space-xs">
                    <h1 class="font-headline-xl text-headline-xl text-primary font-bold tracking-wide">${NC.escapeHtml(featured.title)}</h1>
                    <div class="flex items-center gap-1 bg-surface-container-lowest/80 px-space-sm py-0.5 rounded-full shadow-inner">
                      <span class="material-symbols-outlined text-primary-container text-[16px]">star</span>
                      <span class="font-label-numeric text-label-numeric text-primary font-bold">${featured.rating.toFixed(1)}</span>
                    </div>
                    <span class="px-space-sm py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-badge text-label-badge shadow-[0_0_12px_rgba(245,215,127,0.3)]">Trending #1</span>
                  </div>
                  <p class="font-body-md text-body-md text-secondary mb-space-sm">
                    Written by : <span class="text-on-surface font-medium">${NC.escapeHtml(featured.author)}</span> • Narrated by <span class="text-primary-container">${NC.escapeHtml(featured.narrator || 'Kenji Takahashi')}</span>
                  </p>
                  <div class="flex items-center gap-space-lg mb-space-md text-on-surface-variant font-label-numeric text-label-numeric flex-wrap">
                    <div class="flex items-center gap-space-2xs">
                      <span class="material-symbols-outlined text-[16px] text-primary-container">visibility</span>
                      <span>${NC.escapeHtml(featured.listens)} listeners</span>
                    </div>
                    <div class="flex items-center gap-space-2xs">
                      <span class="material-symbols-outlined text-[16px] text-primary-container">schedule</span>
                      <span>${NC.escapeHtml(featured.duration)}</span>
                    </div>
                    <div class="flex items-center gap-space-2xs">
                      <span class="material-symbols-outlined text-[16px] text-primary-container">auto_stories</span>
                      <span>${featured.chapters} chapters</span>
                    </div>
                  </div>
                  <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed mb-space-md">
                    ${NC.escapeHtml(featured.description)}
                  </p>
                  <div class="flex items-center gap-space-md flex-wrap">
                    <button class="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-primary-container text-on-primary-container hover:brightness-110 font-headline-sm text-headline-sm font-semibold shadow-[0_0_24px_rgba(245,215,127,0.35)] transition-all transform hover:-translate-y-0.5" data-audio-stub="book-${featured.id}" type="button">
                      <span class="material-symbols-outlined text-[20px]">play_circle</span>
                      <span>Listen Now</span>
                    </button>
                    <a class="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-surface-container text-primary-container hover:bg-surface-container-high font-headline-sm text-headline-sm font-semibold transition-all shadow-md" href="#/reader?book=${featured.id}">
                      <span class="material-symbols-outlined text-[20px]">menu_book</span>
                      <span>Read Now</span>
                    </a>
                  </div>
                </div>
                <!-- Right 3D Book Cover -->
                <div class="lg:col-span-4 flex justify-center items-center relative">
                  <a class="relative group cursor-pointer" href="#/book?book=${featured.id}">
                    <div class="absolute -inset-4 bg-gradient-to-tr from-primary-container/25 via-primary-container/10 to-transparent rounded-lg blur-2xl"></div>
                    <div class="relative w-48 sm:w-56 h-72 sm:h-80 rounded-lg overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.8)] bg-surface-container-highest transform transition-transform duration-500 group-hover:scale-105 border border-outline-variant/30">
                      ${window.NovelCastView.cover(featured)}
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </section>
        ` : ''}

        <!-- Browse by Genre Grid -->
        <section class="mb-12">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary-container text-[22px]">category</span>
              <h3 class="text-[19px] font-bold tracking-wide text-primary">Browse by Genre</h3>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${genres.map(g => `
              <div class="genre-card relative p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 hover:border-primary-container/50 transition-all duration-300 hover:-translate-y-1 shadow-xl cursor-pointer group" data-genre-search="${g.name}">
                <div class="flex items-start justify-between">
                  <div>
                    <span class="text-[11px] uppercase tracking-wider text-primary-container font-bold">${g.count}</span>
                    <h4 class="text-xl font-bold text-on-surface mt-1 group-hover:text-primary-container transition-colors">${g.name}</h4>
                    <p class="text-[13px] text-on-surface-variant mt-1.5">${g.desc}</p>
                  </div>
                  <span class="material-symbols-outlined text-primary-container text-[32px] group-hover:scale-110 transition-transform">${g.icon}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- All Books Catalog Grid -->
        <section class="mb-12">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary-container text-[22px]">auto_stories</span>
              <h3 class="text-[19px] font-bold tracking-wide text-primary">All Books Catalog</h3>
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            ${NC.books.map(b => NCPage.popularCard(b)).join('')}
          </div>
        </section>
      </div>
    `;
  },
  init: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    const resultsSection = document.getElementById('search-results-section');
    const resultsGrid = document.getElementById('search-results-grid');
    const resultsCount = document.getElementById('results-count');
    const defaultView = document.getElementById('search-default-view');
    const chips = document.querySelectorAll('#search-chips .filter-chip');

    function performSearch(q, filterType = 'all') {
      const term = (q || '').trim().toLowerCase();
      let matched = NC.books;

      if (filterType !== 'all') {
        if (filterType === 'trending') {
          matched = matched.filter(b => b.trending);
        } else {
          matched = matched.filter(b => (b.genre || '').toLowerCase().includes(filterType) || (b.tags || []).some(t => t.includes(filterType)));
        }
      }

      if (term) {
        matched = matched.filter(b => 
          b.title.toLowerCase().includes(term) ||
          b.author.toLowerCase().includes(term) ||
          (b.narrator && b.narrator.toLowerCase().includes(term)) ||
          b.genre.toLowerCase().includes(term) ||
          (b.description && b.description.toLowerCase().includes(term))
        );
      }

      if (term || filterType !== 'all') {
        resultsSection.classList.remove('hidden');
        defaultView.classList.add('hidden');
        resultsCount.textContent = `${matched.length} Book${matched.length === 1 ? '' : 's'} Found`;
        resultsGrid.innerHTML = matched.length ? matched.map(b => NCPage.popularCard(b)).join('') : `
          <div class="col-span-full py-16 text-center text-[#7F8B9C]">
            <span class="material-symbols-outlined text-[48px] text-[#4A5568] mb-2 block">search_off</span>
            <p class="text-base font-medium text-white">No titles found for "${NC.escapeHtml(term)}"</p>
            <p class="text-xs mt-1">Try searching for "Philosophy", "Ikigai", or "Fiction"</p>
          </div>
        `;
        if (clearBtn) clearBtn.classList.remove('hidden');
      } else {
        resultsSection.classList.add('hidden');
        defaultView.classList.remove('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
      }

      if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
        window.NovelCastApp.bindInteractiveElements();
      }
    }

    if (input) {
      input.addEventListener('input', () => performSearch(input.value));
      if (input.value) performSearch(input.value);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        performSearch('');
        input.focus();
      });
    }

    chips.forEach(btn => {
      btn.addEventListener('click', () => {
        chips.forEach(c => {
          c.classList.remove('bg-goldAccent', 'text-[#121620]', 'font-bold');
          c.classList.add('bg-[#161C26]', 'text-[#A6B2C3]', 'font-medium');
        });
        btn.classList.add('bg-goldAccent', 'text-[#121620]', 'font-bold');
        btn.classList.remove('bg-[#161C26]', 'text-[#A6B2C3]', 'font-medium');
        performSearch(input ? input.value : '', btn.dataset.filter);
      });
    });

    document.querySelectorAll('[data-genre-search]').forEach(card => {
      card.addEventListener('click', () => {
        const genre = card.dataset.genreSearch;
        if (input) {
          input.value = genre;
          performSearch(genre);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }
};
