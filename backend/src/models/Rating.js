'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  bookSlug: { type: String, required: true },
  userId: { type: String, required: true },
  score: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
}, { timestamps: true, versionKey: false });
// Each account owns exactly one editable rating per book.
schema.index({ bookSlug: 1, userId: 1 }, { unique: true });
module.exports = mongoose.models.Rating || mongoose.model('Rating', schema);
