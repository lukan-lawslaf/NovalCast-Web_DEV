window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.bookDetails = {
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const bookId = query.book || 'pride-and-prejudice';
    const book = NC.getBook(bookId) || NC.books[0];

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
  init: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const bookId = query.book || 'pride-and-prejudice';
    const book = NC.getBook(bookId) || NC.books[0];

    if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
      window.NovelCastApp.bindInteractiveElements();
    }

    // Fetch full verified table of contents from MongoDB Atlas if not fully populated
    const targetSlug = book.slug || book.id;
    if (NC.fetchBookDetails) {
      NC.fetchBookDetails(targetSlug).then(updatedBook => {
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
