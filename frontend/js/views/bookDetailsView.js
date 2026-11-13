// Show the selected book, fetch chapter links, and mount its community-rating controls.
window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.bookDetails = {
  // Return screen HTML; the router inserts it before init runs.
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const bookId = query.book || 'pride-and-prejudice';
    const book = NC.getExactBook(bookId);
    if (!book) return '<p class="p-6" role="status" id="book-route-status">Finding this book…</p>';

    return `
      <!-- Book Details Hero -->
      <div class="space-y-8 max-w-7xl mx-auto pb-16">
        ${NCPage.detailHero(book)}

        <!-- Chapters & Reviews Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-7" id="book-chapters-wrapper">
            ${NCPage.chapterList(book)}
          </div>
          <div class="lg:col-span-5">
            ${NCPage.reviews(book)}
          </div>
        </div>

        <!-- You Might Also Like -->
        <div class="pt-6">
          ${NCPage.likeRow(book)}
        </div>
      </div>
    `;
  },
  // Find the inserted elements, attach interactions and prepare cleanup for navigation.
  init: function () {
    const controller = new AbortController();
    // This closure remembers this screen's resources so leaving the route can release them.
    this.destroy = () => { controller.abort(); if (this.unmountRatings) this.unmountRatings(); };
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const bookId = query.book || 'pride-and-prejudice';
    const book = NC.getExactBook(bookId);
    if (!book) {
      const status = document.getElementById('book-route-status');
      NC.fetchBookDetails(bookId).then(() => {
        if (controller.signal.aborted || !status?.isConnected) return;
        if (!NC.getExactBook(bookId)) {
          status.textContent = 'This book is unavailable. Browse the catalog to choose another.';
          return;
        }
        const container = document.getElementById('app-view');
        container.innerHTML = this.render();
        this.init();
      });
      return;
    }
    this.unmountRatings = window.NovelCastRatings.mount(document.getElementById('book-ratings'), book);

    if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
      window.NovelCastApp.bindInteractiveElements();
    }

    // Fetch full verified table of contents from MongoDB Atlas if not fully populated
    const targetSlug = book.slug || book.id;
    if (NC.fetchBookDetails) {
      NC.fetchBookDetails(targetSlug).then(updatedBook => {
        if (controller.signal.aborted) return;
        if (!updatedBook || !updatedBook.chaptersList) return;
        const chaptersWrapper = document.getElementById('book-chapters-wrapper');
        if (chaptersWrapper) {
          chaptersWrapper.innerHTML = NCPage.chapterList(updatedBook);
          if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
            window.NovelCastApp.bindInteractiveElements(chaptersWrapper);
          }
        }
      }).catch(err => {
        console.warn('[bookDetailsView] Could not load chapters from backend:', err);
      });
    }
  }
};
