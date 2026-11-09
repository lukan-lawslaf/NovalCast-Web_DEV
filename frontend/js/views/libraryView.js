window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.library = {
  renderSavedBooks: function () {
    const NC = window.NovelCast;
    const saved = Object.entries(NC.loadState().library)
      .filter(([id, entry]) => !id.startsWith('upload-') && (entry.status || entry.favorite))
      .map(([id]) => NC.getExactBook(id)).filter(Boolean);
    return saved.length ? `<div class="nc-saved-grid">${saved.map(book => `
      <article class="nc-saved-book">
        <a href="#/book?book=${encodeURIComponent(book.id)}" class="nc-saved-cover" aria-label="${NC.escapeHtml(book.title)} details">${window.NovelCastView.cover(book)}</a>
        <a href="#/book?book=${encodeURIComponent(book.id)}" class="nc-saved-title">${NC.escapeHtml(book.title)}</a>
        <p>${NC.escapeHtml(book.author)}</p>
        <button type="button" data-library-remove="${NC.escapeHtml(book.id)}" class="nc-library-text-button" aria-label="Remove ${NC.escapeHtml(book.title)} from your library">Remove from library</button>
      </article>`).join('')}</div>` : '<p class="nc-library-hint">Save a catalog book or bookmark it to see it here.</p>';
  },

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
              Sign in to save books, record manuscript details, and keep a personal reading plan.
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
    const readingPlan = window.NovelCastLibrary?.getReadingPlan() || { dailyMinutes: 20, favoriteGenre: '' };

    return `
      <!-- Library Overview Header -->
      <section class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-[#1E2533]">
          <div class="flex items-center gap-4">
            <div class="w-13 h-13 rounded-full bg-[#18202D] border border-goldAccent/30 flex items-center justify-center text-goldAccent shadow-md shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke-dasharray="40" stroke-dashoffset="0" opacity="1"></path><circle cx="12" cy="7" r="4" opacity="1"></circle></g></svg>
            </div>
            <div>
              <div class="nc-library-title flex items-center gap-2.5">
                <h1 class="text-2xl md:text-3xl font-bold text-white font-sans tracking-wide">My Library & Manuscripts</h1>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-goldAccent/15 text-goldAccent border border-goldAccent/30">Private library</span>
              </div>
              <p class="text-[13px] text-[#8C98AC] mt-0.5">
                Private collection of <span class="text-white font-medium">${NC.escapeHtml(user.email || 'Member')}</span>
              </p>
            </div>
          </div>

          <div class="nc-library-summary flex items-center gap-5">
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
            <button type="button" id="btn-lib-signout" class="p-2 rounded-xl text-[#7E8B9E] hover:text-red-300 hover:bg-[#1A202C] transition-all" title="Sign Out" aria-label="Sign out">
              <span class="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </section>

      <section class="nc-library-tools" aria-labelledby="reading-plan-heading">
        <div class="nc-reading-plan">
          <h2 id="reading-plan-heading">Your reading plan</h2>
          <p class="nc-library-hint">Set a daily goal. Your submitted plan is saved with your library.</p>
          <form id="reading-plan-form">
            <div class="nc-reading-plan-fields">
              <label for="daily-minutes">Daily reading goal (minutes)
                <input id="daily-minutes" name="dailyMinutes" type="number" min="5" max="240" step="1" required value="${Number(readingPlan.dailyMinutes) || 20}" aria-describedby="daily-minutes-help">
              </label>
              <label for="favorite-genre">Favorite genre (optional)
                <input id="favorite-genre" name="favoriteGenre" type="text" maxlength="80" value="${NC.escapeHtml(readingPlan.favoriteGenre)}" placeholder="e.g. Mystery">
              </label>
            </div>
            <p id="daily-minutes-help" class="nc-library-hint">Choose a goal between 5 and 240 minutes.</p>
            <button type="submit" class="nc-library-button">Save reading plan</button>
            <p id="reading-plan-feedback" class="nc-library-feedback" role="status" aria-live="polite"></p>
          </form>
        </div>
        <div class="nc-library-backup">
          <h2>Library backup</h2>
          <p id="library-sync-status" class="nc-library-sync-status" role="status" aria-live="polite"></p>
          <p class="nc-library-hint">Your plan, saved books, and manuscript details sync to your account’s JSON file when the server is available. Downloads include this device’s latest changes, even while a save is pending.</p>
          <div class="nc-library-tool-buttons">
            <button id="download-library-json" type="button" class="nc-library-button">Download JSON</button>
            <button id="retry-sync" type="button" class="nc-library-button nc-library-button-secondary">Sync now</button>
          </div>
          <p class="nc-library-hint">The backup contains library data only. Manuscript contents and sign-in details are excluded.</p>
        </div>
      </section>

      <section class="nc-saved-section" aria-labelledby="saved-books-heading">
        <h2 id="saved-books-heading">Saved catalog books</h2>
        ${window.NovelCastLibrary?.hasDeviceBookmarks() ? `
          <div class="nc-library-hint">
            <p>Older bookmarks were shared on this browser. Add them to this account only if they are yours.</p>
            <button type="button" id="import-device-bookmarks" class="nc-library-text-button">Add my older device bookmarks</button>
          </div>` : ''}
        <div id="saved-catalog-books">${this.renderSavedBooks()}</div>
      </section>

      <!-- Drag & Drop Metadata Section -->
      <section class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-[17px] font-bold text-[#F1D69E] flex items-center gap-2">
              <span>Add manuscript details</span>
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
              Choose a file to record its details
            </h4>
            <p class="text-xs text-[#8E9BAC] mt-1 max-w-md">
              Supports <span class="text-goldAccent font-medium">EPUB, PDF, TXT, MD</span> files. Saves the title, format, and size; the file itself is not uploaded or available to read.
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
          <h3 class="text-[18px] font-bold text-[#F1D69E]">
            My Manuscript Details (${userUploads.length})
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
                No manuscript details saved yet. Choose an EPUB, PDF, or text file above to add its title, format, and size to your shelf.
              </p>
            </div>
          ` : `
            <!-- Uploaded Books Grid (Matching Standard NovelCast Cards) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              ${userUploads.map(book => `
                <div class="flex flex-col group relative">
                  <div class="relative">
                  <a href="#/book?book=${encodeURIComponent(book.id)}" class="block">
                    <div class="relative w-full aspect-[1/1.42] rounded-xl overflow-hidden book-shadow book-spine bg-[#1B212E] border border-white/5 transition-transform duration-200 group-hover:-translate-y-1">
                      <!-- Top Rating & Format Badge -->
                      <div class="absolute top-2 left-2 z-20 flex items-center gap-1 bg-[#1A212E]/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-white">
                        <span class="text-goldAccent text-[9px]">★</span> ${Number.isFinite(book.rating) && book.rating > 0 ? book.rating.toFixed(1) : 'New'}
                      </div>

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
                          <div class="h-full bg-goldAccent shadow-[0_0_8px_#f5d77f]" style="width: ${Math.min(100, book.progress)}%"></div>
                        </div>
                      ` : ''}
                    </div>
                  </a>
                    <button type="button" class="btn-delete-book absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-[#1A212E]/90 backdrop-blur-md border border-white/10 text-[#8E9BAC] hover:text-red-400 flex items-center justify-center transition-colors shadow" data-book-id="${NC.escapeHtml(book.id)}" aria-label="Remove book" title="Remove book">
                      <span class="material-symbols-outlined text-[13px]">delete</span>
                    </button>
                  </div>

                  <!-- Book Metadata Underneath -->
                  <div class="mt-2.5 flex flex-col">
                    <a href="#/book?book=${encodeURIComponent(book.id)}" class="text-[12px] font-medium text-[#D6DCE7] group-hover:text-goldAccent transition-colors truncate">
                      ${NC.escapeHtml(book.title)}
                    </a>
                    <div class="flex items-center justify-between text-[11px] text-[#768092] mt-0.5">
                      <span class="flex items-center gap-1 font-mono text-[10px] text-goldAccent/90">
                        ${Number.isFinite(book.progress) && book.progress > 0 ? `${Math.min(100, book.progress)}% read` : NC.escapeHtml(book.format || 'EPUB')}
                      </span>
                      <button class="favorite-toggle text-[#768092] hover:text-goldAccent transition-colors" data-favorite-toggle="${NC.escapeHtml(book.id)}" aria-label="Bookmark" type="button">
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
    const container = document.getElementById('app-view');
    const pixelCardEl = document.getElementById('pixel-upload-card');
    const pixelCard = pixelCardEl && window.PixelCard?.init(pixelCardEl, { variant: 'gold' });
    const controller = new AbortController();
    const signal = controller.signal;
    const service = window.NovelCastLibrary;
    let uploadTimer;
    let refreshTimer;
    let planDirty = false;
    let disposed = false;
    const ownsView = () => !disposed && (auth.getUser()?.id || auth.getUser()?.email) === userId;

    this.destroy = () => {
      disposed = true;
      controller.abort();
      clearInterval(uploadTimer);
      clearTimeout(refreshTimer);
      pixelCard?.destroy();
    };

    const refresh = () => {
      if (!ownsView() || !container || document.body.dataset.route !== 'library') return;
      const form = document.getElementById('reading-plan-form');
      const draft = planDirty && form ? {
        dailyMinutes: form.elements.dailyMinutes.value,
        favoriteGenre: form.elements.favoriteGenre.value,
        focused: form.contains(document.activeElement) ? document.activeElement.id : null,
      } : null;
      this.destroy();
      container.innerHTML = this.render();
      this.init();
      if (draft) {
        const restored = document.getElementById('reading-plan-form');
        restored.elements.dailyMinutes.value = draft.dailyMinutes;
        restored.elements.favoriteGenre.value = draft.favoriteGenre;
        restored.dispatchEvent(new Event('input', { bubbles: true }));
        if (draft.focused) document.getElementById(draft.focused)?.focus({ preventScroll: true });
      }
      window.NovelCastApp?.bindInteractiveElements(container);
    };

    const paintStatus = () => {
      if (!ownsView()) return;
      const status = service?.getStatus() || { phase: 'pending', message: 'Library sync is unavailable. Your changes remain on this device.' };
      const statusEl = document.getElementById('library-sync-status');
      if (statusEl) {
        statusEl.textContent = status.message;
        statusEl.dataset.phase = status.phase;
      }
      const retry = document.getElementById('retry-sync');
      if (retry) retry.disabled = status.phase === 'loading' || status.phase === 'saving';
    };
    paintStatus();
    document.getElementById('import-device-bookmarks')?.addEventListener('click', () => {
      if (!ownsView()) return;
      if (!service?.importDeviceBookmarks()) NC.toast('The bookmarks could not be saved on this device.');
      else NC.toast('Device bookmarks added. Check the sync status for your account backup.');
    }, { signal });
    document.addEventListener('novelcast:library-sync', paintStatus, { signal });
    document.addEventListener('novelcast:library-loaded', () => {
      // Completing the metadata add will refresh the view itself.
      if (!uploadTimer && !refreshTimer) refresh();
    }, { signal });
    const paintSavedBooks = () => {
      if (!ownsView()) return;
      const saved = document.getElementById('saved-catalog-books');
      if (!saved) return;
      saved.innerHTML = this.renderSavedBooks();
      window.NovelCastApp?.bindInteractiveElements(saved);
    };
    document.addEventListener('novelcast:state', paintSavedBooks, { signal });
    document.addEventListener('novelcast:books-loaded', paintSavedBooks, { signal });
    container?.addEventListener('click', event => {
      const remove = event.target.closest('[data-library-remove]');
      if (!remove || !ownsView()) return;
      const state = NC.loadState();
      delete state.library[remove.dataset.libraryRemove];
      NC.saveState(state);
      NC.toast('Book removed from your library');
    }, { signal });

    const planForm = document.getElementById('reading-plan-form');
    planForm?.addEventListener('input', () => { planDirty = true; }, { signal });
    planForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!ownsView() || !planForm.reportValidity()) return;
      const feedback = document.getElementById('reading-plan-feedback');
      try {
        const saved = service?.saveReadingPlan({
          dailyMinutes: Number(planForm.elements.dailyMinutes.value),
          favoriteGenre: planForm.elements.favoriteGenre.value.trim(),
        });
        if (!saved) throw new Error('Your reading plan could not be saved. Please try again.');
        planDirty = false;
        feedback.textContent = 'Saved on this device. Check the backup status for account sync.';
      } catch (error) {
        feedback.textContent = error.message || 'Your reading plan could not be saved. Please try again.';
      }
    }, { signal });
    document.getElementById('retry-sync')?.addEventListener('click', async () => {
      if (!ownsView()) return;
      try { await service?.sync(); }
      catch { if (ownsView()) NC.toast('Sync could not finish. Your changes remain on this device.'); }
      paintStatus();
    }, { signal });
    document.getElementById('download-library-json')?.addEventListener('click', async event => {
      if (!ownsView()) return;
      const button = event.currentTarget;
      button.disabled = true;
      try {
        if (!service) throw new Error('Library download is unavailable. Please reload the page.');
        await service.download();
      } catch (error) {
        if (ownsView()) NC.toast(error.message || 'The library download could not be prepared.');
      } finally {
        if (ownsView()) button.disabled = false;
      }
    }, { signal });

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
      if (!ownsView() || !file || uploadTimer || refreshTimer) return;

      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const ext = (file.name.split('.').pop() || 'epub').toUpperCase();
      if (!/^(EPUB|PDF|TXT|MD|TEXT)$/.test(ext)) {
        NC.toast('Choose an EPUB, PDF, TXT, or Markdown file.');
        return;
      }
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      if (progressBox) {
        progressBox.classList.remove('hidden');
        filenameEl.textContent = `Recording details: ${file.name}`;
        statusTextEl.textContent = '0%';
        progressBar.style.width = '0%';
      }

      let pct = 0;
      uploadTimer = setInterval(() => {
        if (!ownsView()) {
          clearInterval(uploadTimer);
          uploadTimer = null;
          return;
        }
        pct += 25;
        if (pct >= 100) {
          clearInterval(uploadTimer);
          uploadTimer = null;
          if (progressBar) progressBar.style.width = '100%';
          if (statusTextEl) statusTextEl.textContent = '100%';

          const newBook = {
            id: 'upload-' + (window.crypto.randomUUID?.() || Date.now()),
            title: title.charAt(0).toUpperCase() + title.slice(1),
            author: user.email ? user.email.split('@')[0] : 'Author',
            format: ext,
            size: sizeStr,
            progress: 0,
            chapters: 12,
            genre: 'Manuscript',
            uploadedAt: new Date().toISOString(),
            lastRead: 'Details added'
          };

          if (!NC.addUserUpload(userId, newBook)) {
            if (progressBox) progressBox.classList.add('hidden');
            NC.toast('The book could not be saved on this device.');
            return;
          }
          NC.toast(`"${newBook.title}" added to your library`);

          refreshTimer = setTimeout(refresh, 600);
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
        refresh();
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
        refresh();
      });
    });
  }
};
