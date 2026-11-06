// Narration voice selection and persistence contract; the model is an in-memory mock.
const test = require('node:test');
const assert = require('node:assert/strict');
const Book = require('../backend/src/models/Book');
const {
  createNarrationVoiceResolver,
  selectNarrationProfile,
  chooseNarrationVoice,
} = require('../backend/src/services/narrationVoiceService');

function copy(value) {
  return value == null ? value : structuredClone(value);
}

function query(value) {
  return { lean: async () => copy(value) };
}

function createMemoryBooks(initialBooks, { synchronizeInitialLookups = false } = {}) {
  const records = new Map(initialBooks.map(book => [String(book._id), copy(book)]));
  const writes = [];
  let initialLookupCount = 0;
  let initialLookupRelease;
  const bothInitialLookups = new Promise(resolve => { initialLookupRelease = resolve; });

  const BookModel = {
    findOne(filter) {
      const isInitialSlugLookup = Boolean(filter && filter.slug);
      return {
        lean: async () => {
          if (isInitialSlugLookup && synchronizeInitialLookups) {
            initialLookupCount += 1;
            if (initialLookupCount >= 2) initialLookupRelease();
            await bothInitialLookups;
          }
          const record = [...records.values()].find(book =>
            (filter._id && String(book._id) === String(filter._id)) ||
            (filter.slug && book.slug === filter.slug));
          return copy(record);
        },
      };
    },
    findOneAndUpdate(filter, update, options) {
      writes.push({ filter: copy(filter), update: copy(update), options: copy(options) });
      const record = records.get(String(filter._id));
      const hasAbsenceGuard = Array.isArray(filter.$or) && filter.$or.some(clause =>
        clause.narrationVoice && clause.narrationVoice.$exists === false) && filter.$or.some(clause => clause.narrationVoice === null);
      if (!record || !hasAbsenceGuard || record.narrationVoice != null) return query(null);
      record.narrationVoice = copy(update.$set.narrationVoice);
      return query(record);
    },
  };

  return { BookModel, records, writes };
}

const testVoices = {
  gothic: { referenceId: 'voice-gothic', name: 'Gothic Reader' },
  detective: { referenceId: 'voice-detective', name: 'Detective Reader' },
  romance: { referenceId: 'voice-romance', name: 'Romance Reader' },
  literary: { referenceId: 'voice-literary', name: 'Literary Reader' },
  children: { referenceId: 'voice-children', name: 'Children Reader' },
  adventure: { referenceId: 'voice-adventure', name: 'Adventure Reader' },
  pirate: { referenceId: 'voice-pirate', name: 'Pirate Reader' },
  classic: { referenceId: 'voice-classic', name: 'Classic Reader' },
};

function clockmaker(overrides = {}) {
  return {
    _id: 'book-clockmaker',
    slug: 'the-clockmaker',
    title: 'The Clockmaker',
    description: 'A detective investigates a series of thefts and uncovers a murder mystery.',
    subjects: ['English fiction'],
    languages: ['en'],
    ...overrides,
  };
}

test('voice profile reflects book synopsis and chooses a configured profile voice', () => {
  const book = clockmaker();
  const selection = selectNarrationProfile(book);
  assert.equal(selection.profile, 'detective');
  assert.match(selection.reason, /synopsis/i);

  const chosen = chooseNarrationVoice(book, testVoices, { now: () => new Date('2026-02-03T04:05:06.000Z') });
  assert.equal(chosen.profile, 'detective');
  assert.equal(chosen.referenceId, testVoices.detective.referenceId);
  assert.equal(chosen.name, testVoices.detective.name);
  assert.match(chosen.reason, /synopsis/i);

  assert.equal(selectNarrationProfile({ title: 'Moby Dick', description: 'A whaling voyage.' }).profile, 'literary',
    'a known book title should not be assigned an incidental pirate or adventure profile');
});

test('a saved voice survives changed catalog descriptions and a fresh resolver instance', async () => {
  const initial = clockmaker();
  const memory = createMemoryBooks([initial]);
  const firstResolver = createNarrationVoiceResolver({
    BookModel: memory.BookModel,
    connectionReady: () => true,
    voices: testVoices,
    now: () => new Date('2026-04-05T06:07:08.000Z'),
  });
  const selected = await firstResolver(initial.slug);
  assert.equal(selected.profile, 'detective');
  assert.equal(memory.writes.length, 1);

  const stored = memory.records.get(initial._id);
  stored.description = 'A band of pirates sails in search of treasure.';
  stored.subjects = ['Pirate stories'];
  const revisedVoices = {
    ...testVoices,
    detective: { referenceId: 'voice-detective-replaced', name: 'Replacement Detective' },
    pirate: { referenceId: 'voice-pirate-replaced', name: 'Replacement Pirate' },
  };
  const afterRestart = createNarrationVoiceResolver({
    BookModel: memory.BookModel,
    connectionReady: () => true,
    voices: revisedVoices,
    now: () => new Date('2030-01-01T00:00:00.000Z'),
  });
  const reused = await afterRestart(initial.slug);

  assert.equal(reused.referenceId, selected.referenceId);
  assert.equal(reused.name, selected.name);
  assert.equal(reused.profile, 'detective');
  assert.equal(reused.selectedAt.toISOString(), selected.selectedAt.toISOString());
  assert.equal(memory.writes.length, 1, 'a restart must read the stored voice without selecting or saving another one');
});

test('concurrent first listens return the single voice that won the conditional database write', async () => {
  const book = clockmaker();
  const memory = createMemoryBooks([book], { synchronizeInitialLookups: true });
  const voicesOne = { ...testVoices, detective: { referenceId: 'voice-first', name: 'First Candidate' } };
  const voicesTwo = { ...testVoices, detective: { referenceId: 'voice-second', name: 'Second Candidate' } };
  const options = { BookModel: memory.BookModel, connectionReady: () => true };
  const resolverOne = createNarrationVoiceResolver({ ...options, voices: voicesOne });
  const resolverTwo = createNarrationVoiceResolver({ ...options, voices: voicesTwo });

  const [first, second] = await Promise.all([
    resolverOne(book.slug),
    resolverTwo(book.slug),
  ]);
  const saved = memory.records.get(book._id).narrationVoice;

  assert.equal(memory.writes.length, 2, 'both processes may calculate a candidate before either write completes');
  assert.ok(memory.writes.every(write => write.filter.$or && write.options.returnDocument === 'after'),
    'each candidate must use an atomic absent-voice condition');
  assert.ok(['voice-first', 'voice-second'].includes(saved.referenceId));
  assert.equal(first.referenceId, saved.referenceId);
  assert.equal(second.referenceId, saved.referenceId);
  assert.equal(first.name, saved.name);
  assert.equal(second.name, saved.name, 'the losing process must return the persisted winner');
});

test('missing books and unavailable storage fail without inventing a default voice', async () => {
  const memory = createMemoryBooks([]);
  const resolver = createNarrationVoiceResolver({
    BookModel: memory.BookModel,
    connectionReady: () => true,
    voices: testVoices,
  });
  await assert.rejects(resolver('unknown-book'), error => error.status === 404 && error.code === 'TTS_BOOK_NOT_FOUND');

  const disconnected = createNarrationVoiceResolver({
    BookModel: memory.BookModel,
    connectionReady: () => false,
    voices: testVoices,
  });
  await assert.rejects(disconnected('unknown-book'), error => error.status === 503 && error.code === 'TTS_VOICE_STORAGE_UNAVAILABLE');
  assert.equal(memory.writes.length, 0);
});

test('offline snapshots apply only to exact known catalog slugs, never database IDs or unknown books', async () => {
  let reads = 0;
  const resolver = createNarrationVoiceResolver({
    BookModel: { findOne() { reads += 1; throw new Error('database should stay untouched'); } },
    connectionReady: () => false,
    fallbackVoices: { dracula: { referenceId: 'snapshot-dracula', name: 'Saved Dracula Narrator' } },
  });

  const saved = await resolver('dracula');
  assert.equal(saved.referenceId, 'snapshot-dracula');
  assert.equal(saved.name, 'Saved Dracula Narrator');
  await assert.rejects(resolver('0123456789abcdef01234567'), error => error.code === 'TTS_VOICE_STORAGE_UNAVAILABLE');
  await assert.rejects(resolver('unknown-book'), error => error.code === 'TTS_VOICE_STORAGE_UNAVAILABLE');
  assert.equal(reads, 0, 'known offline snapshots do not query Atlas when it is disconnected');
});

test('a cold snapshot can bridge a database read failure but is not cached after Atlas recovers', async () => {
  let atlasAvailable = false;
  let reads = 0;
  const atlasVoice = {
    referenceId: 'atlas-dracula',
    name: 'Persisted Dracula Narrator',
    reason: 'Saved on the book record.',
    profile: 'gothic',
    selectedAt: new Date('2026-03-04T05:06:07.000Z'),
  };
  const BookModel = {
    findOne() {
      return {
        lean: async () => {
          reads += 1;
          if (!atlasAvailable) throw new Error('Atlas TLS connection unavailable');
          return { _id: 'book-dracula', slug: 'dracula', narrationVoice: copy(atlasVoice) };
        },
      };
    },
  };
  const resolver = createNarrationVoiceResolver({
    BookModel,
    connectionReady: () => true,
    fallbackVoices: { dracula: { referenceId: 'snapshot-dracula', name: 'Snapshot Narrator' } },
  });

  const degraded = await resolver('dracula');
  assert.equal(degraded.referenceId, 'snapshot-dracula');
  assert.equal(degraded.name, 'Snapshot Narrator');
  assert.equal(reads, 1);

  atlasAvailable = true;
  const recovered = await resolver('dracula');
  assert.equal(recovered.referenceId, 'atlas-dracula', 'a cold fallback must not override the recovered persisted choice');
  assert.equal(recovered.name, 'Persisted Dracula Narrator');
  assert.equal(reads, 2, 'the recovered lookup must query Atlas instead of reusing the snapshot');

  atlasAvailable = false;
  const cached = await resolver('dracula');
  assert.equal(cached.referenceId, 'atlas-dracula', 'once confirmed, the Atlas voice remains stable through a later outage');
  assert.equal(reads, 2, 'a confirmed book voice remains cached for this process');
});

test('a healthy Atlas not-found result cannot be hidden by a catalog snapshot', async () => {
  const resolver = createNarrationVoiceResolver({
    BookModel: { findOne: () => query(null) },
    connectionReady: () => true,
    fallbackVoices: { dracula: { referenceId: 'snapshot-dracula', name: 'Snapshot Narrator' } },
  });
  await assert.rejects(resolver('dracula'), error => error.status === 404 && error.code === 'TTS_BOOK_NOT_FOUND');
});

test('Book schema stores the selected narration voice as persisted book metadata', () => {
  const narrationVoice = Book.schema.path('narrationVoice');
  assert.ok(narrationVoice, 'the book record must have a narrationVoice field');
  for (const field of ['referenceId', 'name', 'reason', 'profile', 'selectedAt']) {
    assert.equal(narrationVoice.schema.path(field).isRequired, true, `${field} is required for a reusable voice choice`);
  }
});
