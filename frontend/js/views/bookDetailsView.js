window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.bookDetails = {
  render: function () {
    const NC = window.NovelCast;
    const NCPage = window.NCPage;
    const query = NC.readQuery();
    const bookId = query.book || 'ikigai';
    const book = NC.getBook(bookId) || NC.books[0];

    return `
      <!-- Book Details Hero -->
      <div class="space-y-8 max-w-7xl mx-auto pb-16">
        ${NCPage.detailHero(book)}

        <!-- Chapters & Reviews Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-7">
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
    if (window.NovelCastApp && window.NovelCastApp.bindInteractiveElements) {
      window.NovelCastApp.bindInteractiveElements();
    }
  }
};
