'use strict';

const mongoose = require('mongoose');
const Book = require('../models/Book');
const env = require('../config/env');
const { NARRATION_VOICES } = require('../config/narrationVoices');
const SAVED_CATALOG_VOICES = require('../config/savedCatalogNarrationVoices.json');
const { TtsError, validateReferenceId } = require('./fishAudioService');

const QUERY_TIMEOUT_MS = 5000;
const MAX_CACHED_BOOK_KEYS = 256;
const BOOK_VOICE_FIELDS = '_id slug title description subjects languages narrationVoice';

const PROFILE_REASONS = {
  gothic: 'Dark themes and suspense suit a deep, measured, atmospheric narrator.',
  detective: 'Investigation and close observation suit a calm, precise narrator.',
  romance: 'Relationships and character drama suit a clear, warm narrator.',
  literary: 'Reflective literary prose suits a calm, measured storyteller.',
  children: 'Whimsical fantasy suits a gentle, youthful storyteller.',
  adventure: 'Exploration and scientific adventure suit a clear, expressive narrator.',
  pirate: 'A pirate adventure suits a gruff, weathered storyteller.',
  classic: 'Classic wit and travel suit a warm, sophisticated storyteller.',
};

// Recognisable titles outrank incidental words such as "love", "sea", or
// "supernatural" in a synopsis. In particular, Holmes is detective, not horror;
// Moby Dick is reflective literary prose, not a generic pirate adventure.
const TITLE_PROFILES = [
  { pattern: /\bfrankenstein\b|\bdracula\b|\bdorian gray\b|\bjekyll\b.*\bhyde\b|\bedgar allan poe\b/, profile: 'gothic' },
  { pattern: /\bsherlock holmes\b|\bhound of the baskervilles\b/, profile: 'detective' },
  { pattern: /\bpride and prejudice\b|\bjane eyre\b|\bwuthering heights\b/, profile: 'romance' },
  { pattern: /\bmoby dick\b|\bgreat gatsby\b|\bmetamorphosis\b|\btale of two cities\b/, profile: 'literary' },
  { pattern: /\balice\b.*\bwonderland\b/, profile: 'children' },
  { pattern: /\btreasure island\b/, profile: 'pirate' },
  { pattern: /\baround the world in (?:eighty|80) days\b/, profile: 'classic' },
  { pattern: /\bwar of the worlds\b|\btime machine\b|\b(?:twenty thousand|20 ?000) leagues\b/, profile: 'adventure' },
];

const PROFILE_SIGNALS = [
  { profile: 'children', pattern: /\b(?:children|childrens|juvenile|fairy tales?|whimsical|wonderland)\b/ },
  { profile: 'detective', pattern: /\b(?:detective|detectives|investigation|investigates?|murder mystery|crime|sherlock holmes)\b/ },
  { profile: 'pirate', pattern: /\b(?:pirates?|buccaneers?)\b/ },
  { profile: 'gothic', pattern: /\b(?:gothic|horror|macabre|vampires?|haunted|demonic|supernatural)\b/ },
  { profile: 'romance', pattern: /\b(?:romance|romantic|courtship|marriage|relationships?)\b/ },
  { profile: 'adventure', pattern: /\b(?:science fiction|scientific|time travel|extraterrestrial|submarine|exploration|expedition|adventure|voyage)\b/ },
  { profile: 'classic', pattern: /\b(?:satire|satirical|comedy|humou?r|comic)\b/ },
  { profile: 'literary', pattern: /\b(?:literary|psychological|historical|reflective)\b/ },
];

function normalizedText(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function validateBookId(bookId) {
  if (typeof bookId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(bookId.trim())) {
    throw new TtsError(400, 'TTS_INVALID_BOOK', 'Provide the catalog book ID or slug for narration.');
  }
  return bookId.trim().toLowerCase();
}

function exactBookQuery(bookId) {
  return /^[a-f0-9]{24}$/.test(bookId) ? { _id: bookId } : { slug: bookId };
}

function selectNarrationProfile(book) {
  const title = normalizedText(book.title);
  const knownTitle = TITLE_PROFILES.find((rule) => rule.pattern.test(title));
  if (knownTitle) {
    return { profile: knownTitle.profile, reason: `Matched the book title. ${PROFILE_REASONS[knownTitle.profile]}` };
  }

  const sources = [
    { name: 'title', text: title, weight: 6 },
    { name: 'catalog subjects', text: normalizedText((book.subjects || []).join(' ')), weight: 4 },
    { name: 'synopsis', text: normalizedText(book.description), weight: 1 },
  ];
  let winner;
  for (const rule of PROFILE_SIGNALS) {
    const matches = sources.filter((source) => rule.pattern.test(source.text));
    const score = matches.reduce((total, source) => total + source.weight, 0);
    if (score && (!winner || score > winner.score)) {
      winner = { profile: rule.profile, score, sources: matches.map((source) => source.name) };
    }
  }
  if (winner) {
    return { profile: winner.profile, reason: `Matched themes in the ${winner.sources.join(' and ')}. ${PROFILE_REASONS[winner.profile]}` };
  }
  return { profile: 'literary', reason: 'No more specific narration theme matched the book metadata. Selected a calm, measured voice for general English storytelling.' };
}

function chooseNarrationVoice(book, voices = NARRATION_VOICES, { referenceId = '', now = () => new Date() } = {}) {
  const languages = Array.isArray(book.languages) ? book.languages.filter((value) => typeof value === 'string' && value.trim()) : [];
  if (languages.length && !languages.some((language) => /^(?:en|eng)(?:[-_].*)?$/i.test(language.trim()))) {
    throw new TtsError(503, 'TTS_VOICE_UNAVAILABLE', 'A verified narration voice is not configured for this book’s language.');
  }

  if (referenceId) {
    const configuredId = validateReferenceId(referenceId);
    const knownVoice = Object.values(voices).find((voice) => voice.referenceId === configuredId);
    return {
      referenceId: configuredId,
      name: knownVoice ? knownVoice.name : 'Configured narrator',
      reason: 'Selected from the server FISH_AUDIO_REFERENCE_ID setting on the first listen.',
      profile: 'configured',
      selectedAt: now(),
    };
  }

  const selection = selectNarrationProfile(book);
  const voice = voices[selection.profile];
  if (!voice || typeof voice.name !== 'string' || !voice.name.trim()) {
    throw new TtsError(503, 'TTS_VOICE_UNAVAILABLE', 'A verified voice is not configured for this book’s narration profile.');
  }
  return {
    referenceId: validateReferenceId(voice.referenceId),
    name: voice.name.trim(),
    reason: selection.reason,
    profile: selection.profile,
    selectedAt: now(),
  };
}

function savedVoice(value) {
  if (!value || typeof value.name !== 'string' || !value.name.trim() ||
      typeof value.reason !== 'string' || !value.reason.trim() ||
      typeof value.profile !== 'string' || !value.profile.trim() ||
      !value.selectedAt || Number.isNaN(new Date(value.selectedAt).getTime())) {
    throw new TtsError(503, 'TTS_VOICE_UNAVAILABLE', 'The saved narration voice is incomplete. Narration stopped to preserve this book’s voice.');
  }
  return Object.freeze({
    referenceId: validateReferenceId(value.referenceId),
    name: value.name.trim(),
    reason: value.reason.trim(),
    profile: value.profile.trim(),
    selectedAt: new Date(value.selectedAt),
  });
}

function storageError() {
  return new TtsError(503, 'TTS_VOICE_STORAGE_UNAVAILABLE', 'Book narration settings are temporarily unavailable. Please try again shortly.');
}

function waitWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason || new Error('Narration cancelled.'));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason || new Error('Narration cancelled.'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Select and atomically save a voice once. Only confirmed saved choices cache. */
function createNarrationVoiceResolver({
  BookModel = Book,
  connectionReady = () => mongoose.connection.readyState === 1,
  voices = NARRATION_VOICES,
  fallbackVoices = SAVED_CATALOG_VOICES,
  referenceId = env.FISH_AUDIO_REFERENCE_ID,
  now = () => new Date(),
} = {}) {
  const cached = new Map();
  const lookups = new Map();
  const selections = new Map();

  function remember(key, voice) {
    cached.set(key, voice);
    while (cached.size > MAX_CACHED_BOOK_KEYS) cached.delete(cached.keys().next().value);
  }

  function savedCatalogVoice(key) {
    // These are exported Atlas assignments for exact public catalog slugs.
    // They must never select a new voice or stand in for an unknown book.
    if (!exactBookQuery(key).slug || !Object.hasOwn(fallbackVoices, key)) return null;
    const voice = fallbackVoices[key];
    if (!voice || typeof voice.name !== 'string' || !voice.name.trim()) return null;
    try {
      return Object.freeze({ referenceId: validateReferenceId(voice.referenceId), name: voice.name.trim() });
    } catch {
      return null;
    }
  }

  async function readBook(query, fields = BOOK_VOICE_FIELDS) {
    try {
      return await BookModel.findOne(query, fields, { maxTimeMS: QUERY_TIMEOUT_MS }).lean();
    } catch {
      throw storageError();
    }
  }

  async function selectAndPersist(book) {
    const selection = chooseNarrationVoice(book, voices, { referenceId, now });
    let updated;
    try {
      updated = await BookModel.findOneAndUpdate(
        { _id: book._id, $or: [{ narrationVoice: { $exists: false } }, { narrationVoice: null }] },
        { $set: { narrationVoice: selection } },
        { returnDocument: 'after', runValidators: true, projection: { narrationVoice: 1 }, maxTimeMS: QUERY_TIMEOUT_MS }
      ).lean();
    } catch {
      throw storageError();
    }
    // Another process may have won the conditional update. Its saved choice
    // wins, even if this process calculated a different candidate.
    const winner = updated || await readBook({ _id: book._id }, 'narrationVoice');
    if (!winner) throw new TtsError(404, 'TTS_BOOK_NOT_FOUND', 'The narration book was not found.');
    return savedVoice(winner.narrationVoice);
  }

  async function lookupVoice(key) {
    let book;
    try {
      book = await readBook(exactBookQuery(key));
    } catch (error) {
      if (error.code === 'TTS_VOICE_STORAGE_UNAVAILABLE') {
        const knownVoice = savedCatalogVoice(key);
        if (knownVoice) return knownVoice;
      }
      throw error;
    }
    if (!book) throw new TtsError(404, 'TTS_BOOK_NOT_FOUND', 'The narration book was not found.');
    const canonicalKey = String(book._id);
    let voice;
    if (book.narrationVoice != null) {
      voice = savedVoice(book.narrationVoice);
    } else if (selections.has(canonicalKey)) {
      voice = await selections.get(canonicalKey);
    } else {
      const pending = selectAndPersist(book);
      selections.set(canonicalKey, pending);
      try {
        voice = await pending;
      } finally {
        selections.delete(canonicalKey);
      }
    }
    remember(key, voice);
    remember(canonicalKey, voice);
    if (typeof book.slug === 'string') remember(book.slug.toLowerCase(), voice);
    return voice;
  }

  return async function resolveNarrationVoice(bookId, { signal } = {}) {
    const key = validateBookId(bookId);
    if (signal && signal.aborted) return Promise.reject(signal.reason || new Error('Narration cancelled.'));
    if (cached.has(key)) return cached.get(key);
    if (!connectionReady()) {
      const knownVoice = savedCatalogVoice(key);
      if (knownVoice) return knownVoice;
      throw storageError();
    }
    if (!lookups.has(key)) {
      const pending = lookupVoice(key);
      lookups.set(key, pending);
      pending.then(() => lookups.delete(key), () => lookups.delete(key));
    }
    return waitWithSignal(lookups.get(key), signal);
  };
}

module.exports = {
  validateBookId,
  selectNarrationProfile,
  chooseNarrationVoice,
  createNarrationVoiceResolver,
  resolveNarrationVoice: createNarrationVoiceResolver(),
};
