window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.library = {
  render: function () {
    const NC = window.NovelCast;
    const auth = window.NovelCastAuth;
    const user = auth ? auth.getUser() : null;

    if (!user) {
      return `
        <div class="w-full max-w-lg mx-auto py-16 px-4 text-center">
          <div class="p-8 md:p-10 rounded-3xl bg-[#121722] border border-[#262F40] shadow-2xl relative overflow-hidden">
            <div class="w-16 h-16 rounded-full bg-goldAccent/10 border border-goldAccent/30 mx-auto flex items-center justify-center text-goldAccent mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke-dasharray="40" stroke-dashoffset="0" opacity="1"></path><circle cx="12" cy="7" r="4" opacity="1"></circle></g></svg>
            </div>
            <h2 class="text-2xl font-serifTitle font-bold text-white tracking-wide">Sign In Required</h2>
            <p class="text-sm text-[#8C98AC] mt-2 leading-relaxed">
              My Library is your private literary sanctuary. Sign in to upload custom manuscripts and track your reading progress.
            </p>
            <div class="mt-8">
              <a href="#/login?redirect=library" class="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-goldAccent text-[#10141C] text-sm font-bold shadow-lg hover:bg-[#ffe196] transition-all">
                <span>Sign In with Supabase</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }

    const userId = user.id || user.email;
    const userUploads = NC.getUserUploads(userId);

    return `
      <!-- Library Overview Header -->
      <section class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-[#1E2533]">
          <div class="flex items-center gap-4">
            <div class="w-13 h-13 rounded-full bg-[#18202D] border border-goldAccent/30 flex items-center justify-center text-goldAccent shadow-md shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke-dasharray="40" stroke-dashoffset="0" opacity="1"></path><circle cx="12" cy="7" r="4" opacity="1"></circle></g></svg>
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-2xl md:text-3xl font-bold text-white font-sans tracking-wide">My Library & Manuscripts</h1>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-goldAccent/15 text-goldAccent border border-goldAccent/30">Synced</span>
              </div>
              <p class="text-[13px] text-[#8C98AC] mt-0.5">
                Private collection of <span class="text-white font-medium">${NC.escapeHtml(user.email || 'Member')}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-5">
            <div class="flex flex-col">
              <span class="text-[20px] font-bold text-goldAccent font-sans">${userUploads.length}</span>
              <span class="text-[11px] text-[#738094] uppercase tracking-wider">My Uploads</span>
            </div>
            <div class="h-8 w-px bg-[#232C3D]"></div>
            <div class="flex flex-col">
              <span class="text-[20px] font-bold text-white font-sans">
                ${userUploads.filter(b => b.progress > 0 && b.progress < 100).length}
              </span>
              <span class="text-[11px] text-[#738094] uppercase tracking-wider">In Progress</span>
            </div>
            <div class="h-8 w-px bg-[#232C3D]"></div>
            <div class="flex flex-col">
              <span class="text-[20px] font-bold text-white font-sans">
                ${userUploads.filter(b => b.progress >= 100).length}
              </span>
              <span class="text-[11px] text-[#738094] uppercase tracking-wider">Finished</span>
            </div>
            <div class="h-8 w-px bg-[#232C3D]"></div>
            <button id="btn-lib-signout" class="p-2 rounded-xl text-[#7E8B9E] hover:text-red-300 hover:bg-[#1A202C] transition-all" title="Sign Out">
              <span class="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Drag & Drop Upload Section with React Bits <PixelCard /> -->
      <section class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-[17px] font-bold text-[#F3DCA0] flex items-center gap-2">
              <span>Upload Book or Manuscript</span>
              <span class="text-xs font-normal text-[#8A97AA]">— Drag and drop or browse files</span>
            </h3>
          </div>
        </div>

        <!-- PixelCard Dropzone Component -->
        <div 
          id="pixel-upload-card"
          class="pixel-card w-full h-[230px] md:h-[250px] border border-[#273142] hover:border-goldAccent/60 transition-all rounded-3xl cursor-pointer"
          data-variant="gold"
        >
          <div class="pixel-card-content p-6 text-center flex flex-col items-center justify-center pointer-events-auto">
            <div class="w-13 h-13 rounded-2xl bg-[#171F2D]/90 border border-goldAccent/30 flex items-center justify-center text-goldAccent mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-[28px]">upload_file</span>
            </div>
            <h4 class="text-base md:text-lg font-bold text-white tracking-wide">
              Drag & drop your novel or book here
            </h4>
            <p class="text-xs text-[#8E9BAC] mt-1 max-w-md">
              Supports <span class="text-goldAccent font-medium">EPUB, PDF, TXT, MD</span> files. Auto-generates typography and stores to your private shelf.
            </p>
            <div class="mt-4 flex items-center gap-2">
              <button type="button" id="btn-browse-file" class="px-5 py-2 rounded-full bg-goldAccent text-[#10141C] text-xs font-bold hover:bg-[#ffe196] shadow-md transition-all flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">folder_open</span>
                <span>Browse Files</span>
              </button>
              <span class="text-[11px] text-[#637287]">or drop directly onto canvas</span>
            </div>
          </div>
          <input type="file" id="book-file-input" class="hidden" accept=".epub,.pdf,.txt,.md,.text" />
        </div>

        <!-- Upload Progress Toast/Banner (Dynamic) -->
        <div id="upload-progress-box" class="hidden mt-3 p-3.5 rounded-2xl bg-[#141A25] border border-goldAccent/30 flex items-center justify-between gap-4 transition-all">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-goldAccent/20 flex items-center justify-center text-goldAccent shrink-0">
              <span class="material-symbols-outlined text-[18px]">menu_book</span>
            </div>
            <div class="flex-1 min-w-0">
              <p id="upload-filename" class="text-xs font-bold text-white truncate">Processing manuscript...</p>
              <div class="w-full bg-[#202735] h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div id="upload-progress-bar" class="bg-goldAccent h-full rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
            </div>
          </div>
          <span id="upload-status-text" class="text-[11px] font-mono text-goldAccent shrink-0">Uploading...</span>
        </div>
      </section>

      <!-- User Uploaded Books Section (null if nothing added) -->
      <section class="mb-12">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-[18px] font-bold text-[#F3DCA0]">
            My Uploaded Novels (${userUploads.length})
          </h3>
        </div>

        <div id="user-books-container">
          ${userUploads.length === 0 ? `
            <!-- Null / Empty State -->
            <div class="py-14 px-6 text-center border border-dashed border-[#222B3B] rounded-3xl bg-[#111622]/40 my-2">
              <div class="w-14 h-14 rounded-full bg-[#181E2B] border border-[#2B3547] mx-auto flex items-center justify-center text-[#6A788E] mb-3 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M6 6h10"></path><path d="M6 10h10"></path></svg>
              </div>
              <h4 class="text-base font-semibold text-white">Your Sanctuary Shelf is Empty</h4>
              <p class="text-xs text-[#8C98AC] mt-1 max-w-sm mx-auto">
                Null books added yet. Drag and drop your first EPUB, PDF, or text novel onto the animated PixelCard above to begin reading and recording progress.
              </p>
            </div>
          ` : `
            <!-- Uploaded Books Grid (Matching Standard NovelCast Cards) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              ${userUploads.map(book => `
                <div class="flex flex-col group cursor-pointer relative" data-book-link="${book.id}" data-book-target="details">
                  <a href="#/book?book=${book.id}" class="block">
                    <div class="relative w-full aspect-[1/1.42] rounded-xl overflow-hidden book-shadow book-spine bg-[#1B212E] border border-white/5 transition-transform duration-200 group-hover:-translate-y-1">
                      <!-- Top Rating & Format Badge -->
                      <div class="absolute top-2 left-2 z-20 flex items-center gap-1 bg-[#1A212E]/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-white">
                        <span class="text-goldAccent text-[9px]">★</span> ${(book.rating || 4.8).toFixed(1)}
                      </div>

                      <!-- Delete Book Button -->
                      <button class="btn-delete-book absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-[#1A212E]/90 backdrop-blur-md border border-white/10 text-[#8E9BAC] hover:text-red-400 flex items-center justify-center transition-colors shadow" data-book-id="${book.id}" title="Remove Book" onclick="event.preventDefault(); event.stopPropagation();">
                        <span class="material-symbols-outlined text-[13px]">delete</span>
                      </button>

                      <!-- Book Cover Artwork -->
                      <div class="absolute inset-0">${window.NovelCastView.cover(book)}</div>

                      <!-- Vignette & Bottom Title Glow -->
                      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none"></div>
                      <div class="absolute bottom-2 left-2 right-2 text-center text-[10px] font-serif tracking-widest text-[#FFECC7] uppercase pointer-events-none truncate">
                        ${NC.escapeHtml(book.title)}
                      </div>

                      <!-- Progress Indicator Bar -->
                      ${typeof book.progress === 'number' && book.progress > 0 ? `
                        <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/70 z-20">
                          <div class="h-full bg-goldAccent shadow-[0_0_8px_#f5d77f]" style="width: ${book.progress}%"></div>
                        </div>
                      ` : ''}
                    </div>
                  </a>

                  <!-- Book Metadata Underneath -->
                  <div class="mt-2.5 flex flex-col">
                    <a href="#/book?book=${book.id}" class="text-[12px] font-medium text-[#D6DCE7] group-hover:text-goldAccent transition-colors truncate">
                      ${NC.escapeHtml(book.title)}
                    </a>
                    <div class="flex items-center justify-between text-[11px] text-[#768092] mt-0.5">
                      <span class="flex items-center gap-1 font-mono text-[10px] text-goldAccent/90">
                        ${book.progress ? `${book.progress}% read` : (book.format || 'EPUB')}
                      </span>
                      <button class="favorite-toggle text-[#768092] hover:text-goldAccent transition-colors" data-favorite-toggle="${book.id}" aria-label="Bookmark" type="button">
                        <span class="material-symbols-outlined text-[16px]">bookmark_add</span>
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </section>
    `;
  },

  init: function () {
    const NC = window.NovelCast;
    const auth = window.NovelCastAuth;
    const user = auth ? auth.getUser() : null;

    if (!user) return;
    const userId = user.id || user.email;

    // Initialize React Bits PixelCard
    const pixelCardEl = document.getElementById('pixel-upload-card');
    if (pixelCardEl && window.PixelCard) {
      window.PixelCard.init(pixelCardEl, { variant: 'gold' });
    }

    // Sign out button
    const signoutBtn = document.getElementById('btn-lib-signout');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        auth.signOut();
      });
    }

    // File Drop & Browse Logic
    const fileInput = document.getElementById('book-file-input');
    const browseBtn = document.getElementById('btn-browse-file');
    const progressBox = document.getElementById('upload-progress-box');
    const progressBar = document.getElementById('upload-progress-bar');
    const filenameEl = document.getElementById('upload-filename');
    const statusTextEl = document.getElementById('upload-status-text');

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (pixelCardEl) {
      pixelCardEl.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        pixelCardEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          pixelCardEl.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        pixelCardEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          pixelCardEl.classList.remove('is-dragover');
        });
      });

      pixelCardEl.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length) {
          handleFile(files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleFile(e.target.files[0]);
        }
      });
    }

    function handleFile(file) {
      if (!file) return;

      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const ext = (file.name.split('.').pop() || 'epub').toUpperCase();
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      if (progressBox) {
        progressBox.classList.remove('hidden');
        filenameEl.textContent = `Uploading: ${file.name}`;
        statusTextEl.textContent = '0%';
        progressBar.style.width = '0%';
      }

      let pct = 0;
      const timer = setInterval(() => {
        pct += 25;
        if (pct >= 100) {
          clearInterval(timer);
          if (progressBar) progressBar.style.width = '100%';
          if (statusTextEl) statusTextEl.textContent = '100%';

          const newBook = {
            id: 'upload-' + Date.now(),
            title: title.charAt(0).toUpperCase() + title.slice(1),
            author: user.email ? user.email.split('@')[0] : 'Author',
            format: ext,
            size: sizeStr,
            progress: 0,
            chapters: 12,
            genre: 'Manuscript',
            uploadedAt: new Date().toISOString(),
            lastRead: 'Just uploaded'
          };

          NC.addUserUpload(userId, newBook);
          NC.toast(`"${newBook.title}" added to your library`);

          setTimeout(() => {
            if (progressBox) progressBox.classList.add('hidden');
            // Re-render library view
            const container = document.getElementById('app-view');
            if (container) {
              container.innerHTML = window.NovelCastViews.library.render();
              window.NovelCastViews.library.init();
            }
          }, 600);
        } else {
          if (progressBar) progressBar.style.width = pct + '%';
          if (statusTextEl) statusTextEl.textContent = pct + '%';
        }
      }, 120);
    }

    // Quick Progress Increment button
    document.querySelectorAll('.btn-quick-progress').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const current = parseInt(btn.dataset.current || '0', 10);
        const next = current >= 100 ? 0 : Math.min(100, current + 20);
        NC.updateUserUploadProgress(userId, bookId, next, `Read to ${next}%`);
        NC.toast(`Progress updated: ${next}%`);
        // Re-render
        const container = document.getElementById('app-view');
        if (container) {
          container.innerHTML = window.NovelCastViews.library.render();
          window.NovelCastViews.library.init();
        }
      });
    });

    // Delete Book button
    document.querySelectorAll('.btn-delete-book').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        NC.deleteUserUpload(userId, bookId);
        NC.toast('Book removed from library');
        // Re-render
        const container = document.getElementById('app-view');
        if (container) {
          container.innerHTML = window.NovelCastViews.library.render();
          window.NovelCastViews.library.init();
        }
      });
    });
  }
};
