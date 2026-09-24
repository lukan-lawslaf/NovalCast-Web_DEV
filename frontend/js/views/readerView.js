window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.reader = {
  render: function () {
    const NC = window.NovelCast;
    const query = NC.readQuery();
    const bookId = query.book || 'ikigai';
    const book = NC.getBook(bookId) || NC.books[0];
    const chapterIdx = query.chapter || 0;
    const currentChapter = (book.chaptersList && book.chaptersList[chapterIdx]) || {
      title: 'The Flow State & Takumi Artisans',
      theme: 'Purpose & Flow',
      paragraphs: []
    };

    return `
      <!-- Reader Container -->
      <div class="max-w-7xl mx-auto pb-16">
        <!-- Top Reader Control Bar -->
        <div class="w-full mb-4 px-4 py-3 bg-[#11151E] border border-[#222B3A] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div class="flex items-center gap-3">
            <a href="#/book?book=${book.id}" class="w-8 h-8 rounded-full bg-[#1A212E] hover:bg-[#252F42] text-white flex items-center justify-center transition-colors">
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            </a>
            <div>
              <h2 class="text-[14px] font-bold text-white truncate max-w-xs sm:max-w-md">${NC.escapeHtml(book.title)}</h2>
              <p class="text-[11px] text-[#8E99A8]">${NC.escapeHtml(book.author)} &bull; Chapter ${chapterIdx + 1}</p>
            </div>
          </div>

            <!-- Controls: Font Size, Mode (Book vs PDF) -->
            <div class="flex items-center gap-3 sm:gap-4 text-[12px]">
              <div class="flex items-center gap-2 bg-[#181E2B] px-3 py-1.5 rounded-full border border-[#263143]">
                <span class="text-[#7A8699] text-[11px] font-semibold uppercase tracking-wider">Size</span>
                <button id="font-decrease" class="text-white hover:text-goldAccent px-1 text-sm font-bold cursor-pointer">-</button>
                <span id="font-size-label" class="text-goldAccent font-mono text-xs">18px</span>
                <button id="font-increase" class="text-white hover:text-goldAccent px-1 text-sm font-bold cursor-pointer">+</button>
              </div>

              <!-- Book vs PDF Mode Switcher -->
              <div class="flex items-center gap-1.5 bg-[#181E2B] p-1 rounded-full border border-[#263143]" id="reader-mode-toggle">
                <button id="btn-mode-book" class="reader-mode-btn px-3.5 py-1 rounded-full text-xs font-semibold bg-[#110D0A] text-[#E0D5C1] shadow cursor-pointer transition-all flex items-center gap-1.5" data-mode="book">
                  <span class="material-symbols-outlined text-[15px]">menu_book</span>
                  <span>Book</span>
                </button>
                <button id="btn-mode-pdf" class="reader-mode-btn px-3.5 py-1 rounded-full text-xs font-medium text-[#7A8699] hover:text-white cursor-pointer transition-all flex items-center gap-1.5" data-mode="pdf">
                  <span class="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                  <span>PDF</span>
                </button>
              </div>

              <button onclick="window.NovelCastApp.toggleAudio('book-${book.id}')" class="px-3.5 py-1.5 rounded-full bg-goldAccent text-[#121620] font-bold text-xs shadow hover:bg-[#ffe196] flex items-center gap-1 transition-all cursor-pointer">
                <span class="material-symbols-outlined text-[15px]">headphones</span>
                <span>Listen</span>
              </button>
            </div>
          </div>

          <!-- Aural Sync Floating Ribbon -->
          <div class="w-full mb-4 px-4 py-2.5 bg-gradient-to-r from-[#171D28] via-[#1A212E] to-[#171D28] rounded-xl flex items-center justify-between gap-4 shadow-md border border-goldAccent/20">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="flex h-2.5 w-2.5 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-goldAccent opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-goldAccent"></span>
              </span>
              <span class="text-[11px] font-bold text-goldAccent uppercase tracking-wider">Aural Sync</span>
              <span class="text-[#4E5B70]">•</span>
              <p class="text-[12px] text-[#A6B2C3] truncate">
                Narrated by <strong class="text-white">${NC.escapeHtml(book.narrator || 'Kenji Takahashi')}</strong> &bull; Auto-tracking active
              </p>
            </div>
            <button class="text-goldAccent hover:text-white text-[12px] font-medium flex items-center gap-1 shrink-0 cursor-pointer" onclick="window.NovelCastApp.toggleAudio('book-${book.id}')">
              <span class="material-symbols-outlined text-[16px]">play_circle</span>
              <span>Play Track</span>
            </button>
          </div>

          <!-- Real Skeuomorphic Book Spread (Book Mode) -->
          <div class="relative w-full flex justify-center items-center py-2" id="reader-book-container">
            <div class="relative w-full rounded-[22px] p-2 sm:p-3 bg-[#130f0c] shadow-[0_35px_90px_rgba(0,0,0,0.95),0_15px_35px_rgba(0,0,0,0.85)] border border-[#2b221a]">
              <!-- Red Ribbon Bookmark -->
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-36 z-40 pointer-events-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
                <div class="w-full h-full bg-gradient-to-b from-[#8f2824] via-[#b23732] to-[#c9453f] rounded-b-[4px] relative shadow-md">
                  <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-yellow-200/40"></div>
                  <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[9px] border-t-[#c9453f]"></div>
                </div>
              </div>

              <!-- Double Page Spread -->
              <div class="relative w-full rounded-[14px] bg-[#faf6ee] text-[#221f1c] shadow-[inset_0_0_90px_rgba(189,173,142,0.38)] overflow-hidden border border-[#eae0cc]" id="book-spread">
                <div class="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-24 z-30 pointer-events-none bg-gradient-to-r from-transparent via-black/20 to-transparent"></div>
                <div class="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] z-30 pointer-events-none bg-[#1d1712]/35 shadow-[0_0_10px_rgba(0,0,0,0.6)]"></div>

                <div class="grid grid-cols-1 lg:grid-cols-2 relative z-10">
                  <!-- Left Page -->
                  <article class="p-6 md:p-10 lg:p-12 lg:pr-14 bg-gradient-to-r from-[#f5eee0] via-[#fbf7ee] to-[#e8dec7] border-b lg:border-b-0 lg:border-r border-[#e2d5bd]/60 shadow-[inset_12px_0_24px_rgba(255,255,255,0.4)] flex flex-col justify-between min-h-[560px]">
                    <header class="flex items-center justify-between pb-3 border-b border-[#221f1c]/10 text-[11px] uppercase tracking-widest text-[#6b6255] font-semibold">
                      <span>${NC.escapeHtml(book.title)}</span>
                      <span>Chapter ${chapterIdx + 1}</span>
                    </header>

                    <div class="my-auto py-4 space-y-4 reader-content font-serif text-[17px] leading-[1.7] text-[#2b2620]">
                      <h1 class="text-[28px] md:text-[32px] font-serif italic text-[#1a1714] leading-tight">
                        ${NC.escapeHtml(currentChapter.title)}
                      </h1>
                      <blockquote class="pl-4 border-l-2 border-[#bfa054] italic text-[16px] text-[#3c342b]">
                        “Only staying active will make you want to live a hundred years.”
                      </blockquote>
                      <p class="text-justify">
                        <span class="float-left text-[48px] leading-[0.8] pr-2.5 pt-1 font-serif italic text-[#8f2824]">G</span>oing with the flow means immersing yourself completely in an activity, losing all sense of time, self-doubt, and the clutter of mundane existence. In Tokyo and Kyoto, master craftsmen known as <em class="italic">Takumi</em> spend seventy years polishing camera lenses, hand-shaping iron tea kettles, or selecting bamboo strips for archery bows.
                      </p>
                      <p class="text-justify">
                        They do not seek rapid commercial scalability; they pursue an intimacy with materials. Psychologist Mihaly Csikszentmihalyi defined this state of effortless absorption as <span class="font-semibold underline decoration-[#dfc588]">optimal experience</span>.
                      </p>
                    </div>

                    <footer class="flex items-center justify-between pt-3 border-t border-[#221f1c]/10 text-[11px] text-[#857b6a]">
                      <span>${NC.escapeHtml(book.author)}</span>
                      <span class="font-bold">Page 1</span>
                    </footer>
                  </article>

                  <!-- Right Page -->
                  <article class="p-6 md:p-10 lg:p-12 lg:pl-14 bg-gradient-to-r from-[#e8dec7] via-[#fbf7ee] to-[#f5eee0] shadow-[inset_-12px_0_24px_rgba(255,255,255,0.4)] flex flex-col justify-between min-h-[560px]">
                    <header class="flex items-center justify-between pb-3 border-b border-[#221f1c]/10 text-[11px] uppercase tracking-widest text-[#6b6255] font-semibold">
                      <span>${NC.escapeHtml(currentChapter.theme || 'Reflections')}</span>
                      <span class="text-goldAccent">★ 4.8</span>
                    </header>

                    <div class="my-auto py-4 space-y-4 reader-content font-serif text-[17px] leading-[1.7] text-[#2b2620]">
                      <div class="p-4 rounded-lg bg-[#f5eddb]/80 border-l-4 border-[#c98e28] shadow-sm">
                        <p class="italic text-[15px] text-[#241e17]">
                          “The moment an artisan finishes a masterpiece, they do not celebrate the conclusion; they greet the clean workbench ready for tomorrow's dawn.”
                        </p>
                        <span class="text-[10px] uppercase tracking-wider text-[#85631c] block mt-1.5 font-sans font-bold">2,840 readers highlighted this</span>
                      </div>

                      <p class="text-justify">
                        When asked what fuels their longevity, the centenarians of the Yanbaru forest hills rarely mention dietary supplements or rigorous athletic discipline. Rather, they speak of an omnipresent <em class="font-semibold">yui-maru</em>—a spirit of communal assistance—and their daily morning raison d’être.
                      </p>
                      <p class="text-justify">
                        At the golden convergence where passion, mission, vocation, and profession overlap lies your center of gravity.
                      </p>
                    </div>

                    <footer class="flex items-center justify-between pt-3 border-t border-[#221f1c]/10 text-[11px] text-[#857b6a]">
                      <span>Chapter 4 of ${book.chapters}</span>
                      <span class="font-bold">Page 2</span>
                    </footer>
                  </article>
                </div>
              </div>
            </div>
          </div>

          <!-- Page Turn Navigation (Book Mode) -->
          <div class="flex items-center justify-between mt-6 px-4" id="reader-page-turn-nav">
            <button class="px-5 py-2 rounded-full bg-[#161C26] hover:bg-[#1E2634] text-white border border-[#252E3E] text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer" id="reader-prev-btn">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Previous Chapter</span>
            </button>
            <div class="flex items-center gap-2 text-xs text-[#8E99A8]">
              <span>Chapter ${chapterIdx + 1} of ${book.chapters}</span>
            </div>
            <button class="px-5 py-2 rounded-full bg-[#161C26] hover:bg-[#1E2634] text-white border border-[#252E3E] text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer" id="reader-next-btn">
              <span>Next Chapter</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          <!-- Continuous Vertical Scroll Layout (PDF Mode - Exactly matching reference) -->
          <div class="relative w-full max-w-6xl mx-auto rounded-2xl bg-[#0B0E14] shadow-[0_24px_64px_rgba(0,0,0,0.85)] border border-[#1F2735] overflow-hidden flex flex-col hidden" id="reader-pdf-container">
            <!-- Atmospheric gold & navy glows -->
            <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-3/4 h-56 bg-goldAccent/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
            <div class="absolute -bottom-24 left-1/4 w-80 h-80 bg-[#151B26]/40 rounded-full blur-[80px] pointer-events-none -z-10"></div>

            <!-- Top Container Header Bar -->
            <div class="w-full flex items-center justify-between px-6 py-2.5 bg-[#10151F]/90 backdrop-blur-md border-b border-[#1F2735] z-20 text-[11px]">
              <div class="flex items-center gap-2 text-goldAccent font-semibold uppercase tracking-widest text-[11px]">
                <span class="material-symbols-outlined text-[16px]">unfold_more</span>
                <span>CONTINUOUS SCROLL MODE</span>
                <span class="text-[#7E8B9C] font-normal">• Page 84-86 of 248</span>
              </div>
              <div class="flex items-center gap-3 text-[#8E99A8] font-mono text-[11px]">
                <span class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[14px] text-goldAccent">schedule</span>
                  <span>1 hr 12m left</span>
                </span>
                <span class="text-[#2F3A4C]">•</span>
                <span class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[14px] text-goldAccent">speed</span>
                  <span>240 WPM pace</span>
                </span>
                <span class="text-[#2F3A4C]">•</span>
                <span class="text-goldAccent font-bold font-sans" id="pdf-scroll-percent">34% Complete</span>
              </div>
            </div>

            <!-- Scrollable Canvas -->
            <div class="w-full overflow-y-auto max-h-[62vh] px-6 py-8 md:px-12 md:py-10 space-y-6" id="book-scroll-canvas" style="scroll-behavior: smooth;">
              <div class="max-w-2xl mx-auto py-4 px-2 text-[#CBD5E1]">
                <header class="mb-8 text-center border-b border-[#1F2735] pb-6">
                  <span class="text-[10px] uppercase tracking-[0.25em] text-goldAccent font-semibold block mb-2">
                    VOLUME VIII · CHAPTER 2337
                  </span>
                  <h1 class="font-serif text-[28px] md:text-[34px] text-white tracking-tight leading-snug">
                    Actionable Strategy
                  </h1>
                </header>

                <div class="space-y-5 font-serif text-[16px] md:text-[17px] leading-[1.8] text-[#CBD5E1]/95 text-justify reader-content">
                  <p>
                    The sun was rolling toward the horizon, so Sunny and his companions left the dark interior of the Ash Castle and scaled the slopes of the caldera once again. The pillar of smoke rising into the sky gave birth to billowing black clouds, and flakes of ash were falling down like snow.
                  </p>
                  <p>
                    The last volcano surrounded by snow-covered mountains from all sides, and their pristine white peaks loomed oppressively in the distance. The wind howled softly across the frozen crater rims, carrying with it the faint scent of sulfur and ancient frost.
                  </p>
                  <p>
                    Nephis stood by the edge of the obsidian ridge, her silver hair fluttering in the gale. She looked out toward the endless expanse of jagged peaks, her calm eyes tracking the shifting shadows cast by the setting sun.
                  </p>
                  <p>
                    "We don't have much light left," she said quietly, her voice cutting through the cold air. "If we are to cross the crest before twilight breaks, we must hasten our pace."
                  </p>
                  <p>
                    Sunny tightened the clasp of his mantle, feeling the familiar resonance of shadows whispering beneath the ice. Every journey through the ash-ridden slopes tested endurance, but the path ahead was clear, and their resolve was unshaken.
                  </p>
                </div>

                <nav class="flex items-center justify-between pt-8 mt-8 border-t border-[#1F2735] text-xs text-[#8E99A8]">
                  <button class="flex items-center gap-1.5 text-[#8E99A8] hover:text-goldAccent transition-colors py-1.5 px-3 rounded-lg hover:bg-[#151B26] cursor-pointer" id="pdf-prev-btn">
                    <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>Previous Chapter</span>
                  </button>
                  <span class="font-mono text-[#64748B]">2337 of 2500</span>
                  <button class="flex items-center gap-1.5 text-[#8E99A8] hover:text-goldAccent transition-colors py-1.5 px-3 rounded-lg hover:bg-[#151B26] cursor-pointer" id="pdf-next-btn">
                    <span>Next Chapter</span>
                    <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </nav>
              </div>
            </div>

            <!-- Bottom Container Bar -->
            <div class="w-full flex items-center justify-between px-6 py-2.5 bg-[#10151F] border-t border-[#1F2735] text-[11px] text-[#8E99A8]">
              <div class="flex items-center gap-2 text-goldAccent">
                <span class="material-symbols-outlined text-[16px]">mouse</span>
                <span class="font-semibold uppercase tracking-wider text-[10px]">Continuous Vertical Scroll Active</span>
              </div>
              <div class="flex items-center gap-2.5">
                <span class="text-[10px] uppercase tracking-wider text-[#64748B]">SCROLL POSITION</span>
                <div class="w-24 h-1.5 bg-[#1F2735] rounded-full overflow-hidden">
                  <div class="h-full bg-goldAccent rounded-full transition-all" id="pdf-scroll-thumb" style="width: 34%;"></div>
                </div>
                <span class="text-goldAccent font-bold">Page 84 - 86</span>
              </div>
            </div>
          </div>

          <!-- Bottom Status / Scrubber Bar (Shown in PDF mode matching reference) -->
          <div class="w-full mt-4 bg-[#111621] p-4 rounded-2xl flex flex-col gap-2.5 shadow-lg border border-[#1F2735] max-w-6xl mx-auto hidden" id="reader-pdf-status-bar">
            <div class="flex items-center justify-between text-xs text-[#8E99A8]">
              <div class="flex items-center gap-2">
                <span class="text-white font-serif font-semibold text-[14px]">Chapter 4: Purpose & Flow</span>
                <span class="text-goldAccent/60">·</span>
                <span>26 pages remaining</span>
              </div>
              <div class="flex items-center gap-3">
                <span>Page 85 / 248</span>
                <span class="text-goldAccent font-bold">34%</span>
              </div>
            </div>
            <div class="relative w-full h-2 bg-[#1C2433] rounded-full overflow-hidden cursor-pointer group">
              <div class="absolute left-0 top-0 bottom-0 bg-goldAccent rounded-full transition-all" style="width: 34%;"></div>
              <div class="absolute top-0 bottom-0 w-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity" style="left: 34%;"></div>
            </div>
            <div class="flex justify-between items-center text-[10px] text-[#718096] uppercase tracking-wider pt-0.5">
              <span>Ch 1: Philosophy</span>
              <span>Ch 2: Longevity</span>
              <span>Ch 3: Masters</span>
              <span class="text-goldAccent font-bold">Ch 4: Flow State</span>
              <span>Ch 5: Elders</span>
              <span>Ch 6: Resilience</span>
            </div>
          </div>
        </div>
      `;
    },
    init: function () {
      let currentFontSize = 17;
      const sizeLabel = document.getElementById('font-size-label');
      const contentElements = document.querySelectorAll('.reader-content');

      const updateFont = (delta) => {
        currentFontSize = Math.min(24, Math.max(13, currentFontSize + delta));
        if (sizeLabel) sizeLabel.textContent = `${currentFontSize}px`;
        contentElements.forEach(el => {
          el.style.fontSize = `${currentFontSize}px`;
        });
      };

      const decBtn = document.getElementById('font-decrease');
      const incBtn = document.getElementById('font-increase');
      if (decBtn) decBtn.addEventListener('click', () => updateFont(-1));
      if (incBtn) incBtn.addEventListener('click', () => updateFont(1));

      // Book vs PDF Mode Switcher
      const btnBook = document.getElementById('btn-mode-book');
      const btnPdf = document.getElementById('btn-mode-pdf');
      const bookContainer = document.getElementById('reader-book-container');
      const pdfContainer = document.getElementById('reader-pdf-container');
      const pageTurnNav = document.getElementById('reader-page-turn-nav');
      const pdfStatusBar = document.getElementById('reader-pdf-status-bar');

      function setMode(mode) {
        if (mode === 'pdf') {
          if (btnPdf) {
            btnPdf.classList.add('bg-[#110D0A]', 'text-[#E0D5C1]', 'shadow');
            btnPdf.classList.remove('text-[#7A8699]');
          }
          if (btnBook) {
            btnBook.classList.remove('bg-[#110D0A]', 'text-[#E0D5C1]', 'shadow');
            btnBook.classList.add('text-[#7A8699]');
          }
          if (bookContainer) bookContainer.classList.add('hidden');
          if (pageTurnNav) pageTurnNav.classList.add('hidden');
          if (pdfContainer) pdfContainer.classList.remove('hidden');
          if (pdfStatusBar) pdfStatusBar.classList.remove('hidden');
          try { localStorage.setItem('novelcast.reader.mode', 'pdf'); } catch (e) {}
        } else {
          if (btnBook) {
            btnBook.classList.add('bg-[#110D0A]', 'text-[#E0D5C1]', 'shadow');
            btnBook.classList.remove('text-[#7A8699]');
          }
          if (btnPdf) {
            btnPdf.classList.remove('bg-[#110D0A]', 'text-[#E0D5C1]', 'shadow');
            btnPdf.classList.add('text-[#7A8699]');
          }
          if (bookContainer) bookContainer.classList.remove('hidden');
          if (pageTurnNav) pageTurnNav.classList.remove('hidden');
          if (pdfContainer) pdfContainer.classList.add('hidden');
          if (pdfStatusBar) pdfStatusBar.classList.add('hidden');
          try { localStorage.setItem('novelcast.reader.mode', 'book'); } catch (e) {}
        }
      }

      if (btnBook) btnBook.addEventListener('click', () => setMode('book'));
      if (btnPdf) btnPdf.addEventListener('click', () => setMode('pdf'));

      // Check URL query param or saved preference
      const params = new URLSearchParams((location.hash.split('?')[1] || ''));
      let initialMode = params.get('mode');
      if (!initialMode) {
        try { initialMode = localStorage.getItem('novelcast.reader.mode'); } catch (e) {}
      }
      setMode(initialMode === 'pdf' ? 'pdf' : 'book');

      // Dynamic scroll progress calculation in PDF mode
      const scrollCanvas = document.getElementById('book-scroll-canvas');
      const scrollThumb = document.getElementById('pdf-scroll-thumb');
      const scrollPercent = document.getElementById('pdf-scroll-percent');
      if (scrollCanvas && scrollThumb) {
        scrollCanvas.addEventListener('scroll', () => {
          const maxScroll = scrollCanvas.scrollHeight - scrollCanvas.clientHeight;
          if (maxScroll > 0) {
            const pct = Math.round((scrollCanvas.scrollTop / maxScroll) * 100);
            scrollThumb.style.width = `${Math.max(10, pct)}%`;
            if (scrollPercent) scrollPercent.textContent = `${pct}% Complete`;
          }
        });
      }

      // Chapter navigation
      const NC = window.NovelCast;
      const query = NC.readQuery();
      const bookId = query.book || 'ikigai';
      const chapterIdx = parseInt(query.chapter || 0, 10);
      const book = NC.getBook(bookId) || NC.books[0];
      const maxChapters = (book.chaptersList && book.chaptersList.length) || book.chapters || 10;

      const navigateChapter = (newIdx) => {
        if (newIdx >= 0 && newIdx < maxChapters) {
          const mode = localStorage.getItem('novelcast.reader.mode') || 'book';
          location.hash = `#/reader?book=${book.id}&chapter=${newIdx}&mode=${mode}`;
        }
      };

      const prevBtn = document.getElementById('reader-prev-btn');
      const nextBtn = document.getElementById('reader-next-btn');
      const pdfPrevBtn = document.getElementById('pdf-prev-btn');
      const pdfNextBtn = document.getElementById('pdf-next-btn');

      if (prevBtn) prevBtn.addEventListener('click', () => navigateChapter(chapterIdx - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => navigateChapter(chapterIdx + 1));
      if (pdfPrevBtn) pdfPrevBtn.addEventListener('click', () => navigateChapter(chapterIdx - 1));
      if (pdfNextBtn) pdfNextBtn.addEventListener('click', () => navigateChapter(chapterIdx + 1));
    }
  };
