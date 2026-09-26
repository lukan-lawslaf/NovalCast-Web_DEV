window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.home = {
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const allBooks = NC.books || [];
    const trendingBooks = allBooks.filter(b => b.trending);
    const featured = trendingBooks.length >= 2 ? trendingBooks.slice(0, 2) : allBooks.slice(0, 2);
    // Take next 12 books for a rich grid
    const popular = allBooks.filter(b => !featured.some(f => f.id === b.id)).slice(0, 12);
    // Audiobooks showcase
    const audiobooks = allBooks.slice(0, 3);

    const genres = [
      { name: 'Adventure & Sea', search: 'Adventure', count: '3 classics', icon: 'sailing' },
      { name: 'Science Fiction', search: 'Science Fiction', count: '3 classics', icon: 'rocket_launch' },
      { name: 'Gothic & Horror', search: 'Gothic', count: '3 classics', icon: 'castle' },
      { name: 'Classic Detective', search: 'Detective', count: '3 classics', icon: 'search' },
      { name: 'Romance & Drama', search: 'Romance', count: '3 classics', icon: 'favorite' },
      { name: 'Literary Classics', search: 'Fiction', count: '5 classics', icon: 'auto_stories' }
    ];

    return `
      <!-- Featured Hero Cards -->
      <section class="mt-2 relative w-full">
        <div class="flex flex-col lg:flex-row gap-6 items-stretch" id="featured-row">
          ${featured[0] ? NCPage.featuredCard(featured[0]) : ''}
          ${featured[1] ? NCPage.featuredCard(featured[1], 'secondary') : ''}
        </div>
      </section>

      <!-- Popular Books Section -->
      <section class="mt-10 mb-6">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-goldAccent text-[22px]">star</span>
            <h3 class="text-[19px] font-bold tracking-wide text-primary">Popular Books</h3>
          </div>
          <a class="text-[12px] text-[#7A8597] hover:text-goldAccent transition-colors flex items-center gap-1 font-medium" href="#/search">
            <span>View all</span>
            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5" id="popular-grid">
          ${popular.map(b => NCPage.popularCard(b)).join('')}
        </div>
      </section>

      <!-- Audiobooks Showcase -->
      <section class="mt-10 mb-8">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-goldAccent text-[22px]">headphones</span>
            <h3 class="text-[19px] font-bold tracking-wide text-[#F3DCA0]">Featured Audiobooks</h3>
          </div>
          <a class="text-[12px] text-[#7A8597] hover:text-goldAccent transition-colors flex items-center gap-1 font-medium" href="#/search">
            <span>Explore Audio</span>
            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          ${audiobooks.map(b => `
            <div class="bg-[#161B24] border border-[#242C3A] hover:border-goldAccent/50 rounded-2xl p-4 flex gap-4 items-center transition-all duration-300 hover:-translate-y-1 shadow-lg group">
              <div class="w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-md">
                ${window.NovelCastView.cover(b)}
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] uppercase tracking-wider text-goldAccent font-semibold">${NC.escapeHtml(b.genre)}</span>
                <h4 class="text-[14px] font-bold text-white truncate mt-0.5 group-hover:text-goldAccent transition-colors">${NC.escapeHtml(b.title)}</h4>
                <p class="text-[12px] text-[#8E97A6] truncate">${NC.escapeHtml(b.author)}</p>
                <div class="flex items-center gap-3 mt-2 text-[11px] text-[#7E8798]">
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">schedule</span>${NC.escapeHtml(b.duration)}</span>
                  <span class="flex items-center gap-1 text-goldAccent font-medium">★ ${b.rating.toFixed(1)}</span>
                </div>
              </div>
              <a href="#/book?book=${b.id}" class="w-9 h-9 rounded-full bg-goldAccent text-[#121620] flex items-center justify-center shrink-0 shadow-md hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
              </a>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Browse by Genre Chips -->
      <section class="mt-8 mb-12">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-goldAccent text-[22px]">category</span>
            <h3 class="text-[19px] font-bold tracking-wide text-[#F3DCA0]">Explore Genres</h3>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${genres.map(g => `
            <a href="#/search?genre=${encodeURIComponent(g.search)}" class="bg-[#161B24] border border-[#242C3A] hover:border-goldAccent/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 hover:bg-[#1C222E] group">
              <span class="material-symbols-outlined text-goldAccent text-[26px] group-hover:scale-110 transition-transform">${g.icon}</span>
              <span class="text-[13px] font-semibold text-[#D3DBE8] group-hover:text-goldAccent transition-colors">${g.name}</span>
              <span class="text-[11px] text-[#7E8798]">${g.count}</span>
            </a>
          `).join('')}
        </div>
      </section>
    `;
  },
  init: function () {
    if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
      window.NovelCastApp.bindInteractiveElements();
    }

    // Refresh if live catalog loads while on home view
    const onRefresh = () => {
      const container = document.getElementById('app-view');
      const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
      if (container && (hash === 'home' || !hash)) {
        container.innerHTML = window.NovelCastViews.home.render();
        if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
          window.NovelCastApp.bindInteractiveElements();
        }
      }
    };

    document.addEventListener('novelcast:books-loaded', onRefresh, { once: true });
  }
};
