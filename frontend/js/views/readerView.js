window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.reader = {
  render: function () {
    const NC = window.NovelCast;
    const query = NC.readQuery();
    const bookId = query.book || 'pride-and-prejudice';
    const book = NC.getBook(bookId) || NC.books[0];
    const chapterNum = query.chapter ? Math.max(1, parseInt(query.chapter, 10)) : 1;

    // Check if book already has chapter in memory
    const existingChapter = book.chaptersList && book.chaptersList.find(c => c.chapterNumber === chapterNum);
    const chapterTitle = existingChapter ? existingChapter.title : `Chapter ${chapterNum}`;

    return `
      <!-- Reader Container -->
      <div class="max-w-7xl mx-auto pb-16">
        <!-- Top Reader Control Bar -->
        <div class="w-full mb-4 px-4 py-3 bg-[#11151E] border border-[#222B3A] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div class="flex items-center gap-3">
            <a href="#/book?book=${book.id}" class="w-8 h-8 rounded-full bg-[#1A212E] hover:bg-[#252F42] text-white flex items-center justify-center transition-colors" title="Back to Book Details">
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            </a>
            <div>
              <h2 class="text-[14px] font-bold text-white truncate max-w-xs sm:max-w-md" id="reader-book-title">${NC.escapeHtml(book.title)}</h2>
              <p class="text-[11px] text-[#8E99A8]" id="reader-book-subtitle">${NC.escapeHtml(book.author)} &bull; <span id="reader-ch-num-label">Chapter ${chapterNum} of ${book.chapters}</span></p>
            </div>
          </div>

          <!-- Controls: Font Size, Mode (Book vs PDF), Listen -->
          <div class="flex items-center gap-3 sm:gap-4 text-[12px]">
            <div class="flex items-center gap-2 bg-[#181E2B] px-3 py-1.5 rounded-full border border-[#263143]">
              <span class="text-[#7A8699] text-[11px] font-semibold uppercase tracking-wider">Size</span>
              <button id="font-decrease" class="text-white hover:text-goldAccent px-1 text-sm font-bold cursor-pointer" type="button">-</button>
              <span id="font-size-label" class="text-goldAccent font-mono text-xs">17px</span>
              <button id="font-increase" class="text-white hover:text-goldAccent px-1 text-sm font-bold cursor-pointer" type="button">+</button>
            </div>

            <!-- Book vs PDF Mode Switcher -->
            <div class="flex items-center gap-1.5 bg-[#181E2B] p-1 rounded-full border border-[#263143]" id="reader-mode-toggle">
              <button id="btn-mode-book" class="reader-mode-btn px-3.5 py-1 rounded-full text-xs font-semibold bg-[#110D0A] text-[#E0D5C1] shadow cursor-pointer transition-all flex items-center gap-1.5" data-mode="book" type="button">
                <span class="material-symbols-outlined text-[15px]">menu_book</span>
                <span>Book</span>
              </button>
              <button id="btn-mode-pdf" class="reader-mode-btn px-3.5 py-1 rounded-full text-xs font-medium text-[#7A8699] hover:text-white cursor-pointer transition-all flex items-center gap-1.5" data-mode="pdf" type="button">
                <span class="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                <span>PDF</span>
              </button>
            </div>

            <button onclick="window.NovelCastApp.toggleAudio('book-${book.id}')" class="px-3.5 py-1.5 rounded-full bg-goldAccent text-[#121620] font-bold text-xs shadow hover:bg-[#ffe196] flex items-center gap-1 transition-all cursor-pointer" type="button">
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
              Narrated by <strong class="text-white">${NC.escapeHtml(book.narrator || 'AI Sanctuary Voice')}</strong> &bull; Synchronized chapter playback
            </p>
          </div>
          <button class="text-goldAccent hover:text-white text-[12px] font-medium flex items-center gap-1 shrink-0 cursor-pointer" onclick="window.NovelCastApp.toggleAudio('book-${book.id}')" type="button">
            <span class="material-symbols-outlined text-[16px]">play_circle</span>
            <span>Play Track</span>
          </button>
        </div>        <!-- Real Skeuomorphic Book Spread (Book Mode) -->
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

              <div class="grid grid-cols-1 lg:grid-cols-2 relative z-10 transition-opacity duration-150" id="book-spread-content">
                <!-- Left Page -->
                <article id="book-left-article" class="relative group p-6 md:p-8 lg:p-10 lg:pr-12 bg-gradient-to-r from-[#f5eee0] via-[#fbf7ee] to-[#e8dec7] border-b lg:border-b-0 lg:border-r border-[#e2d5bd]/60 shadow-[inset_12px_0_24px_rgba(255,255,255,0.4)] flex flex-col justify-between h-[640px] md:h-[680px] overflow-hidden select-none cursor-pointer" title="Click to turn to previous page">
                  <header class="flex items-center justify-between pb-3 border-b border-[#221f1c]/10 text-[11px] uppercase tracking-widest text-[#6b6255] font-semibold shrink-0">
                    <span id="book-left-header-title">${NC.escapeHtml(book.title)}</span>
                    <span id="book-left-header-ch">Chapter ${chapterNum}</span>
                  </header>

                  <div class="flex-1 my-3 py-1 space-y-4 reader-content font-serif text-[17px] leading-[1.75] text-[#2b2620] overflow-hidden" id="book-left-page-content">
                    <h1 class="text-[24px] md:text-[28px] font-serif italic text-[#1a1714] leading-tight mb-4" id="book-chapter-heading">
                      ${NC.escapeHtml(chapterTitle)}
                    </h1>
                    <div class="flex items-center gap-2 py-8 text-neutral-500 italic text-sm" id="book-loading-indicator">
                      <span class="material-symbols-outlined animate-spin text-[20px] text-amber-700">progress_activity</span>
                      <span>Retrieving chapter text from sanctuary archives...</span>
                    </div>
                  </div>

                  <footer class="flex items-center justify-between pt-3 border-t border-[#221f1c]/10 text-[11px] text-[#857b6a] shrink-0">
                    <span>${NC.escapeHtml(book.author)}</span>
                    <span class="font-bold font-mono" id="book-left-page-num">Page 1</span>
                  </footer>

                  <!-- Subtle left edge page turn indicator on hover -->
                  <div class="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none text-[#5c3a21]">
                    <span class="material-symbols-outlined text-[28px]">chevron_left</span>
                  </div>
                </article>

                <!-- Right Page -->
                <article id="book-right-article" class="relative group p-6 md:p-8 lg:p-10 lg:pl-12 bg-gradient-to-r from-[#e8dec7] via-[#fbf7ee] to-[#f5eee0] shadow-[inset_-12px_0_24px_rgba(255,255,255,0.4)] flex flex-col justify-between h-[640px] md:h-[680px] overflow-hidden select-none cursor-pointer" title="Click to turn to next page">
                  <header class="flex items-center justify-between pb-3 border-b border-[#221f1c]/10 text-[11px] uppercase tracking-widest text-[#6b6255] font-semibold shrink-0">
                    <span id="book-right-header-genre">${NC.escapeHtml(book.genre)}</span>
                    <span class="text-amber-800 font-semibold" id="book-right-word-count">Chapter ${chapterNum}</span>
                  </header>

                  <div class="flex-1 my-3 py-1 space-y-4 reader-content font-serif text-[17px] leading-[1.75] text-[#2b2620] overflow-hidden" id="book-right-page-content">
                    <div id="book-right-paragraphs" class="space-y-4 text-justify">
                      <!-- Loaded dynamically -->
                    </div>
                  </div>

                  <footer class="flex items-center justify-between pt-3 border-t border-[#221f1c]/10 text-[11px] text-[#857b6a] shrink-0">
                    <span id="book-right-footer-ch">Spread 1</span>
                    <span class="font-bold font-mono" id="book-right-page-num">Page 2</span>
                  </footer>

                  <!-- Subtle right edge page turn indicator on hover -->
                  <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none text-[#5c3a21]">
                    <span class="material-symbols-outlined text-[28px]">chevron_right</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>

        <!-- Page Turn Navigation (Book Mode) -->
        <div class="flex flex-wrap items-center justify-between mt-6 px-4 gap-4" id="reader-page-turn-nav">
          <button class="px-5 py-2.5 rounded-full bg-[#161C26] hover:bg-[#1E2634] text-white border border-[#252E3E] text-[13px] font-medium transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md" id="reader-prev-btn" type="button">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            <span id="reader-prev-label">Previous Page</span>
          </button>

          <div class="flex items-center gap-3 text-xs text-[#8E99A8] bg-[#121620] px-4 py-2 rounded-full border border-[#222B3A] shadow-inner" id="reader-nav-middle">
            <button id="reader-jump-prev-ch" class="hover:text-goldAccent flex items-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-1" title="Skip to Previous Chapter" type="button">
              <span class="material-symbols-outlined text-[17px]">fast_rewind</span>
            </button>
            <span class="material-symbols-outlined text-[15px] text-goldAccent">auto_stories</span>
            <span id="reader-nav-indicator" class="font-medium text-white">Chapter ${chapterNum}</span>
            <button id="reader-jump-next-ch" class="hover:text-goldAccent flex items-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed p-1" title="Skip to Next Chapter" type="button">
              <span class="material-symbols-outlined text-[17px]">fast_forward</span>
            </button>
          </div>

          <button class="px-5 py-2.5 rounded-full bg-[#161C26] hover:bg-[#1E2634] text-white border border-[#252E3E] text-[13px] font-medium transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md" id="reader-next-btn" type="button">
            <span id="reader-next-label">Next Page</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <!-- Continuous Vertical Scroll Layout (PDF Mode) -->
        <div class="relative w-full max-w-6xl mx-auto rounded-2xl bg-[#0B0E14] shadow-[0_24px_64px_rgba(0,0,0,0.85)] border border-[#1F2735] overflow-hidden flex flex-col hidden" id="reader-pdf-container">
          <!-- Atmospheric gold & navy glows -->
          <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-3/4 h-56 bg-goldAccent/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
          <div class="absolute -bottom-24 left-1/4 w-80 h-80 bg-[#151B26]/40 rounded-full blur-[80px] pointer-events-none -z-10"></div>

          <!-- Top Container Header Bar -->
          <div class="w-full flex items-center justify-between px-6 py-2.5 bg-[#10151F]/90 backdrop-blur-md border-b border-[#1F2735] z-20 text-[11px]">
            <div class="flex items-center gap-2 text-goldAccent font-semibold uppercase tracking-widest text-[11px]">
              <span class="material-symbols-outlined text-[16px]">unfold_more</span>
              <span>CONTINUOUS SCROLL MODE</span>
              <span class="text-[#7E8B9C] font-normal" id="pdf-header-ch-meta">&bull; Chapter ${chapterNum} of ${book.chapters}</span>
            </div>
            <div class="flex items-center gap-3 text-[#8E99A8] font-mono text-[11px]">
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[14px] text-goldAccent">schedule</span>
                <span id="pdf-time-left">12m left</span>
              </span>
              <span class="text-[#2F3A4C]">•</span>
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[14px] text-goldAccent">speed</span>
                <span>220 WPM pace</span>
              </span>
              <span class="text-[#2F3A4C]">•</span>
              <span class="text-goldAccent font-bold font-sans" id="pdf-scroll-percent">0% Complete</span>
            </div>
          </div>

          <!-- Scrollable Canvas -->
          <div class="w-full overflow-y-auto max-h-[66vh] px-6 py-8 md:px-12 md:py-10 space-y-6" id="book-scroll-canvas" style="scroll-behavior: smooth;">
            <div class="max-w-2xl mx-auto py-4 px-2 text-[#CBD5E1]">
              <header class="mb-8 text-center border-b border-[#1F2735] pb-6">
                <span class="text-[10px] uppercase tracking-[0.25em] text-goldAccent font-semibold block mb-2" id="pdf-volume-label">
                  ${NC.escapeHtml(book.title).toUpperCase()} &bull; CHAPTER ${chapterNum}
                </span>
                <h1 class="font-serif text-[28px] md:text-[34px] text-white tracking-tight leading-snug" id="pdf-chapter-title">
                  ${NC.escapeHtml(chapterTitle)}
                </h1>
              </header>

              <div class="space-y-5 font-serif text-[16px] md:text-[17px] leading-[1.85] text-[#CBD5E1]/95 text-justify reader-content" id="pdf-paragraphs-container">
                <div class="flex items-center justify-center gap-2 py-12 text-[#8A96A8] italic">
                  <span class="material-symbols-outlined animate-spin text-[20px] text-goldAccent">progress_activity</span>
                  <span>Streaming full chapter text from MongoDB Atlas...</span>
                </div>
              </div>

              <nav class="flex items-center justify-between pt-8 mt-8 border-t border-[#1F2735] text-xs text-[#8E99A8]">
                <button class="flex items-center gap-1.5 text-[#8E99A8] hover:text-goldAccent transition-colors py-1.5 px-3 rounded-lg hover:bg-[#151B26] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" id="pdf-prev-btn" type="button">
                  <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Previous Chapter</span>
                </button>
                <span class="font-mono text-[#64748B]" id="pdf-nav-counter">Chapter ${chapterNum} of ${book.chapters}</span>
                <button class="flex items-center gap-1.5 text-[#8E99A8] hover:text-goldAccent transition-colors py-1.5 px-3 rounded-lg hover:bg-[#151B26] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" id="pdf-next-btn" type="button">
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
                <div class="h-full bg-goldAccent rounded-full transition-all" id="pdf-scroll-thumb" style="width: 5%;"></div>
              </div>
              <span class="text-goldAccent font-bold" id="pdf-scroll-readout">0%</span>
            </div>
          </div>
        </div>

        <!-- Bottom Status / Scrubber Bar (Shown in PDF mode) -->
        <div class="w-full mt-4 bg-[#111621] p-4 rounded-2xl flex flex-col gap-2.5 shadow-lg border border-[#1F2735] max-w-6xl mx-auto hidden" id="reader-pdf-status-bar">
          <div class="flex items-center justify-between text-xs text-[#8E99A8]">
            <div class="flex items-center gap-2">
              <span class="text-white font-serif font-semibold text-[14px]" id="scrubber-chapter-title">${NC.escapeHtml(chapterTitle)}</span>
              <span class="text-goldAccent/60">&bull;</span>
              <span id="scrubber-time-remaining">Calculating reading pace...</span>
            </div>
            <div class="flex items-center gap-3">
              <span id="scrubber-ch-counter">Chapter ${chapterNum} / ${book.chapters}</span>
              <span class="text-goldAccent font-bold" id="scrubber-pct">0%</span>
            </div>
          </div>
          <div class="relative w-full h-2 bg-[#1C2433] rounded-full overflow-hidden cursor-pointer group" id="scrubber-track">
            <div class="absolute left-0 top-0 bottom-0 bg-goldAccent rounded-full transition-all" id="scrubber-fill" style="width: 5%;"></div>
          </div>
        </div>
      </div>
    `;
  },
  init: function () {
    const NC = window.NovelCast;
    const query = NC.readQuery();
    const bookId = query.book || 'pride-and-prejudice';
    const chapterNum = query.chapter ? Math.max(1, parseInt(query.chapter, 10)) : 1;
    const book = NC.getBook(bookId) || NC.books[0];

    // Font size controls
    let currentFontSize = 17;
    let rePaginate = null;
    const sizeLabel = document.getElementById('font-size-label');
    const updateFont = (delta) => {
      currentFontSize = Math.min(26, Math.max(13, currentFontSize + delta));
      if (sizeLabel) sizeLabel.textContent = `${currentFontSize}px`;
      document.querySelectorAll('.reader-content').forEach(el => {
        el.style.fontSize = `${currentFontSize}px`;
      });
      if (typeof rePaginate === 'function') {
        rePaginate();
      }
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

    const initialMode = query.mode || (function () {
      try { return localStorage.getItem('novelcast.reader.mode'); } catch (e) { return 'book'; }
    })() || 'book';
    setMode(initialMode === 'pdf' ? 'pdf' : 'book');

    // PDF scroll progress
    const scrollCanvas = document.getElementById('book-scroll-canvas');
    const scrollThumb = document.getElementById('pdf-scroll-thumb');
    const scrollPercent = document.getElementById('pdf-scroll-percent');
    const scrollReadout = document.getElementById('pdf-scroll-readout');
    const scrubberFill = document.getElementById('scrubber-fill');
    const scrubberPct = document.getElementById('scrubber-pct');

    if (scrollCanvas) {
      scrollCanvas.addEventListener('scroll', () => {
        const maxScroll = scrollCanvas.scrollHeight - scrollCanvas.clientHeight;
        if (maxScroll > 0) {
          const pct = Math.min(100, Math.max(0, Math.round((scrollCanvas.scrollTop / maxScroll) * 100)));
          if (scrollThumb) scrollThumb.style.width = `${Math.max(5, pct)}%`;
          if (scrollPercent) scrollPercent.textContent = `${pct}% Complete`;
          if (scrollReadout) scrollReadout.textContent = `${pct}%`;
          if (scrubberFill) scrubberFill.style.width = `${Math.max(5, pct)}%`;
          if (scrubberPct) scrubberPct.textContent = `${pct}%`;
        }
      });
    }

    // Helper to format paragraph text with em markdown tags
    function formatPara(text) {
      if (!text) return '';
      return text
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/\[Illustration(?::[^\]]*)?\]/gi, '')
        .trim();
    }

    // Dynamic Container Height Pagination Algorithm
    function paginateChapter(rawParagraphs, chTitle, targetWidth, targetHeight, fontSize) {
      const sandbox = document.createElement('div');
      sandbox.className = 'reader-content font-serif text-[#2b2620] space-y-4';
      sandbox.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        visibility: hidden;
        pointer-events: none;
        width: ${targetWidth}px;
        font-size: ${fontSize}px;
        line-height: 1.75;
        box-sizing: border-box;
        padding: 0;
        margin: 0;
      `;
      document.body.appendChild(sandbox);

      // Measure heading height on Page 1
      sandbox.innerHTML = `<h1 class="text-[24px] md:text-[28px] font-serif italic text-[#1a1714] leading-tight mb-4" id="book-chapter-heading">${NC.escapeHtml(chTitle)}</h1>`;
      const headingHeight = sandbox.offsetHeight + 18;

      const pages = [];
      let currentPageItems = [];
      let pageIdx = 0;

      const getMaxHeight = (idx) => {
        if (idx === 0) return Math.max(260, targetHeight - headingHeight);
        return targetHeight;
      };

      function wrapPara(text, isFirst) {
        const formatted = formatPara(text);
        if (isFirst && formatted.length > 3) {
          const firstLetter = formatted[0];
          const rest = formatted.slice(1);
          return `<p class="text-justify"><span class="float-left text-[44px] leading-[0.8] pr-2.5 pt-1 font-serif italic text-[#8f2824]">${NC.escapeHtml(firstLetter)}</span>${rest}</p>`;
        }
        return `<p class="text-justify">${formatted}</p>`;
      }

      const queue = [...rawParagraphs];

      while (queue.length > 0) {
        const currentP = queue.shift();
        const isFirstInCh = (pageIdx === 0 && currentPageItems.length === 0);
        const htmlToAdd = wrapPara(currentP, isFirstInCh);

        sandbox.innerHTML = [...currentPageItems, htmlToAdd].join('');
        const currentMax = getMaxHeight(pageIdx);

        if (sandbox.scrollHeight <= currentMax) {
          currentPageItems.push(htmlToAdd);
        } else {
          if (currentPageItems.length > 0) {
            pages.push([...currentPageItems]);
            currentPageItems = [];
            pageIdx++;
            queue.unshift(currentP);
          } else {
            // Single paragraph exceeds the whole page: split by sentences
            const sentences = currentP.split(/(?<=[.?!])\s+/);
            if (sentences.length > 1) {
              let sentenceChunk = [];
              let sIdx = 0;
              while (sIdx < sentences.length) {
                const testText = [...sentenceChunk, sentences[sIdx]].join(' ');
                sandbox.innerHTML = wrapPara(testText, isFirstInCh && sentenceChunk.length === 0);
                if (sandbox.scrollHeight <= currentMax || sentenceChunk.length === 0) {
                  sentenceChunk.push(sentences[sIdx]);
                  sIdx++;
                } else {
                  break;
                }
              }
              currentPageItems.push(wrapPara(sentenceChunk.join(' '), isFirstInCh));
              pages.push([...currentPageItems]);
              currentPageItems = [];
              pageIdx++;

              const remaining = sentences.slice(sIdx).join(' ');
              if (remaining && remaining.trim()) {
                queue.unshift(remaining.trim());
              }
            } else {
              currentPageItems.push(htmlToAdd);
              pages.push([...currentPageItems]);
              currentPageItems = [];
              pageIdx++;
            }
          }
        }
      }

      if (currentPageItems.length > 0) {
        pages.push(currentPageItems);
      }

      if (document.body.contains(sandbox)) {
        document.body.removeChild(sandbox);
      }

      return pages;
    }

    function buildSpreads(pages) {
      const spreads = [];
      for (let i = 0; i < pages.length; i += 2) {
        spreads.push({
          left: pages[i] || [],
          right: pages[i + 1] || null,
          leftPageNum: i + 1,
          rightPageNum: i + 2 <= pages.length ? i + 2 : null
        });
      }
      if (spreads.length === 0) {
        spreads.push({ left: [], right: null, leftPageNum: 1, rightPageNum: null });
      }
      return spreads;
    }

    // --- FETCH LIVE CHAPTER FROM MONGO ATLAS BACKEND ---
    const targetSlug = book.slug || book.id;
    NC.fetchChapter(targetSlug, chapterNum).then(data => {
      if (!data || !data.chapter) {
        console.warn('[readerView] No chapter data returned, generating fallback sanctuary passage');
        const fallbackTitle = (book.chaptersList && book.chaptersList[chapterNum - 1] && book.chaptersList[chapterNum - 1].title) || `Chapter ${chapterNum}`;
        const fallbackContent = `${book.title}\n\nBy ${book.author}\n\n${book.description}\n\nYou will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.\n\nI am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.\n\nInspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation; it ever presents itself to my imagination as the region of beauty and delight. There, Margaret, the sun is for ever visible, its broad disk just skirting the horizon and diffusing a perpetual splendour.`;
        data = {
          book: { title: book.title, author: book.author, totalChapters: book.chapters || 12 },
          chapter: {
            chapterNumber: chapterNum,
            title: fallbackTitle,
            content: fallbackContent,
            wordCount: 1200
          },
          navigation: {
            previous: chapterNum > 1 ? chapterNum - 1 : null,
            next: chapterNum < (book.chapters || 12) ? chapterNum + 1 : null
          }
        };
      }

      const chapter = data.chapter;
      const nav = data.navigation || {};
      const totalChapters = (data.book && data.book.totalChapters) || book.chapters || 10;
      const chNumber = chapter.chapterNumber || chapterNum;
      const title = chapter.title || `Chapter ${chNumber}`;
      const wordCount = chapter.wordCount || 1500;
      const minsLeft = Math.max(1, Math.round(wordCount / 220));
      const timeStr = minsLeft >= 60 ? `${Math.floor(minsLeft / 60)} hr ${minsLeft % 60}m left` : `${minsLeft} min left`;

      // Update Header & Subtitle
      const titleEl = document.getElementById('reader-book-title');
      const subEl = document.getElementById('reader-book-subtitle');
      if (titleEl) titleEl.textContent = data.book ? data.book.title : book.title;
      if (subEl) subEl.innerHTML = `${NC.escapeHtml(book.author)} &bull; Chapter ${chNumber} of ${totalChapters}`;

      // Navigation Counter Badges
      const chNumLabel = document.getElementById('reader-ch-num-label');
      if (chNumLabel) chNumLabel.textContent = `Chapter ${chNumber} of ${totalChapters}`;
      const pdfNavCounter = document.getElementById('pdf-nav-counter');
      if (pdfNavCounter) pdfNavCounter.textContent = `Chapter ${chNumber} of ${totalChapters}`;
      const pdfVolLabel = document.getElementById('pdf-volume-label');
      if (pdfVolLabel) pdfVolLabel.innerHTML = `${NC.escapeHtml(book.title).toUpperCase()} &bull; CHAPTER ${chNumber}`;
      const pdfHeaderMeta = document.getElementById('pdf-header-ch-meta');
      if (pdfHeaderMeta) pdfHeaderMeta.textContent = `• Chapter ${chNumber} of ${totalChapters}`;
      const scrubberChCounter = document.getElementById('scrubber-ch-counter');
      if (scrubberChCounter) scrubberChCounter.textContent = `Chapter ${chNumber} / ${totalChapters}`;
      const scrubberTimeRemaining = document.getElementById('scrubber-time-remaining');
      if (scrubberTimeRemaining) scrubberTimeRemaining.textContent = `${timeStr} (${wordCount.toLocaleString()} words)`;
      const pdfTimeLeft = document.getElementById('pdf-time-left');
      if (pdfTimeLeft) pdfTimeLeft.textContent = timeStr;

      // Update Chapter Titles & Right Header Word Count
      const pdfHeading = document.getElementById('pdf-chapter-title');
      if (pdfHeading) pdfHeading.textContent = title;
      const scrubberTitle = document.getElementById('scrubber-chapter-title');
      if (scrubberTitle) scrubberTitle.textContent = title;
      const rightWordCount = document.getElementById('book-right-word-count');
      if (rightWordCount) rightWordCount.textContent = `${wordCount.toLocaleString()} words`;
      const leftHeaderCh = document.getElementById('book-left-header-ch');
      if (leftHeaderCh) leftHeaderCh.textContent = `Chapter ${chNumber}`;

      // Parse full raw content into paragraphs
      const rawParagraphs = (chapter.content || '')
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      // --- PAGINATE FOR BOOK MODE DOUBLE SPREAD ---
      const leftContentEl = document.getElementById('book-left-page-content');
      const targetHeight = Math.max(420, leftContentEl ? leftContentEl.clientHeight : 500);
      const targetWidth = Math.max(300, leftContentEl ? leftContentEl.clientWidth : 460);

      let pages = paginateChapter(rawParagraphs, title, targetWidth, targetHeight, currentFontSize);
      let spreads = buildSpreads(pages);
      let currentSpread = 0;

      const goTo = (targetCh) => {
        if (!targetCh) return;
        const currentMode = localStorage.getItem('novelcast.reader.mode') || 'book';
        location.hash = `#/reader?book=${targetSlug}&chapter=${targetCh}&mode=${currentMode}`;
      };

      function renderSpread(idx, animate = true) {
        if (!spreads.length) return;
        currentSpread = Math.max(0, Math.min(idx, spreads.length - 1));
        const spread = spreads[currentSpread];
        const totalSpreads = spreads.length;
        const totalPages = pages.length;

        const spreadContentEl = document.getElementById('book-spread-content');
        if (animate && spreadContentEl) {
          spreadContentEl.style.opacity = '0.35';
        }

        setTimeout(() => {
          const leftContent = document.getElementById('book-left-page-content');
          const rightParas = document.getElementById('book-right-paragraphs');
          const leftPageNumEl = document.getElementById('book-left-page-num');
          const rightPageNumEl = document.getElementById('book-right-page-num');
          const rightFooterChEl = document.getElementById('book-right-footer-ch');
          const navIndicatorEl = document.getElementById('reader-nav-indicator');
          const prevBtn = document.getElementById('reader-prev-btn');
          const nextBtn = document.getElementById('reader-next-btn');
          const prevLabel = document.getElementById('reader-prev-label');
          const nextLabel = document.getElementById('reader-next-label');

          // Left Page Content
          let leftHtml = '';
          if (currentSpread === 0) {
            leftHtml += `<h1 class="text-[24px] md:text-[28px] font-serif italic text-[#1a1714] leading-tight mb-4" id="book-chapter-heading">${NC.escapeHtml(title)}</h1>`;
          }
          leftHtml += spread.left.join('');
          if (leftContent) leftContent.innerHTML = leftHtml;

          // Right Page Content
          let rightHtml = '';
          if (spread.right && spread.right.length > 0) {
            rightHtml = spread.right.join('');
          } else {
            rightHtml = `
              <div class="h-full flex flex-col items-center justify-center text-neutral-400 py-20 space-y-3 opacity-60">
                <span class="material-symbols-outlined text-[36px] text-amber-800/60">local_florist</span>
                <p class="font-serif italic text-sm text-[#857b6a]">End of Chapter ${chNumber}</p>
              </div>
            `;
          }
          if (rightParas) rightParas.innerHTML = rightHtml;

          // Page Numbering in Footers
          if (leftPageNumEl) leftPageNumEl.textContent = `Page ${spread.leftPageNum} of ${totalPages}`;
          if (rightPageNumEl) {
            rightPageNumEl.textContent = spread.rightPageNum ? `Page ${spread.rightPageNum} of ${totalPages}` : '';
          }
          if (rightFooterChEl) {
            rightFooterChEl.textContent = `Spread ${currentSpread + 1} of ${totalSpreads}`;
          }

          // Indicator
          if (navIndicatorEl) {
            const spreadPagesStr = spread.rightPageNum
              ? `Pages ${spread.leftPageNum}–${spread.rightPageNum}`
              : `Page ${spread.leftPageNum}`;
            navIndicatorEl.innerHTML = `Ch. ${chNumber} &bull; ${spreadPagesStr} of ${totalPages}`;
          }

          // In-Chapter Navigation: Previous/Next flips spreads; flips to adjacent chapter at start/end
          if (prevBtn && prevLabel) {
            if (currentSpread > 0) {
              prevBtn.disabled = false;
              prevLabel.textContent = `Previous Page`;
              prevBtn.onclick = () => renderSpread(currentSpread - 1);
            } else {
              prevBtn.disabled = !nav.previous;
              prevLabel.textContent = `Previous Chapter`;
              prevBtn.onclick = () => goTo(nav.previous);
            }
          }

          if (nextBtn && nextLabel) {
            if (currentSpread < totalSpreads - 1) {
              nextBtn.disabled = false;
              nextLabel.textContent = `Next Page`;
              nextBtn.onclick = () => renderSpread(currentSpread + 1);
            } else {
              nextBtn.disabled = !nav.next;
              nextLabel.textContent = `Next Chapter`;
              nextBtn.onclick = () => goTo(nav.next);
            }
          }

          if (animate && spreadContentEl) {
            spreadContentEl.style.opacity = '1';
          }
        }, animate ? 100 : 0);
      }

      // Initial Spread Render
      renderSpread(0, false);

      // Re-paginate on font size change or window resize
      rePaginate = () => {
        const currentContainer = document.getElementById('book-left-page-content');
        const h = Math.max(420, currentContainer ? currentContainer.clientHeight : 500);
        const w = Math.max(300, currentContainer ? currentContainer.clientWidth : 460);
        pages = paginateChapter(rawParagraphs, title, w, h, currentFontSize);
        spreads = buildSpreads(pages);
        renderSpread(Math.min(currentSpread, spreads.length - 1), false);
      };

      // Skip Chapter Jump Buttons
      const jumpPrevCh = document.getElementById('reader-jump-prev-ch');
      const jumpNextCh = document.getElementById('reader-jump-next-ch');
      if (jumpPrevCh) {
        jumpPrevCh.disabled = !nav.previous;
        jumpPrevCh.onclick = () => goTo(nav.previous);
      }
      if (jumpNextCh) {
        jumpNextCh.disabled = !nav.next;
        jumpNextCh.onclick = () => goTo(nav.next);
      }

      // Direct Article Click to Turn Pages
      const leftArticle = document.getElementById('book-left-article');
      const rightArticle = document.getElementById('book-right-article');
      if (leftArticle) {
        leftArticle.onclick = (e) => {
          if (e.target.closest('a') || e.target.closest('button')) return;
          if (currentSpread > 0) {
            renderSpread(currentSpread - 1);
          } else if (nav.previous) {
            goTo(nav.previous);
          }
        };
      }
      if (rightArticle) {
        rightArticle.onclick = (e) => {
          if (e.target.closest('a') || e.target.closest('button')) return;
          if (currentSpread < spreads.length - 1) {
            renderSpread(currentSpread + 1);
          } else if (nav.next) {
            goTo(nav.next);
          }
        };
      }

      // Keyboard Arrow Navigation
      const onKeyDown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const prevBtnEl = document.getElementById('reader-prev-btn');
        const nextBtnEl = document.getElementById('reader-next-btn');
        if (e.key === 'ArrowRight') {
          if (nextBtnEl && !nextBtnEl.disabled) nextBtnEl.click();
        } else if (e.key === 'ArrowLeft') {
          if (prevBtnEl && !prevBtnEl.disabled) prevBtnEl.click();
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // --- POPULATE PDF MODE VERTICAL SCROLL CANVAS ---
      const pdfContainer = document.getElementById('pdf-paragraphs-container');
      if (pdfContainer && rawParagraphs.length > 0) {
        let pdfHtml = '';
        rawParagraphs.forEach((p, idx) => {
          const formatted = formatPara(p);
          if (idx === 0 && /^[A-Za-z]/.test(formatted)) {
            const firstLetter = formatted[0];
            const rest = formatted.slice(1);
            pdfHtml += `<p class="text-justify"><span class="float-left text-[44px] sm:text-[50px] leading-[0.8] pr-3 pt-1 font-serif italic text-goldAccent">${NC.escapeHtml(firstLetter)}</span>${rest}</p>`;
          } else {
            pdfHtml += `<p class="text-justify">${formatted}</p>`;
          }
        });
        pdfContainer.innerHTML = pdfHtml;
      }

      // Wire PDF mode buttons
      const pdfPrevBtn = document.getElementById('pdf-prev-btn');
      const pdfNextBtn = document.getElementById('pdf-next-btn');
      if (pdfPrevBtn) {
        pdfPrevBtn.disabled = !nav.previous;
        pdfPrevBtn.onclick = () => goTo(nav.previous);
      }
      if (pdfNextBtn) {
        pdfNextBtn.disabled = !nav.next;
        pdfNextBtn.onclick = () => goTo(nav.next);
      }
    }).catch(err => {
      console.error('[readerView] Error loading chapter:', err);
      const leftContent = document.getElementById('book-left-page-content');
      if (leftContent) {
        leftContent.innerHTML = `
          <div class="py-12 text-center text-red-900">
            <span class="material-symbols-outlined text-[36px] text-red-800 mb-2 block">menu_book</span>
            <p class="font-bold">Could not load chapter ${chapterNum}</p>
            <p class="text-xs mt-1 text-neutral-600">Please verify backend server status on port 4000.</p>
          </div>
        `;
      }
    });
  }
};
