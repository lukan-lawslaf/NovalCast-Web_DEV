'use strict';

// Atlas stores a verified account's 1-5 score for one catalog book.
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  bookSlug: { type: String, required: true },
  userId: { type: String, required: true },
  score: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
}, { timestamps: true, versionKey: false });
// This compound unique index enforces one editable rating per account and book,
// including when two requests attempt to create the first rating concurrently.
schema.index({ bookSlug: 1, userId: 1 }, { unique: true });
module.exports = mongoose.models.Rating || mongoose.model('Rating', schema);
