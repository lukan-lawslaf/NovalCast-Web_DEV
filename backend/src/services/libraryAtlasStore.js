'use strict';

const mongoose = require('mongoose');
const { normalizeDocument, emptyDocument, libraryAccountKey, libraryConflict, libraryUnavailable } = require('./libraryJsonStore');

// Reuse the app's Atlas connection and keep the full revisioned library JSON intact.
function createLibraryAtlasStore({ connection = mongoose.connection } = {}) {
  const operationOptions = { timeoutMS: 5000 };

  function collection() {
    if (connection.readyState !== 1 || !connection.db) throw libraryUnavailable();
    return connection.db.collection('account_libraries');
  }

  async function read(userId) {
    const _id = libraryAccountKey(userId);
    try {
      const row = await collection().findOne({ _id }, operationOptions);
      if (!row) return emptyDocument();
      const document = normalizeDocument(JSON.parse(row.payload));
      if (document.revision !== row.revision || row.revision < 1) throw libraryUnavailable();
      return document;
    } catch {
      throw libraryUnavailable();
    }
  }

  async function save(userId, value) {
    const _id = libraryAccountKey(userId);
    const submitted = normalizeDocument(value);
    const current = await read(userId);
    if (current.revision !== submitted.revision) throw libraryConflict(current);
    if (current.revision === Number.MAX_SAFE_INTEGER) throw libraryUnavailable();

    const next = normalizeDocument({ ...submitted, revision: current.revision + 1 });
    const row = { _id, revision: next.revision, payload: JSON.stringify(next) };
    try {
      // MongoDB's unique _id handles concurrent first saves. Existing records use
      // a revision predicate so another instance cannot overwrite a newer save.
      if (current.revision === 0) {
        await collection().insertOne(row, operationOptions);
        return next;
      }
      const result = await collection().replaceOne({ _id, revision: current.revision }, row, operationOptions);
      if (result.matchedCount === 1) return next;
    } catch (error) {
      if (error.code !== 11000) throw libraryUnavailable();
    }
    throw libraryConflict(await read(userId));
  }

  return { read, save };
}

module.exports = { createLibraryAtlasStore };
