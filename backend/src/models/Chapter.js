'use strict';

/**
 * Chapter — reading content, one document per chapter.
 *
 * Split out from Book so list endpoints stay cheap and the reader can fetch a
 * single chapter instead of a whole novel.
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ChapterSchema = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },
    chapterNumber: { type: Number, required: true, index: true },
    title: { type: String, default: '', trim: true },
    content: { type: String, required: true },
    wordCount: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

// Re-ingesting a book replaces its chapters; this makes the lookup index-backed
// and makes accidental duplicates impossible.
ChapterSchema.index({ bookId: 1, chapterNumber: 1 }, { unique: true });

module.exports = mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);
