'use strict';

// Read community scores and save one editable Atlas rating per verified account and book.
const express = require('express');
const mongoose = require('mongoose');
const env = require('../config/env');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const router = express.Router();
// Send rejected route promises to the central Express error handler.
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
// Mark only intentional service-unavailable messages as safe to show to readers.
const publicError = (message, status) => Object.assign(new Error(message), { status, expose: status === 503 });

// Verify the token with Supabase, distinguishing expired sessions from unavailable auth service.
async function verifiedUser(req) {
  const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!token) throw publicError('Please sign in to rate this book.', 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw publicError('Account verification is unavailable.', 503);
  }
  // Ask Supabase to verify the bearer token with a bounded wait.
  let response;
  try {
    response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token[1]}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw publicError('Could not verify your account. Please try again.', 503);
  }
  if (response.status >= 500 || response.status === 429) {
    throw publicError('Account verification is temporarily unavailable. Please try again.', 503);
  }
  if (!response.ok) throw publicError('Your session expired. Please sign in again.', 401);
  // Validate the returned identity and reject unconfirmed or anonymous accounts.
  let user;
  try { user = await response.json(); }
  catch { throw publicError('Account verification is temporarily unavailable. Please try again.', 503); }
  if (!user || typeof user !== 'object' || Array.isArray(user) || typeof user.id !== 'string' || !user.id || user.id.length > 256) {
    throw publicError('Account verification is temporarily unavailable. Please try again.', 503);
  }
  if (!user.email_confirmed_at || user.is_anonymous) {
    throw publicError('Please sign in with a verified account.', 401);
  }
  return user;
}

// Ratings require a real stored catalog book; cached browser cards are not database evidence.
async function findBook(req) {
  if (mongoose.connection.readyState !== 1) {
    throw publicError('Ratings are temporarily unavailable. Please try again shortly.', 503);
  }
  const id = req.params.id;
  const book = await Book.findOne(mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }).lean();
  if (!book) throw publicError('Book not found.', 404);
  return book;
}

// Count votes at each star level and optionally include this account's own score.
async function summary(slug, userId) {
  // Fetch grouped votes and the current account’s vote together when signed in.
  const [groups, own] = await Promise.all([
    Rating.aggregate([{ $match: { bookSlug: slug } }, { $group: { _id: '$score', count: { $sum: 1 } } }]),
    userId ? Rating.findOne({ bookSlug: slug, userId }).lean() : null,
  ]);
  // Convert grouped star counts into the fixed 1-to-5 distribution and weighted average.
  const distribution = [0, 0, 0, 0, 0];
  groups.forEach(group => { distribution[group._id - 1] = group.count; });
  const count = distribution.reduce((sum, value) => sum + value, 0);
  const total = distribution.reduce((sum, value, index) => sum + value * (index + 1), 0);
  return { count, average: count ? Math.round(total / count * 10) / 10 : null, distribution, myRating: own ? own.score : null };
}

// Catalog cards need averages/counts without loading every individual rating.
router.get('/ratings', wrap(async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Ratings are temporarily unavailable.' });
  const ratings = await Rating.aggregate([{ $group: { _id: '$bookSlug', average: { $avg: '$score' }, count: { $sum: 1 } } }]);
  res.set('Cache-Control', 'no-store').json({ ratings: ratings.map(row => ({ slug: row._id, average: Math.round(row.average * 10) / 10, count: row.count })) });
}));

// Guests can read totals; a supplied token also retrieves its owner's current vote.
router.get('/books/:id/ratings', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = req.headers.authorization ? await verifiedUser(req) : null;
  const book = await findBook(req);
  res.json(await summary(book.slug, user && user.id));
}));

// Validate 1-5, derive the voter from auth, then create or update that one vote.
router.put('/books/:id/ratings', wrap(async (req, res) => {
  const user = await verifiedUser(req);
  const score = req.body && req.body.score;
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Choose a whole number from 1 to 5.' });
  }
  const book = await findBook(req);
  await Rating.init();
  try {
    await Rating.findOneAndUpdate({ bookSlug: book.slug, userId: user.id }, { $set: { score } }, { upsert: true, runValidators: true });
  } catch (error) {
    // Two first-time saves may race; update the winning row instead of adding a duplicate.
    if (error.code !== 11000) throw error;
    await Rating.updateOne({ bookSlug: book.slug, userId: user.id }, { $set: { score } }, { runValidators: true });
  }
  res.set('Cache-Control', 'no-store').json(await summary(book.slug, user.id));
}));
module.exports = router;
