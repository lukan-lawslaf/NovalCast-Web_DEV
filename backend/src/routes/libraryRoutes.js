'use strict';

// Save or restore one verified account's private JSON library through GET/PUT requests.

const express = require('express');
const env = require('../config/env');
const { createLibraryJsonStore } = require('../services/libraryJsonStore');

// Attach an HTTP status so the route can return expected authentication errors.
function httpError(message, status) { return Object.assign(new Error(message), { status }); }

// Ask Supabase who owns the token; never trust an account ID supplied in the form data.
async function verifiedUser(req) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!match) throw httpError('Please sign in to sync your library.', 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw httpError('Account verification is unavailable.', 503);
  // Send the bearer token to Supabase with a timeout; the response supplies the account identity.
  let response;
  try {
    response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${match[1]}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw httpError('Could not verify your account. Please try again.', 503);
  }
  // Distinguish a temporarily unavailable verifier from an invalid or expired session.
  if (response.status >= 500 || response.status === 429) throw httpError('Account verification is temporarily unavailable.', 503);
  if (!response.ok) throw httpError('Your session expired. Please sign in again.', 401);
  // Parse and validate the verified account before using its ID as a storage key.
  let user;
  try { user = await response.json(); }
  catch { throw httpError('Account verification is temporarily unavailable.', 503); }
  if (!user || typeof user.id !== 'string' || !user.id || user.id.length > 256 || !user.email_confirmed_at || user.is_anonymous) throw httpError('Please sign in with a verified account.', 401);
  return user;
}

// Injectable storage/auth helpers let isolated tests avoid live accounts and real user files.
function createLibraryRouter({ store = createLibraryJsonStore(), verifyUser = verifiedUser } = {}) {
  const router = express.Router();
  // Verify identity before reading/writing data; a 409 also returns the latest library to merge.
  const handle = operation => async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const user = await verifyUser(req);
      res.json(await operation(req, user));
    // Return expected client or availability errors; forward unexpected failures to Express.
    } catch (error) {
      if ([400, 401, 409, 503].includes(error.status)) {
        return res.status(error.status).json({ error: error.message, ...(error.status === 409 ? { document: error.document } : {}) });
      }
      next(error);
    }
  };
  router.get('/me/library', handle((req, user) => store.read(user.id)));
  router.put('/me/library', handle((req, user) => store.save(user.id, req.body)));
  return router;
}

module.exports = createLibraryRouter();
module.exports.createLibraryRouter = createLibraryRouter;
module.exports.verifiedUser = verifiedUser;
