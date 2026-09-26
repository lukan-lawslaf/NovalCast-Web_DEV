window.NovelCast = (function () {
  const STORE_KEY = 'novelcast.state.v1';
  const SETTINGS_KEY = 'novelcast.settings.v1';
  const CATALOG_CACHE_KEY = 'novelcast.catalog.cache.v1';

  const API_BASE = (window.__ENV__ && window.__ENV__.API_BASE) || 'http://localhost:4000/api';

  // Aesthetic curated metadata overrides for the 20 MongoDB Atlas books
  const BOOK_METADATA_PRESETS = {
    'pride-and-prejudice': {
      genre: 'Classic Romance',
      narrator: 'Clara Ravenswood (Sanctuary Voice)',
      accent: '#D4AF37',
      rating: 4.9,
      reviews: 18420,
      listens: '198,164',
      trending: true,
    },
    'moby-dick': {
      genre: 'Adventure & Sea',
      narrator: 'Jonathan Vance (Maritime Voice)',
      accent: '#2A4D69',
      rating: 4.8,
      reviews: 14200,
      listens: '89,450',
      trending: true,
    },
    'the-adventures-of-sherlock-holmes': {
      genre: 'Classic Detective',
      narrator: 'Arthur Pendelton (Oxford Chamber)',
      accent: '#7A6248',
      rating: 4.9,
      reviews: 21300,
      listens: '142,300',
      trending: true,
    },
    'jane-eyre': {
      genre: 'Romance & Drama',
      narrator: 'Eleanor Vance (Atmospheric Whisper)',
      accent: '#8F4F58',
      rating: 4.8,
      reviews: 11500,
      listens: '76,200',
      trending: true,
    },
    'frankenstein': {
      genre: 'Gothic Horror',
      narrator: 'Victor Thorne (Nocturnal Gothic)',
      accent: '#27423A',
      rating: 4.8,
      reviews: 16800,
      listens: '124,500',
      trending: true,
    },
    'a-tale-of-two-cities': {
      genre: 'Literary & Historical',
      narrator: 'Oliver Sterling (London Chamber)',
      accent: '#8B263E',
      rating: 4.7,
      reviews: 9800,
      listens: '65,400',
      trending: false,
    },
    'the-war-of-the-worlds': {
      genre: 'Science Fiction',
      narrator: 'David Kensington (Astrophysical)',
      accent: '#9C3D1E',
      rating: 4.8,
      reviews: 13400,
      listens: '92,100',
      trending: true,
    },
    'alices-adventures-in-wonderland': {
      genre: 'Children & Fantasy',
      narrator: 'Alice Montgomery (Whimsical Reverie)',
      accent: '#4A6984',
      rating: 4.9,
      reviews: 19500,
      listens: '158,000',
      trending: true,
    },
    'around-the-world-in-eighty-days': {
      genre: 'Adventure & Travel',
      narrator: 'Pierre Laurent (Continental Explorer)',
      accent: '#C69B46',
      rating: 4.7,
      reviews: 8900,
      listens: '58,200',
      trending: false,
    },
    'dracula': {
      genre: 'Gothic Horror',
      narrator: 'Julian Cross (Midnight Gothic)',
      accent: '#4A1525',
      rating: 4.9,
      reviews: 22100,
      listens: '165,300',
      trending: true,
    },
    'the-metamorphosis': {
      genre: 'Psychological Fiction',
      narrator: 'Maximilian Weber (Prague Nocturne)',
      accent: '#3F4E4F',
      rating: 4.7,
      reviews: 12200,
      listens: '84,100',
      trending: false,
    },
    'the-great-gatsby': {
      genre: 'Classic Literature',
      narrator: 'Julian Sterling (Jazz Age Velvet)',
      accent: '#D4AF37',
      rating: 4.8,
      reviews: 17600,
      listens: '135,200',
      trending: true,
    },
    'the-hound-of-the-baskervilles': {
      genre: 'Mystery & Suspense',
      narrator: 'Arthur Pendelton (Devonshire Moor)',
      accent: '#2C3E50',
      rating: 4.8,
      reviews: 10400,
      listens: '71,900',
      trending: true,
    },
    'the-picture-of-dorian-gray': {
      genre: 'Gothic & Decadence',
      narrator: 'Sebastian Wilde (Decadent Salon)',
      accent: '#583D72',
      rating: 4.8,
      reviews: 15300,
      listens: '112,800',
      trending: true,
    },
    'the-time-machine': {
      genre: 'Science Fiction',
      narrator: 'David Kensington (Chronometric)',
      accent: '#466365',
      rating: 4.6,
      reviews: 7800,
      listens: '52,400',
      trending: false,
    },
    'the-works-of-edgar-allan-poe-volume-1': {
      genre: 'Mystery & Macabre',
      narrator: 'Vincent Raven (Binaural Macabre)',
      accent: '#1E232A',
      rating: 4.9,
      reviews: 14700,
      listens: '98,300',
      trending: false,
    },
    'dr-jekyll-and-mr-hyde': {
      genre: 'Gothic & Psychological',
      narrator: 'Edward Hyde (Dual Tone)',
      accent: '#382039',
      rating: 4.7,
      reviews: 9100,
      listens: '63,500',
      trending: false,
    },
    'treasure-island': {
      genre: 'Adventure & Sea',
      narrator: 'Duncan Ross (Highland Mariner)',
      accent: '#634832',
      rating: 4.7,
      reviews: 8400,
      listens: '54,100',
      trending: false,
    },
    'twenty-thousand-leagues-under-the-sea': {
      genre: 'Science Fiction & Sea',
      narrator: 'Captain Nemo (Abyssal Resonance)',
      accent: '#1B4965',
      rating: 4.8,
      reviews: 11200,
      listens: '78,400',
      trending: false,
    },
    'wuthering-heights': {
      genre: 'Romance & Drama',
      narrator: 'Imogen Cross (Yorkshire Moor)',
      accent: '#533E2D',
      rating: 4.7,
      reviews: 10800,
      listens: '73,600',
      trending: false,
    }
  };

  // Legacy demo ID mapping for backward compatibility
  const LEGACY_ID_MAP = {
    'ikigai': 'pride-and-prejudice',
    'eighty-days': 'around-the-world-in-eighty-days',
    'mist-and-whispers': 'the-hound-of-the-baskervilles',
    'swords-of-the-son': 'treasure-island',
    'white-raven': 'the-time-machine',
    'adorning-the-dark': 'the-picture-of-dorian-gray',
    'shadow-saint': 'the-adventures-of-sherlock-holmes',
    'bridge-home': 'jane-eyre',
  };

  // Clean primary title helper (strips subtitles like "; or, the modern prometheus")
  function cleanTitle(title) {
    if (!title) return 'Untitled';
    return title.split(/;|\s:\s|\s\/\s/)[0].trim();
  }

  // Transform backend MongoDB book object into canonical NovelCast book object
  function transformBackendBook(b) {
    if (!b) return null;
    const slug = b.slug || cleanTitle(b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const meta = BOOK_METADATA_PRESETS[slug] || {};
    const title = cleanTitle(b.title);
    const rawGenre = (b.subjects && b.subjects[0]) || 'Classic';
    const genre = meta.genre || (rawGenre.includes('Fiction') ? 'Classic Fiction' : rawGenre.split('--')[0].trim());
    const narrator = meta.narrator || 'AI Atelier Sanctuary Voice';
    const accent = meta.accent || '#D4AF37';

    const wordCount = b.totalWordCount || 50000;
    const hours = Math.max(1, Math.floor(wordCount / 140 / 60));
    const mins = Math.floor((wordCount / 140) % 60);
    const duration = `${hours} hr${hours > 1 ? 's' : ''} ${mins} mins`;

    const listens = meta.listens || (b.downloadCount ? b.downloadCount.toLocaleString() : '48,200');
    const rating = meta.rating || (4.6 + (((b.gutendexId || 50) % 4) * 0.1));
    const reviews = meta.reviews || Math.round((b.downloadCount || 10000) / 10);

    return {
      id: slug,
      slug: slug,
      _id: b._id,
      gutendexId: b.gutendexId,
      title: title,
      fullTitle: b.title,
      author: b.author || 'Unknown Author',
      narrator: narrator,
      genre: genre,
      tags: b.subjects && b.subjects.length ? b.subjects.slice(0, 5) : [genre.toLowerCase(), 'classic'],
      rating: Number(rating.toFixed(1)),
      reviews: reviews,
      listens: listens,
      duration: duration,
      chapters: b.totalChapters || 12,
      cover: b.coverUrl || '',
      coverUrl: b.coverUrl || '',
      accent: accent,
      description: b.description || `A literary sanctuary edition by ${b.author || 'the author'}, curated for nocturnal contemplation with synchronized chapter reading, typography controls, and atmospheric audio playback.`,
      shortDescription: b.description ? (b.description.slice(0, 130) + '...') : `${title} by ${b.author}.`,
      trending: meta.trending !== undefined ? meta.trending : (b.featured || false),
      chaptersList: b.chaptersList || [],
      totalWordCount: wordCount,
      source: 'mongodb-atlas'
    };
  }

  // Pre-compiled Atlas baseline catalog so the frontend renders immediately with real books
  const INITIAL_SEED = [
    {
      slug: 'pride-and-prejudice',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      gutendexId: 1342,
      coverUrl: 'https://covers.openlibrary.org/b/id/14348537-L.jpg',
      totalChapters: 62,
      totalWordCount: 127156,
      featured: true,
      description: 'Pride and Prejudice is an 1813 novel of manners written by Jane Austen. The novel follows the character development of Elizabeth Bennet, the dynamic protagonist of the book who learns about the repercussions of hasty judgments and comes to appreciate the difference between superficial goodness and actual goodness.'
    },
    {
      slug: 'moby-dick',
      title: 'Moby Dick; Or, The Whale',
      author: 'Herman Melville',
      gutendexId: 2701,
      coverUrl: 'https://covers.openlibrary.org/b/id/10544254-L.jpg',
      totalChapters: 149,
      totalWordCount: 207673,
      featured: true,
      description: 'Moby-Dick; or, The Whale is an 1851 novel by American writer Herman Melville. The book is the sailor Ishmael\'s narrative of the obsessive quest of Ahab, captain of the whaling ship Pequod, for revenge against Moby Dick, the giant white sperm whale.'
    },
    {
      slug: 'the-adventures-of-sherlock-holmes',
      title: 'The Adventures of Sherlock Holmes',
      author: 'Arthur Conan Doyle',
      gutendexId: 1661,
      coverUrl: 'https://covers.openlibrary.org/b/id/6717853-L.jpg',
      totalChapters: 12,
      totalWordCount: 104346,
      featured: true,
      description: 'A collection of twelve short stories by Arthur Conan Doyle, first published on 14 October 1892. It contains the earliest short stories featuring the consulting detective Sherlock Holmes, beginning with A Scandal in Bohemia.'
    },
    {
      slug: 'jane-eyre',
      title: 'Jane Eyre: An Autobiography',
      author: 'Charlotte Brontë',
      gutendexId: 1260,
      coverUrl: 'https://covers.openlibrary.org/b/id/1737356-L.jpg',
      totalChapters: 39,
      totalWordCount: 185267,
      featured: true,
      description: 'A novel by English writer Charlotte Brontë, published under the pen name "Currer Bell" on 19 October 1847. It follows the experiences of its eponymous heroine, including her growth to adulthood and her love for Mr. Rochester.'
    },
    {
      slug: 'frankenstein',
      title: 'Frankenstein; or, the modern prometheus',
      author: 'Mary Wollstonecraft Shelley',
      gutendexId: 84,
      coverUrl: 'https://covers.openlibrary.org/b/id/12356249-L.jpg',
      totalChapters: 28,
      totalWordCount: 74919,
      featured: true,
      description: 'Frankenstein tells the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment. Shelley started writing the story when she was 18.'
    },
    {
      slug: 'a-tale-of-two-cities',
      title: 'A Tale of Two Cities',
      author: 'Charles Dickens',
      gutendexId: 98,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243641-L.jpg',
      totalChapters: 45,
      totalWordCount: 135433,
      featured: true,
      description: 'Set in London and Paris before and during the French Revolution, the novel tells the story of the French Doctor Manette, his 18-year-long imprisonment in the Bastille, and his release to live in London with his daughter Lucie.'
    },
    {
      slug: 'the-war-of-the-worlds',
      title: 'The war of the worlds',
      author: 'H. G. (Herbert George) Wells',
      gutendexId: 36,
      coverUrl: 'https://covers.openlibrary.org/b/id/10544259-L.jpg',
      totalChapters: 27,
      totalWordCount: 59755,
      featured: true,
      description: 'A science fiction novel by English author H. G. Wells, first serialised in 1897. It is one of the earliest stories to detail a conflict between mankind and an extraterrestrial race.'
    },
    {
      slug: 'alices-adventures-in-wonderland',
      title: 'Alice in Wonderland',
      author: 'Lewis Carroll',
      gutendexId: 11,
      coverUrl: 'https://covers.openlibrary.org/b/id/10544256-L.jpg',
      totalChapters: 12,
      totalWordCount: 26371,
      featured: true,
      description: 'Alice\'s Adventures in Wonderland is an 1865 English children\'s novel by Lewis Carroll. A young girl named Alice falls through a rabbit hole into a subterranean fantasy world populated by peculiar creatures.'
    },
    {
      slug: 'around-the-world-in-eighty-days',
      title: 'Around the World in Eighty Days',
      author: 'Jules Verne',
      gutendexId: 103,
      coverUrl: 'https://covers.openlibrary.org/b/id/8315181-L.jpg',
      totalChapters: 36,
      totalWordCount: 61185,
      featured: true,
      description: 'In the adventure novel by Jules Verne, Phileas Fogg of London and his newly employed French valet Passepartout attempt to circumnavigate the late-Victorian world in 80 days on a £20,000 wager.'
    },
    {
      slug: 'dracula',
      title: 'Dracula',
      author: 'Bram Stoker',
      gutendexId: 345,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243642-L.jpg',
      totalChapters: 27,
      totalWordCount: 160907,
      featured: true,
      description: 'An 1897 Gothic horror novel by Irish author Bram Stoker. It introduced the character of Count Dracula and established many conventions of subsequent vampire fantasy.'
    },
    {
      slug: 'the-metamorphosis',
      title: 'Metamorphosis',
      author: 'Franz Kafka',
      gutendexId: 5200,
      coverUrl: 'https://covers.openlibrary.org/b/id/10544265-L.jpg',
      totalChapters: 3,
      totalWordCount: 21932,
      featured: false,
      description: 'The Metamorphosis tells the story of salesman Gregor Samsa, who wakes one morning to find himself inexplicably transformed into a huge insect, and subsequently struggles to adjust to this condition.'
    },
    {
      slug: 'the-great-gatsby',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      gutendexId: 64317,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243644-L.jpg',
      totalChapters: 10,
      totalWordCount: 48130,
      featured: true,
      description: 'The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald. Set in the Jazz Age on Long Island, near New York City, the novel depicts first-person narrator Nick Carraway\'s interactions with mysterious millionaire Jay Gatsby.'
    },
    {
      slug: 'the-hound-of-the-baskervilles',
      title: 'The Hound of the Baskervilles',
      author: 'Arthur Conan Doyle',
      gutendexId: 2852,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243645-L.jpg',
      totalChapters: 15,
      totalWordCount: 59043,
      featured: true,
      description: 'The Hound of the Baskervilles is the third of the four crime novels written by Arthur Conan Doyle featuring the detective Sherlock Holmes, confronting a spectral hound on the Devonshire moors.'
    },
    {
      slug: 'the-picture-of-dorian-gray',
      title: 'The Picture of Dorian Gray',
      author: 'Oscar Wilde',
      gutendexId: 174,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243646-L.jpg',
      totalChapters: 20,
      totalWordCount: 78505,
      featured: true,
      description: 'The Picture of Dorian Gray is a philosophical novel by Oscar Wilde. A handsome young man sells his soul for eternal youth, while his portrait bears the marks of age and moral corruption.'
    },
    {
      slug: 'the-time-machine',
      title: 'The Time Machine',
      author: 'H. G. Wells',
      gutendexId: 35,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243647-L.jpg',
      totalChapters: 16,
      totalWordCount: 32311,
      featured: false,
      description: 'A post-apocalyptic science fiction novella by H. G. Wells, published in 1895. The work is generally credited with the popularisation of the concept of time travel by using a vehicle.'
    },
    {
      slug: 'the-works-of-edgar-allan-poe-volume-1',
      title: 'The Works of Edgar Allan Poe — Volume 1',
      author: 'Edgar Allan Poe',
      gutendexId: 2147,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243648-L.jpg',
      totalChapters: 9,
      totalWordCount: 90277,
      featured: false,
      description: 'Volume 1 of Edgar Allan Poe\'s collected works, featuring the pioneering C. Auguste Dupin detective mysteries including The Murders in the Rue Morgue and The Mystery of Marie Rogêt.'
    },
    {
      slug: 'dr-jekyll-and-mr-hyde',
      title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
      author: 'Robert Louis Stevenson',
      gutendexId: 43,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243649-L.jpg',
      totalChapters: 10,
      totalWordCount: 25529,
      featured: false,
      description: 'A Gothic novella by Scottish author Robert Louis Stevenson, depicting the legal practitioner Gabriel John Utterson investigating strange occurrences between his old friend Dr Henry Jekyll and the evil Edward Hyde.'
    },
    {
      slug: 'treasure-island',
      title: 'Treasure Island',
      author: 'Robert Louis Stevenson',
      gutendexId: 120,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243650-L.jpg',
      totalChapters: 34,
      totalWordCount: 67712,
      featured: false,
      description: 'Treasure Island is an adventure novel by Scottish author Robert Louis Stevenson, narrating a tale of "buccaneers and buried gold". It introduced Long John Silver, buried treasure maps marked with an X, and the black spot.'
    },
    {
      slug: 'twenty-thousand-leagues-under-the-sea',
      title: 'Twenty Thousand Leagues under the Sea',
      author: 'Jules Verne',
      gutendexId: 164,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243651-L.jpg',
      totalChapters: 46,
      totalWordCount: 104071,
      featured: false,
      description: 'A classic science fiction adventure novel by French writer Jules Verne. It tells the story of underwater explorer Captain Nemo and his submarine, the Nautilus, as seen by Professor Pierre Aronnax.'
    },
    {
      slug: 'wuthering-heights',
      title: 'Wuthering Heights',
      author: 'Emily Brontë',
      gutendexId: 768,
      coverUrl: 'https://covers.openlibrary.org/b/id/8243652-L.jpg',
      totalChapters: 34,
      totalWordCount: 115872,
      featured: true,
      description: 'The only novel by the English author Emily Brontë, initially published in 1847 under her pen name "Ellis Bell". It centers on the all-encompassing and passionate, yet thwarted, love between Heathcliff and Catherine Earnshaw.'
    }
  ];

  // Initialize books array with transformed seed books
  let books = INITIAL_SEED.map(transformBackendBook);
  const byId = {};
  books.forEach(b => {
    byId[b.id] = b;
    byId[b.slug] = b;
  });

  // Map legacy demo IDs to real books
  Object.keys(LEGACY_ID_MAP).forEach(legacyKey => {
    const targetSlug = LEGACY_ID_MAP[legacyKey];
    if (byId[targetSlug]) {
      byId[legacyKey] = byId[targetSlug];
    }
  });

  // Settings
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

  // State
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
        { title: 'Prologue & First Light', theme: 'Opening meditation', chapterNumber: 1, wordCount: 1200 },
        { title: 'Chapter I: The Journey Begins', theme: 'Quiet contemplation', chapterNumber: 2, wordCount: 2400 },
        { title: 'Chapter II: Unfolding Pages', theme: 'Atmospheric prose', chapterNumber: 3, wordCount: 2800 },
        { title: 'Chapter III: Midnight Revelations', theme: 'Devotion & memory', chapterNumber: 4, wordCount: 3100 },
        { title: 'Chapter IV: Whispers in the Sanctuary', theme: 'Acoustic sanctuary', chapterNumber: 5, wordCount: 2600 },
        { title: 'Epilogue: The Written Word', theme: 'Closing cadence', chapterNumber: 6, wordCount: 1500 }
      ];
    }
    return match;
  }

  function resolveId(id) {
    if (!id) return books[0].id;
    if (byId[id]) return id;
    if (LEGACY_ID_MAP[id] && byId[LEGACY_ID_MAP[id]]) return LEGACY_ID_MAP[id];
    return id;
  }

  function getBook(id) {
    const resolved = resolveId(id);
    if (byId[resolved]) return byId[resolved];

    // Check user uploads in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('novelcast.uploads.')) {
        try {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          const match = list.find(b => b.id === id || b.slug === id);
          if (match) {
            normalizeBook(match);
            byId[id] = match;
            return match;
          }
        } catch (e) {}
      }
    }
    return books[0];
  }

  function bookUrl(page, id, chapter) {
    const params = new URLSearchParams();
    if (id) params.set('book', id);
    if (typeof chapter === 'number') params.set('chapter', String(chapter));
    const q = params.toString();
    return page + (q ? '?' + q : '');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function readQuery() {
    const searchParams = new URLSearchParams(location.search);
    const hashQuery = location.hash.includes('?') ? location.hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);
    const getVal = (k) => hashParams.get(k) || searchParams.get(k);

    const rawChapter = getVal('chapter');
    return {
      book: getVal('book'),
      chapter: rawChapter !== null && rawChapter !== undefined && rawChapter !== '' ? Math.max(1, parseInt(rawChapter, 10) || 1) : null,
      page: getVal('page'),
      q: getVal('q'),
      genre: getVal('genre'),
      collection: getVal('collection'),
      mode: getVal('mode'),
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
    if (!state.library[id]) state.library[id] = { status: null, favorite: false, chapter: 1, page: 0, bookmarks: [] };
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
    book.progress = book.progress || 0;
    book.uploadedAt = book.uploadedAt || new Date().toISOString();
    book.lastRead = book.lastRead || 'Just added';
    list.unshift(book);
    try {
      localStorage.setItem(getUserUploadsKey(userId), JSON.stringify(list));
    } catch (e) {
      console.error('Storage full or error:', e);
    }
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

  // --- Live Backend API Client ---
  let isLoaded = false;

  async function fetchCatalog(options = {}) {
    const limit = options.limit || 50;
    const sort = options.sort || 'popular';
    try {
      const res = await fetch(`${API_BASE}/books?limit=${limit}&sort=${sort}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.books) && data.books.length > 0) {
        const liveBooks = data.books.map(transformBackendBook);
        books = liveBooks;
        books.forEach(b => {
          byId[b.id] = b;
          byId[b.slug] = b;
          if (b._id) byId[b._id] = b;
        });

        // Re-apply legacy aliases
        Object.keys(LEGACY_ID_MAP).forEach(k => {
          const targetSlug = LEGACY_ID_MAP[k];
          if (byId[targetSlug]) byId[k] = byId[targetSlug];
        });

        isLoaded = true;
        try {
          localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(liveBooks));
        } catch (e) {}

        document.dispatchEvent(new CustomEvent('novelcast:books-loaded', { detail: { books } }));
        document.dispatchEvent(new CustomEvent('novelcast:refresh'));
        return books;
      }
    } catch (err) {
      console.warn('[NovelCastAPI] Could not reach backend, operating in resilient baseline mode:', err.message);
    }
    return books;
  }

  async function fetchBookDetails(slugOrId) {
    const target = resolveId(slugOrId);
    try {
      const res = await fetch(`${API_BASE}/books/${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.book) {
        const updatedBook = transformBackendBook(data.book);
        if (Array.isArray(data.chapters)) {
          updatedBook.chaptersList = data.chapters.map(c => ({
            chapterNumber: c.chapterNumber,
            title: c.title,
            wordCount: c.wordCount,
            order: c.order,
            theme: 'Sanctuary passage'
          }));
          updatedBook.chapters = data.chapters.length;
        }
        byId[updatedBook.id] = updatedBook;
        byId[updatedBook.slug] = updatedBook;
        document.dispatchEvent(new CustomEvent('novelcast:book-details-loaded', { detail: { book: updatedBook } }));
        return updatedBook;
      }
    } catch (err) {
      console.warn(`[NovelCastAPI] Error fetching book details for ${target}:`, err.message);
    }
    return getBook(target);
  }

  async function fetchChapter(slugOrId, chapterNumber = 1) {
    const target = resolveId(slugOrId);
    const num = Math.max(1, parseInt(chapterNumber || 1, 10));
    try {
      const res = await fetch(`${API_BASE}/books/${encodeURIComponent(target)}/chapters/${num}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`[NovelCastAPI] Error fetching chapter ${num} for ${target}:`, err.message);
      return null;
    }
  }

  async function searchCatalog(query = '', genre = '') {
    try {
      const url = new URL(`${API_BASE}/books`);
      if (query && query.trim()) url.searchParams.set('search', query.trim());
      if (genre && genre !== 'all') url.searchParams.set('genre', genre.trim());
      url.searchParams.set('limit', '50');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.books)) {
        return data.books.map(transformBackendBook);
      }
    } catch (err) {
      console.warn('[NovelCastAPI] Search fallback to local cache:', err.message);
    }
    // Local fallback search
    const term = (query || '').toLowerCase().trim();
    let results = books;
    if (genre && genre !== 'all') {
      results = results.filter(b => (b.genre || '').toLowerCase().includes(genre.toLowerCase()));
    }
    if (term) {
      results = results.filter(b => 
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        b.genre.toLowerCase().includes(term) ||
        (b.description && b.description.toLowerCase().includes(term))
      );
    }
    return results;
  }

  // Auto-fetch on boot
  if (typeof window !== 'undefined') {
    fetchCatalog().catch(() => {});
  }

  return {
    get books() { return books; },
    get byId() { return byId; },
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
    deleteUserUpload,
    // Live API methods
    fetchCatalog,
    fetchBookDetails,
    fetchChapter,
    searchCatalog,
    transformBackendBook,
    API_BASE,
    isLoaded: () => isLoaded,
    cleanTitle
  };
})();