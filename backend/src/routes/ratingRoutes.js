'use strict';
const express = require('express');
const mongoose = require('mongoose');
const env = require('../config/env');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

async function verifiedUser(req) {
  const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!token) throw Object.assign(new Error('Please sign in to rate this book.'), { status: 401 });
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw Object.assign(new Error('Account verification is unavailable.'), { status: 503 });
  }
  let response;
  try {
    response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token[1]}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw Object.assign(new Error('Could not verify your account. Please try again.'), { status: 503 });
  }
  if (response.status >= 500 || response.status === 429) {
    throw Object.assign(new Error('Account verification is temporarily unavailable. Please try again.'), { status: 503 });
  }
  if (!response.ok) throw Object.assign(new Error('Your session expired. Please sign in again.'), { status: 401 });
  const user = await response.json();
  if (!user.id || !user.email_confirmed_at || user.is_anonymous) {
    throw Object.assign(new Error('Please sign in with a verified account.'), { status: 401 });
  }
  return user;
}

async function findBook(req) {
  if (mongoose.connection.readyState !== 1) {
    throw Object.assign(new Error('Ratings are temporarily unavailable. Please try again shortly.'), { status: 503 });
  }
  const id = req.params.id;
  const book = await Book.findOne(mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }).lean();
  if (!book) throw Object.assign(new Error('Book not found.'), { status: 404 });
  return book;
}

async function summary(slug, userId) {
  const [groups, own] = await Promise.all([
    Rating.aggregate([{ $match: { bookSlug: slug } }, { $group: { _id: '$score', count: { $sum: 1 } } }]),
    userId ? Rating.findOne({ bookSlug: slug, userId }).lean() : null,
  ]);
  const distribution = [0, 0, 0, 0, 0];
  groups.forEach(group => { distribution[group._id - 1] = group.count; });
  const count = distribution.reduce((sum, value) => sum + value, 0);
  const total = distribution.reduce((sum, value, index) => sum + value * (index + 1), 0);
  return { count, average: count ? Math.round(total / count * 10) / 10 : null, distribution, myRating: own ? own.score : null };
}

router.get('/ratings', wrap(async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Ratings are temporarily unavailable.' });
  const ratings = await Rating.aggregate([{ $group: { _id: '$bookSlug', average: { $avg: '$score' }, count: { $sum: 1 } } }]);
  res.set('Cache-Control', 'no-store').json({ ratings: ratings.map(row => ({ slug: row._id, average: Math.round(row.average * 10) / 10, count: row.count })) });
}));

router.get('/books/:id/ratings', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = req.headers.authorization ? await verifiedUser(req) : null;
  const book = await findBook(req);
  res.json(await summary(book.slug, user && user.id));
}));

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
    if (error.code !== 11000) throw error;
    await Rating.updateOne({ bookSlug: book.slug, userId: user.id }, { $set: { score } }, { runValidators: true });
  }
  res.set('Cache-Control', 'no-store').json(await summary(book.slug, user.id));
}));
module.exports = router;
