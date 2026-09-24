window.NovelCast = (function () {
  const STORE_KEY = 'novelcast.state.v1';
  const SETTINGS_KEY = 'novelcast.settings.v1';

  const demoParagraph = (theme, n) => `${theme} — original demo passage ${n}. This is placeholder content written for a class project so reviewers can see how the reader looks without redistributing copyrighted text. ${theme} themes open in this paragraph to keep typography readable.`;
  const demoChapter = (title, theme) => ({
    title,
    theme,
    paragraphs: [1, 2, 3, 4, 5, 6].map((i) => demoParagraph(theme, i)),
  });

  const books = [
    {
      id: 'ikigai',
      title: 'IKIGAI',
      fullTitle: 'IKIGAI: The Japanese Secret to a Long and Happy Life',
      author: 'Héctor García & Francesc Miralles',
      narrator: 'Kenji Takahashi',
      genre: 'Philosophy',
      tags: ['philosophy', 'longevity', 'japan', 'bestseller'],
      rating: 4.8,
      reviews: 18412,
      listens: '1,23,444',
      duration: '3 hrs 30 mins',
      chapters: 17,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATKSAk8QGkxvw9uq0V1ySz3joFP0HPCv8XtRmN4xii5kmt9zdI7HWOMoyW4KT3HlSLr0V-BClnOeM3Jw8S9_juKvH-ZTelCWZc3_yTOX97l1tNdqEWPED7gDbC_zMolgvc1GASogKcxzXc4Vm6MCbR4l4PdUnCudkfjuRar0Ah61PasW0NBBe1xIOiKEtweeUZCITLjUeKX7aEfSI215E1DN7AXRcvgk2nUPuOii8liWHh1vyrNw3q',
      accent: '#a0cad7',
      description: 'A gentle search for the Japanese concept of purpose, exploring how centenarians in Okinawa weave daily rituals, mindful habits, and resilient community into a long and contented life.',
      shortDescription: 'A philosophy guide that traces the gentle art of purposeful living as practiced in Okinawa.',
      trending: true,
      chaptersList: [
        demoChapter('The Art of Staying Young While Growing Old', 'Quiet wisdom'),
        demoChapter('Escape the Hedonic Treadmill', 'Gentle movement'),
        demoChapter('From Logotherapy to Ikigai', 'Inner reflection'),
        demoChapter('Find Flow in Everything You Do', 'Purpose & flow'),
        demoChapter('Masters of Longevity', 'Centenarian voices'),
        demoChapter('The Ikigai Diet', 'Nourishment'),
      ],
    },
    {
      id: 'bridge-home',
      title: 'THE BRIDGE HOME',
      fullTitle: 'The Bridge Home',
      author: 'Padma Venkatraman',
      narrator: 'Aanya Pillai',
      genre: 'Memoir',
      tags: ['memoir', 'young-adult', 'family', 'fiction'],
      rating: 4.8,
      reviews: 9102,
      listens: '1,11,994',
      duration: '2 hrs 50 mins',
      chapters: 21,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXidzmx3CXnsD-C7SZPcdc-rdjXrYIuaDZ7CnCWyadTbQ8HIuvwOdW4dIpVXIr03aREWQCusNTQkJKuMuw7Oy_JkdcvbMnyBXmfnFXwp1GTqoCnurF1Nr8DJ0ZFyJzqwQdWzx-pkyUK2jsAkRs2Av3MLjCOnBpG4DSfLbeZnPY_YcuvctYRejT3dTepkoLt3wro5Vtd1ZLGJiejAbRc8jJYnWqVGnvQwHUBgAhfEMqu0LlXCdBKKrc',
      accent: '#a0cad7',
      description: 'Two sisters and two brothers in a southern Indian city forge a fragile family as they scavenge, hope, and discover the bridges of love that hold them together.',
      shortDescription: 'A hopeful coming-of-age story about found family and second chances.',
      trending: false,
      chaptersList: [
        demoChapter('Arrival at the Bridge', 'First light'),
        demoChapter('Sisters Together', 'Quiet bonds'),
        demoChapter('Two Boys Appear', 'Open streets'),
        demoChapter('Work and Worry', 'Steady hands'),
        demoChapter('A New Plan', 'Hope rises'),
        demoChapter('Coming Home', 'Earned warmth'),
      ],
    },
    {
      id: 'swords-of-the-son',
      title: 'SWORDS OF THE SON',
      fullTitle: 'Swords of the Son: A Tale of Legends & Betrayal',
      author: 'R. A. Vane & E. Corvo',
      narrator: 'Cyrus Mendez',
      genre: 'Fantasy',
      tags: ['fantasy', 'epic', 'legend', 'adventure'],
      rating: 4.1,
      reviews: 7204,
      listens: '37,904',
      duration: '6 hrs 15 mins',
      chapters: 24,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJhtHMt0mS20Kwds1bI-ooWPNBgOHpiFAwp3XBcUNGvnFUF5kJvd673RTs--oGLTxFbBmFBbWwzRVUg1TGEwkmIRtepcWulMMPYSs4_pu-CQfBdusDBGyUtJ7A7BEa4ph8fIfMrf_lUBMkQZCeOjG7KEWxVfljE9gJniwhQjCW4sLFx-sfN6lDaqNtHAPLo-3NNsZ1K_U63W9EKtxhxCsCKbPGCi_UqxBZkwV0kRi2kph5hHOmBdqm',
      accent: '#1d1f24',
      description: 'A sweeping epic where a reluctant heir must rebuild an exiled brotherhood, master an inherited blade, and challenge the warlords who shaped his past.',
      shortDescription: 'An epic fantasy of brotherhood, exile, and the blade that binds them.',
      trending: false,
      chaptersList: [
        demoChapter('The Exiled Heir', 'Cold wind'),
        demoChapter('A Brother Found', 'Flickering fire'),
        demoChapter('The Reluctant Blade', 'Cold steel'),
        demoChapter('Crossing the Salt Plains', 'Long march'),
        demoChapter('Warlords of the Coast', 'Storm tide'),
        demoChapter('Swords at Dusk', 'Quiet vow'),
      ],
    },
    {
      id: 'mist-and-whispers',
      title: 'MIST & WHISPERS',
      fullTitle: 'Mist & Whispers',
      author: 'Elara Vance',
      narrator: 'Elara Vance',
      genre: 'Fantasy',
      tags: ['fantasy', 'mystery', 'suspense'],
      rating: 4.1,
      reviews: 5402,
      listens: '23,444',
      duration: '4 hrs 40 mins',
      chapters: 16,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrEQwC0otB4D26cTlWFID0FNWq9DfiJ00ZwI0OoZFxZw9icwT2X83MjBp6z27vrsEpZPrhUOwCQzDIMCZAeaeMxOoEO63RKMFwRF6G105bA9e5dbABctrRzKeJN_clxF0eOXb_XelVjPdsrAksLEe8aZjDyW9A1EVWZutAHenlGUdhq9nSqNUof87VBR2Lu5ZHnvXp4npAR4y8G-cMiMBDZNRSDPu8hX5F9uKOIMgWyPzOkIXNpneI',
      accent: '#27423a',
      description: 'A retired cartographer follows a whispered map through a village that keeps vanishing from every atlas in the world.',
      shortDescription: 'A quiet mystery through fog-locked villages and shifting maps.',
      trending: false,
      chaptersList: [
        demoChapter('The Whispered Map', 'Quiet village'),
        demoChapter('Vanishings', 'Footsteps on stone'),
        demoChapter('The Cartographer Returns', 'Steady pen'),
        demoChapter('Glass in the Attic', 'Sharp light'),
        demoChapter('The First Atlas', 'Folded hope'),
        demoChapter('A Door Reopened', 'Soft chime'),
      ],
    },
    {
      id: 'eighty-days',
      title: 'EIGHTY DAYS',
      fullTitle: 'Eighty Days: An Adventure Around the World',
      author: 'Michael J. Sullivan',
      narrator: 'Rhea Kapoor',
      genre: 'Classic',
      tags: ['classic', 'adventure', 'journey'],
      rating: 3.7,
      reviews: 3304,
      listens: '13,094',
      duration: '5 hrs 10 mins',
      chapters: 18,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXidzmx3CXnsD-C7SZPcdc-rdjXrYIuaDZ7CnCWyadTbQ8HIuvwOdW4dIpVXIr03aREWQCusNTQkJKuMuw7Oy_JkdcvbMnyBXmfnFXwp1GTqoCnurF1Nr8DJ0ZFyJzqwQdWzx-pkyUK2jsAkRs2Av3MLjCOnBpG4DSfLbeZnPY_YcuvctYRejT3dTepkoLt3wro5Vtd1ZLGJiejAbRc8jJYnWqVGnvQwHUBgAhfEMqu0LlXCdBKKrc',
      accent: '#c69b46',
      description: 'Two travelers wager that they can circle the globe in eighty days, racing locomotives, rivers, and weather across continents to win a most polite wager.',
      shortDescription: 'A charming global race against time, weather, and disbelief.',
      trending: false,
      chaptersList: [
        demoChapter('The Wager at the Club', 'Quiet certainty'),
        demoChapter('Across the Channel', 'Salt spray'),
        demoChapter('The Long Rail', 'Steam and cinders'),
        demoChapter('An Elephant in the Pass', 'Wide valleys'),
        demoChapter('The Tea Road', 'Quiet stations'),
        demoChapter('Eighty Days Honored', 'Earned applause'),
      ],
    },
    {
      id: 'white-raven',
      title: 'THE WHITE RAVEN',
      fullTitle: 'The White Raven',
      author: 'Elara Vance',
      narrator: 'Imogen Wells',
      genre: 'Fantasy',
      tags: ['fantasy', 'myth', 'north'],
      rating: 4.3,
      reviews: 4612,
      listens: '27,804',
      duration: '4 hrs 20 mins',
      chapters: 15,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC07UxGyD9UslgWD44y88DTog0u9LrZ7iMaMGQRZ1HNIGkcZKq8M8-Pgyz4n5WRZK8shBtVtgd1QehQpYciuzGJ9KkSZ3cNOYaYtn18sloNTWkayojjUyiCCFGUKgx18YnRUVbxJoIL4hhlH2kCNfTdGovinAAkwUm4eNcghm4lGELOzYF8MQrtetkQrKOyyMX3wiu0HiTkx_Cw3-qiXwXf_LglBsa2GMw2dM7K-TGD4lPEoWDiEWL7',
      accent: '#cdd9d9',
      description: 'A northern myth about a bewitched raven who must trade memories for song and finds that every kept secret erases a little more of the world.',
      shortDescription: 'A mythic story about memory, feathers, and the cost of forgetting.',
      trending: false,
      chaptersList: [
        demoChapter('Wings of Ash', 'Cold north'),
        demoChapter('A Memory for a Song', 'Hush and snow'),
        demoChapter('The Hollow Wood', 'Quiet dusk'),
        demoChapter('Hunters on the Ridge', 'Long breath'),
        demoChapter('The Last Feather', 'Soft glow'),
        demoChapter('Return to the Sky', 'Wide wind'),
      ],
    },
    {
      id: 'adorning-the-dark',
      title: 'ADORNING THE DARK',
      fullTitle: 'Adorning the Dark',
      author: 'Andrew Peterson',
      narrator: 'Lyle Hopper',
      genre: 'Memoir',
      tags: ['memoir', 'faith', 'music', 'reflection'],
      rating: 3.6,
      reviews: 2208,
      listens: '17,999',
      duration: '5 hrs 05 mins',
      chapters: 14,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvnYo-jLPAwAO-fNuRMzz5ruYy0sY8U3cD1fs7TXL64m6pNkg7IilKTYFNx-a6ChF6GrUPieLPi5yjuhGtcF0jxhVE4T-Puh_y9aWc2-8_dFi9bOl5zAE9B_DIazwUm--CI2az2-P25DrdlfZ0g3R0VedE7RyJlMQ3JPqc9LXmyYF2q0FRhtsQ8qPnvJ05ReIsMQqI_3SUfW9fgxk-bEd2MoKvGUdxvqQLtT6YEkBOrxPZUEj8IDne',
      accent: '#7c6a4d',
      description: 'A memoir of songwriting, friendship, and the long road of staying creative when the rooms grow quiet.',
      shortDescription: 'A reflective memoir of songwriting, friendship, and small graces.',
      trending: false,
      chaptersList: [
        demoChapter('Long Drives', 'Soft radio'),
        demoChapter('First Open Mic', 'Sweaty palms'),
        demoChapter('Letters from Friends', 'Folded paper'),
        demoChapter('A Studio in the Attic', 'Quiet hum'),
        demoChapter('The Long Pause', 'Empty rooms'),
        demoChapter('Adorning the Dark', 'Tin lantern'),
      ],
    },
    {
      id: 'shadow-saint',
      title: 'SHADOW SAINT',
      fullTitle: 'Shadow Saint: A Heist of Quiet Things',
      author: 'Imogen Wells',
      narrator: 'Imogen Wells',
      genre: 'Fantasy',
      tags: ['fantasy', 'heist', 'noir'],
      rating: 4.2,
      reviews: 3054,
      listens: '21,204',
      duration: '6 hrs 40 mins',
      chapters: 22,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJhtHMt0mS20Kwds1bI-ooWPNBgOHpiFAwp3XBcUNGvnFUF5kJvd673RTs--oGLTxFbBmFBbWwzRVUg1TGEwkmIRtepcWulMMPYSs4_pu-CQfBdusDBGyUtJ7A7BEa4ph8fIfMrf_lUBMkQZCeOjG7KEWxVfljE9gJniwhQjCW4sLFx-sfN6lDaqNtHAPLo-3NNsZ1K_U63W9EKtxhxCsCKbPGCi_UqxBZkwV0kRi2kph5hHOmBdqm',
      accent: '#0e1218',
      description: 'A street-blessed thief pulls off impossible jobs for people who never speak above a whisper, until a final score drags her into a saint she never wanted to become.',
      shortDescription: 'A low-magic heist of quiet rooms, soft hands, and small saints.',
      trending: false,
      chaptersList: [
        demoChapter('Soft Hands', 'Rain on tin'),
        demoChapter('The Saints of Side Streets', 'Lamplit doors'),
        demoChapter('A Map in Three Hands', 'Folded paper'),
        demoChapter('The Quiet Score', 'Hush and bolt'),
        demoChapter('A Blessing Returned', 'Cold chapel'),
        demoChapter('Becoming a Saint', 'Steady gait'),
      ],
    },
  ];

  const byId = Object.fromEntries(books.map((b) => [b.id, b]));

  const defaultSettings = {
    font: 'serif',
    fontSize: 18,
    palette: 'obsidian',
    lineSpacing: 'comfortable',
    focus: 'off',
    layout: 'book',
  };

  function loadSettings() {
    try {
      return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    } catch (e) {
      return { ...defaultSettings };
    }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return Object.assign({ library: {}, collections: [] }, raw);
    } catch (e) {
      return { library: {}, collections: [] };
    }
  }
  function saveState(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
    document.dispatchEvent(new CustomEvent('novelcast:state'));
  }

  function normalizeBook(match) {
    if (!match) return null;
    match.rating = typeof match.rating === 'number' ? match.rating : 4.8;
    match.reviews = typeof match.reviews === 'number' ? match.reviews : 84;
    match.listens = match.listens || '1,280';
    match.duration = match.duration || '3 hrs 15 mins';
    match.chapters = typeof match.chapters === 'number' ? match.chapters : 12;
    match.genre = match.genre || 'Manuscript';
    match.narrator = match.narrator || 'AI Atelier Voice';
    match.description = match.description || `A private manuscript uploaded by ${match.author || 'the patron'}. Formatted for nocturnal contemplation, with synchronized reading controls, typography margins, and binaural sanctuary playback.`;
    match.shortDescription = match.shortDescription || `Private manuscript in ${match.format || 'EPUB'} format.`;
    match.accent = match.accent || '#f5d77f';
    if (!match.chaptersList || !match.chaptersList.length) {
      match.chaptersList = [
        demoChapter('Prologue & First Light', 'Opening meditation'),
        demoChapter('Chapter I: The Journey Begins', 'Quiet contemplation'),
        demoChapter('Chapter II: Unfolding Pages', 'Atmospheric prose'),
        demoChapter('Chapter III: Midnight Revelations', 'Devotion & memory'),
        demoChapter('Chapter IV: Whispers in the Sanctuary', 'Acoustic sanctuary'),
        demoChapter('Epilogue: The Written Word', 'Closing cadence')
      ];
    }
    return match;
  }

  function getBook(id) {
    if (byId[id]) return normalizeBook(byId[id]);

    // Check uploaded manuscripts in user storage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('novelcast.uploads.')) {
        try {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          const match = list.find(b => b.id === id);
          if (match) {
            normalizeBook(match);
            byId[id] = match;
            return match;
          }
        } catch (e) {}
      }
    }
    return null;
  }
  function bookUrl(page, id, chapter) {
    const params = new URLSearchParams();
    if (id) params.set('book', id);
    if (typeof chapter === 'number') params.set('chapter', String(chapter));
    const q = params.toString();
    return page + (q ? '?' + q : '');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function readQuery() {
    const searchParams = new URLSearchParams(location.search);
    const hashQuery = location.hash.includes('?') ? location.hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);
    const getVal = (k) => hashParams.get(k) || searchParams.get(k);

    return {
      book: getVal('book'),
      chapter: (hashParams.has('chapter') || searchParams.has('chapter')) ? Math.max(0, parseInt(getVal('chapter'), 10) || 0) : null,
      page: getVal('page'),
      q: getVal('q'),
      collection: getVal('collection'),
    };
  }
  function setQuery(params) {
    const url = new URL(location.href);
    Object.keys(params).forEach((k) => {
      if (params[k] === null || params[k] === undefined || params[k] === '') url.searchParams.delete(k);
      else url.searchParams.set(k, String(params[k]));
    });
    history.replaceState({}, '', url);
  }
  function starIcon(filled) {
    return `<span class="material-symbols-outlined icon-star${filled ? ' is-filled' : ''}" aria-hidden="true">star</span>`;
  }

  function ensureEntry(state, id) {
    if (!state.library[id]) state.library[id] = { status: null, favorite: false, chapter: 0, page: 0, bookmarks: [] };
    return state.library[id];
  }
  function saveBookState(id, patch) {
    const state = loadState();
    const entry = ensureEntry(state, id);
    Object.assign(entry, patch || {});
    saveState(state);
    return entry;
  }
  function libraryAllIds() {
    return Object.keys(loadState().library).filter((id) => byId[id]);
  }
  function statusOf(id) {
    return loadState().library[id] && loadState().library[id].status;
  }

  function toast(message) {
    let host = document.getElementById('nc-toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'nc-toast';
      host.className = 'nc-toast';
      document.body.appendChild(host);
    }
    host.textContent = message;
    host.classList.add('is-visible');
    clearTimeout(host._t);
    host._t = setTimeout(() => host.classList.remove('is-visible'), 2200);
  }

  function getUserUploadsKey(userId) {
    return `novelcast.uploads.${userId || 'guest'}`;
  }

  function getUserUploads(userId) {
    try {
      const raw = localStorage.getItem(getUserUploadsKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addUserUpload(userId, book) {
    const list = getUserUploads(userId);
    normalizeBook(book);
    // Add default progress if missing
    book.progress = book.progress || 0;
    book.uploadedAt = book.uploadedAt || new Date().toISOString();
    book.lastRead = book.lastRead || 'Just added';
    list.unshift(book);
    try {
      localStorage.setItem(getUserUploadsKey(userId), JSON.stringify(list));
    } catch (e) {
      console.error('Storage full or error:', e);
    }
    // Also add to active byId cache
    byId[book.id] = book;
    return book;
  }

  function updateUserUploadProgress(userId, bookId, progress, lastRead) {
    const list = getUserUploads(userId);
    const item = list.find(b => b.id === bookId);
    if (item) {
      item.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
      if (lastRead) item.lastRead = lastRead;
      try {
        localStorage.setItem(getUserUploadsKey(userId), JSON.stringify(list));
      } catch (e) {}
      if (byId[bookId]) {
        byId[bookId].progress = item.progress;
      }
    }
    return item;
  }

  function deleteUserUpload(userId, bookId) {
    let list = getUserUploads(userId);
    list = list.filter(b => b.id !== bookId);
    try {
      localStorage.setItem(getUserUploadsKey(userId), JSON.stringify(list));
    } catch (e) {}
    delete byId[bookId];
    return list;
  }

  return {
    books,
    byId,
    defaultSettings,
    loadSettings,
    saveSettings,
    loadState,
    saveState,
    getBook,
    bookUrl,
    readQuery,
    setQuery,
    escapeHtml,
    starIcon,
    ensureEntry,
    saveBookState,
    libraryAllIds,
    statusOf,
    toast,
    getUserUploads,
    addUserUpload,
    updateUserUploadProgress,
    deleteUserUpload
  };
})();