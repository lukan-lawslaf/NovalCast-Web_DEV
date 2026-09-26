window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.search = {
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const initialQ = query.q || '';
    const initialGenre = query.genre || '';
    const featured = NC.books.find(b => b.trending) || NC.books[0];

    const genreCards = [
      { name: 'Adventure & Sea', search: 'Adventure', desc: 'Voyages across open seas & uncharted continents', count: '3 classics', icon: 'sailing' },
      { name: 'Science Fiction', search: 'Science Fiction', desc: 'Extraterrestrial invasions & time travel', count: '3 classics', icon: 'rocket_launch' },
      { name: 'Gothic & Horror', search: 'Gothic', desc: 'Nocturnal castles, monsters & spectral dread', count: '3 classics', icon: 'castle' },
      { name: 'Classic Detective', search: 'Detective', desc: 'Analytical deduction & unsolved London crimes', count: '3 classics', icon: 'search' },
      { name: 'Romance & Drama', search: 'Romance', desc: 'Passionate devotion & societal conflicts', count: '3 classics', icon: 'favorite' },
      { name: 'Literary & Psychological', search: 'Psychological', desc: 'Human soul, conscience & existential shifts', count: '3 classics', icon: 'psychology' }
    ];

    const hasInitialSearch = Boolean(initialQ || initialGenre);

    return `
      <!-- Search & Filter Header Section -->
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
              placeholder="Search by title, author, genre, or keyword..." 
              type="text"
              value="${NC.escapeHtml(initialQ || initialGenre)}"
            />
            <div class="flex items-center gap-space-xs text-on-surface-variant">
              <button id="search-clear" class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors ${hasInitialSearch ? '' : 'hidden'}" title="Clear search" type="button">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
              <button class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors" title="Voice Search" type="button" onclick="window.NovelCast.toast('Voice search active — speak your book title')">
                <span class="material-symbols-outlined text-[18px]">mic</span>
              </button>
              <span class="hidden sm:inline-block px-space-xs py-0.5 rounded bg-surface-container-highest text-outline font-label-numeric text-[10px]">ESC</span>
            </div>
          </div>
        </div>

        <!-- Filter Pills Carousel -->
        <div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-space-2xs w-full max-w-5xl mx-auto px-space-2xs" id="search-chips">
          <button class="filter-chip px-space-md py-space-xs rounded-full ${(!initialGenre || initialGenre === 'all') ? 'bg-primary-container text-on-primary-container shadow-[0_0_18px_rgba(245,215,127,0.3)]' : 'bg-surface-container-low text-on-surface-variant'} font-headline-sm text-headline-sm transition-all flex items-center gap-space-2xs whitespace-nowrap shrink-0" data-filter="all" type="button">
            <span>All 20 Classics</span>
            <span class="text-[11px] font-label-numeric">✦</span>
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full ${initialGenre === 'Gothic' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'} hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="Gothic" type="button">
            Gothic & Horror
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full ${initialGenre === 'Science Fiction' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'} hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="Science Fiction" type="button">
            Science Fiction
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full ${initialGenre === 'Adventure' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'} hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="Adventure" type="button">
            Adventure & Sea
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full ${initialGenre === 'Detective' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'} hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="Detective" type="button">
            Classic Detective
          </button>
          <button class="filter-chip px-space-md py-space-xs rounded-full ${initialGenre === 'Romance' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'} hover:text-primary hover:bg-surface-container-high font-headline-sm text-headline-sm transition-all whitespace-nowrap shrink-0" data-filter="Romance" type="button">
            Romance & Drama
          </button>
        </div>
      </section>

      <!-- Live Search Results (hidden when empty) -->
      <section id="search-results-section" class="mb-10 max-w-6xl mx-auto ${hasInitialSearch ? '' : 'hidden'}">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container text-[20px]">filter_list</span>
            <h3 class="text-[18px] font-bold text-[#F1D69E]" id="results-count">Results</h3>
          </div>
          <span class="text-xs font-mono text-[#8C98AC]" id="search-origin-badge">MongoDB Atlas Search</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5" id="search-results-grid"></div>
      </section>

      <!-- Default Discovery View -->
      <div id="search-default-view" class="${hasInitialSearch ? 'hidden' : ''} max-w-6xl mx-auto">
        <!-- Featured Spotlight Card -->
        ${featured ? `
          <section class="w-full mb-space-2xl">
            <div class="relative w-full rounded-2xl bg-surface-container-low shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden p-space-lg md:p-space-xl backdrop-blur-xl border border-outline-variant/30">
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
                    <span class="px-space-sm py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-badge text-label-badge shadow-[0_0_12px_rgba(245,215,127,0.3)]">Curated Masterpiece</span>
                  </div>
                  <p class="font-body-md text-body-md text-secondary mb-space-sm">
                    Written by : <span class="text-on-surface font-medium">${NC.escapeHtml(featured.author)}</span> • Narrated by <span class="text-primary-container">${NC.escapeHtml(featured.narrator)}</span>
                  </p>
                  <div class="flex items-center gap-space-lg mb-space-md text-on-surface-variant font-label-numeric text-label-numeric flex-wrap">
                    <div class="flex items-center gap-space-2xs">
                      <span class="material-symbols-outlined text-[16px] text-primary-container">visibility</span>
                      <span>${NC.escapeHtml(featured.listens)} readers</span>
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
                    <a class="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-surface-container text-primary-container hover:bg-surface-container-high font-headline-sm text-headline-sm font-semibold transition-all shadow-md" href="#/reader?book=${featured.id}&chapter=1">
                      <span class="material-symbols-outlined text-[20px]">menu_book</span>
                      <span>Read Chapter 1</span>
                    </a>
                  </div>
                </div>
                <!-- Right 3D Book Cover -->
                <div class="lg:col-span-4 flex justify-center items-center relative">
                  <a class="relative group cursor-pointer" href="#/book?book=${featured.id}">
                    <div class="absolute -inset-4 bg-gradient-to-tr from-primary-container/25 via-primary-container/10 to-transparent rounded-lg blur-2xl"></div>
                    <div class="relative w-48 sm:w-56 h-72 sm:h-80 rounded-xl overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.8)] bg-surface-container-highest transform transition-transform duration-500 group-hover:scale-105 border border-outline-variant/30">
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
              <h3 class="text-[19px] font-bold tracking-wide text-primary">Browse Curated Genres</h3>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${genreCards.map(g => `
              <div class="genre-card relative p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 hover:border-primary-container/50 transition-all duration-300 hover:-translate-y-1 shadow-xl cursor-pointer group" data-genre-search="${g.search}">
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
              <h3 class="text-[19px] font-bold tracking-wide text-primary">Complete Shelf (${NC.books.length} Novels)</h3>
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

    let currentFilter = 'all';
    let searchDebounceTimer = null;

    async function performSearch(q, filterType = currentFilter) {
      const term = (q || '').trim();
      currentFilter = filterType;

      if (!term && (filterType === 'all' || !filterType)) {
        if (resultsSection) resultsSection.classList.add('hidden');
        if (defaultView) defaultView.classList.remove('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
        return;
      }

      if (resultsSection) resultsSection.classList.remove('hidden');
      if (defaultView) defaultView.classList.add('hidden');
      if (clearBtn) clearBtn.classList.remove('hidden');

      // 1. Immediate local match for zero perceived latency
      let matched = NC.books;
      if (filterType && filterType !== 'all') {
        const ft = filterType.toLowerCase();
        matched = matched.filter(b => (b.genre || '').toLowerCase().includes(ft) || (b.tags || []).some(t => t.toLowerCase().includes(ft)));
      }
      if (term) {
        const lt = term.toLowerCase();
        matched = matched.filter(b =>
          b.title.toLowerCase().includes(lt) ||
          b.author.toLowerCase().includes(lt) ||
          b.genre.toLowerCase().includes(lt) ||
          (b.description && b.description.toLowerCase().includes(lt))
        );
      }

      renderResults(matched, term);

      // 2. Asynchronously query backend search for full-text MongoDB match
      try {
        const backendResults = await NC.searchCatalog(term, filterType === 'all' ? '' : filterType);
        if (backendResults && backendResults.length > 0) {
          renderResults(backendResults, term);
        }
      } catch (e) {
        // Fallback already rendered
      }
    }

    function renderResults(list, term) {
      if (!resultsGrid || !resultsCount) return;
      resultsCount.textContent = `${list.length} Book${list.length === 1 ? '' : 's'} Found`;
      resultsGrid.innerHTML = list.length
        ? list.map(b => NCPage.popularCard(b)).join('')
        : `
          <div class="col-span-full py-16 text-center text-[#7F8B9C]">
            <span class="material-symbols-outlined text-[48px] text-[#4A5568] mb-2 block">search_off</span>
            <p class="text-base font-medium text-white">No titles found for "${NC.escapeHtml(term)}"</p>
            <p class="text-xs mt-1">Try searching for "Moby Dick", "Dracula", "Gothic", or "Verne"</p>
          </div>
        `;

      if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
        window.NovelCastApp.bindInteractiveElements(resultsGrid);
      }
    }

    if (input) {
      input.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          performSearch(input.value);
        }, 180);
      });
      // Handle initial search from URL
      const query = NC.readQuery();
      const initialTerm = query.q || query.genre || '';
      if (initialTerm) {
        performSearch(initialTerm, query.genre || 'all');
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) input.value = '';
        currentFilter = 'all';
        chips.forEach(c => {
          c.classList.remove('bg-primary-container', 'text-on-primary-container');
          c.classList.add('bg-surface-container-low', 'text-on-surface-variant');
        });
        const allChip = document.querySelector('#search-chips [data-filter="all"]');
        if (allChip) {
          allChip.classList.add('bg-primary-container', 'text-on-primary-container');
          allChip.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
        }
        performSearch('');
        if (input) input.focus();
      });
    }

    chips.forEach(btn => {
      btn.addEventListener('click', () => {
        chips.forEach(c => {
          c.classList.remove('bg-primary-container', 'text-on-primary-container', 'shadow-[0_0_18px_rgba(245,215,127,0.3)]');
          c.classList.add('bg-surface-container-low', 'text-on-surface-variant');
        });
        btn.classList.add('bg-primary-container', 'text-on-primary-container', 'shadow-[0_0_18px_rgba(245,215,127,0.3)]');
        btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
        if (input) input.value = '';
        performSearch('', btn.dataset.filter);
      });
    });

    document.querySelectorAll('[data-genre-search]').forEach(card => {
      card.addEventListener('click', () => {
        const genre = card.dataset.genreSearch;
        if (input) {
          input.value = genre;
          performSearch(genre, genre);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }
};
