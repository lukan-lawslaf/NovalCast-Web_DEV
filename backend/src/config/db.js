'use strict';

/**
 * MongoDB Atlas connection handling.
 *
 * Connects with bounded retries and exponential backoff, and keeps the process
 * aware of connection loss so /api/health reports the truth instead of a stale
 * "ok" from boot time.
 *
 * `mongodb+srv://` URIs need a DNS SRV lookup. Local DNS stubs (VPN clients,
 * ad blockers, some router configs) reject SRV queries, which surfaces as
 * `querySrv ECONNREFUSED`. When that happens the connection is retried once
 * with public resolvers before giving up.
 */

const dns = require('dns');
const mongoose = require('mongoose');

const env = require('./env');

const DEFAULT_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;

/** Public resolvers used only when the local one cannot answer SRV queries. */
const DEFAULT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

const SRV_ERROR_CODES = new Set(['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL', 'EREFUSED', 'ENOTFOUND']);

let listenersAttached = false;
let dnsFallbackApplied = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function backoffDelay(attempt) {
  return Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
}

/** True when the failure looks like DNS refusing the SRV lookup. */
function isSrvFailure(error) {
  if (!error) return false;
  if (SRV_ERROR_CODES.has(error.code)) return true;
  return /querySrv|_mongodb\._tcp/i.test(error.message || '');
}

/** Point Node's resolver at public DNS servers. Returns false when disabled. */
function applyDnsFallback() {
  const servers = (env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length === 0) {
    console.warn(
      '[db] Local resolver refused the SRV lookup and MONGODB_DNS_SERVERS is empty, ' +
        'so no fallback resolver is available.'
    );
    return false;
  }

  dns.setServers(servers);
  console.log(`[db] Local resolver refused the SRV lookup; using ${servers.join(', ')} instead.`);
  return true;
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => console.log('[db] Connected to MongoDB Atlas.'));
  mongoose.connection.on('reconnected', () => console.log('[db] Reconnected to MongoDB Atlas.'));
  mongoose.connection.on('disconnected', () => console.warn('[db] Disconnected from MongoDB Atlas.'));
  mongoose.connection.on('error', (error) => console.error('[db] Connection error:', error.message));
}

/**
 * Connect to Atlas, retrying transient failures.
 * @param {string} uri MongoDB connection string.
 * @param {{retries?: number}} [options]
 * @returns {Promise<import('mongoose').Mongoose>}
 */
async function connectDB(uri, { retries = DEFAULT_RETRIES } = {}) {
  if (!uri) throw new Error('connectDB: MONGODB_URI is empty.');

  mongoose.set('strictQuery', true);
  attachListeners();

  let lastError;
  let attempt = 1;

  while (attempt <= retries) {
    try {
      const startedAt = Date.now();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      console.log(`[db] Handshake complete in ${Date.now() - startedAt}ms.`);
      return mongoose;
    } catch (error) {
      lastError = error;

      // A refused SRV lookup is a local resolver problem, not a bad URI —
      // retry immediately with a resolver that can answer it.
      if (!dnsFallbackApplied && isSrvFailure(error) && applyDnsFallback()) {
        dnsFallbackApplied = true;
        continue;
      }

      const isLastAttempt = attempt === retries;
      console.error(
        `[db] Connection attempt ${attempt}/${retries} failed: ${error.message}` +
          (isLastAttempt ? '' : ` — retrying in ${backoffDelay(attempt)}ms`)
      );
      if (isLastAttempt) break;

      await sleep(backoffDelay(attempt));
      attempt += 1;
    }
  }

  throw lastError || new Error('connectDB: unknown failure');
}

async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log('[db] Disconnected.');
}

/** Human-readable state for /api/health. */
function connectionState() {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

module.exports = { connectDB, disconnectDB, connectionState };
