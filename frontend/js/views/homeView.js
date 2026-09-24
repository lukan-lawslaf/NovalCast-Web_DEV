window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.home = {
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const featured = NC.books.slice(0, 2);
    const popular = NC.books.slice(2, 8);
    const audiobooks = NC.books.slice(0, 3);
    const genres = [
      { name: 'Philosophy', count: '12 books', icon: 'psychology' },
      { name: 'Memoir', count: '8 books', icon: 'auto_stories' },
      { name: 'Classic Fiction', count: '15 books', icon: 'menu_book' },
      { name: 'Self-Development', count: '19 books', icon: 'trending_up' },
      { name: 'Poetry', count: '6 books', icon: 'history_edu' },
      { name: 'Sci-Fi', count: '11 books', icon: 'rocket_launch' }
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
            <h3 class="text-[19px] font-bold tracking-wide text-[#F3DCA0]">Popular Books</h3>
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
            <div class="bg-[#121620] border border-[#222B3A] hover:border-goldAccent/40 rounded-xl p-4 flex gap-4 items-center transition-all duration-300 hover:-translate-y-1 shadow-lg group">
              <div class="w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-md">
                ${window.NovelCastView.cover(b)}
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] uppercase tracking-wider text-goldAccent font-semibold">${NC.escapeHtml(b.genre)}</span>
                <h4 class="text-[14px] font-bold text-white truncate mt-0.5 group-hover:text-goldAccent transition-colors">${NC.escapeHtml(b.title)}</h4>
                <p class="text-[12px] text-[#8E99A8] truncate">${NC.escapeHtml(b.author)}</p>
                <div class="flex items-center gap-3 mt-2 text-[11px] text-[#737F92]">
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
            <a href="#/search?q=${encodeURIComponent(g.name)}" class="bg-[#121620] border border-[#222B3A] hover:border-goldAccent/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 hover:bg-[#181E2C] group">
              <span class="material-symbols-outlined text-goldAccent text-[26px] group-hover:scale-110 transition-transform">${g.icon}</span>
              <span class="text-[13px] font-semibold text-[#D3DBE8] group-hover:text-goldAccent transition-colors">${g.name}</span>
              <span class="text-[11px] text-[#6E7B8F]">${g.count}</span>
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
  }
};
