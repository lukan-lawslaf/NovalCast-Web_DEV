'use strict';

/**
 * Book — catalog metadata only.
 *
 * Chapter text deliberately lives in its own collection (see Chapter.js) so
 * `GET /api/books` stays lightweight: the catalog list never has to pull
 * megabytes of prose out of MongoDB.
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

const BookSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    gutendexId: {
      type: Number,
      unique: true,
      index: true,
      sparse: true,
    },
    title: { type: String, required: true, trim: true, index: true },
    author: { type: String, required: true, trim: true, index: true },
    subjects: { type: [String], default: [], index: true },
    languages: { type: [String], default: [] },
    coverUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    totalChapters: { type: Number, default: 0, min: 0 },
    totalWordCount: { type: Number, default: 0, min: 0 },
    downloadCount: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        return ret;
      },
    },
  }
);

// Catalog sorting: ?sort=popular and ?sort=newest both rely on these.
BookSchema.index({ downloadCount: -1 });
BookSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Book || mongoose.model('Book', BookSchema);
