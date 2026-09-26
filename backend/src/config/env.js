'use strict';

/**
 * Environment loading.
 *
 * Precedence (highest first), matching the project brief:
 *   1. process.env            — shell / hosting provider wins
 *   2. atlas-credentials.env  — the file MongoDB Atlas generated on signup
 *   3. .env                   — the shared project env file at the repo root
 *
 * Values are read, never written back into process.env for keys we resolve
 * ourselves, so the precedence above stays predictable.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

/** Parse a dotenv-style file into a plain object. Never throws on bad input. */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');
  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    // Strip a single layer of matching quotes. Nothing else is treated as
    // syntax: MongoDB URIs legitimately contain '#', so inline comments are
    // deliberately NOT stripped.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    if (key) values[key] = value;
  }

  return values;
}

/** Prefer dotenv's parser when available, fall back to the local one. */
function parseDotenvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    // dotenv.parse() returns an object without mutating process.env — exactly
    // what we need to keep the documented precedence order intact.
    return require('dotenv').parse(fs.readFileSync(filePath));
  } catch {
    return parseEnvFile(filePath);
  }
}

const SOURCES = [
  { name: 'process.env', values: process.env, exists: true },
  {
    name: 'atlas-credentials.env',
    values: parseDotenvFile(path.join(PROJECT_ROOT, 'atlas-credentials.env')),
    exists: fs.existsSync(path.join(PROJECT_ROOT, 'atlas-credentials.env')),
  },
  {
    name: '.env',
    values: parseDotenvFile(path.join(PROJECT_ROOT, '.env')),
    exists: fs.existsSync(path.join(PROJECT_ROOT, '.env')),
  },
];

const KEY_ALIASES = {
  MONGODB_URI: ['MONGODB_URI', 'MONGODB_URL', 'MONGO_URI', 'MONGO_URL'],
  PORT: ['PORT', 'BACKEND_PORT'],
  CORS_ORIGIN: ['CORS_ORIGIN', 'ALLOWED_ORIGINS'],
  MONGODB_DB_NAME: ['MONGODB_DB', 'MONGODB_DB_NAME', 'DB_NAME'],
  MONGODB_DNS_SERVERS: ['MONGODB_DNS_SERVERS', 'DNS_SERVERS'],
};

/** First non-empty match for any alias, walking sources in precedence order. */
function lookup(aliases) {
  for (const source of SOURCES) {
    for (const key of aliases) {
      const value = source.values[key];
      if (typeof value === 'string' && value.trim()) {
        return { value: value.trim(), source: source.name, key };
      }
    }
  }
  return { value: undefined, source: null, key: null };
}

const mongoUri = lookup(KEY_ALIASES.MONGODB_URI);
const port = lookup(KEY_ALIASES.PORT);
const corsOrigin = lookup(KEY_ALIASES.CORS_ORIGIN);
const dbName = lookup(KEY_ALIASES.MONGODB_DB_NAME);
const dnsServers = lookup(KEY_ALIASES.MONGODB_DNS_SERVERS);

/** Pull the database name out of a MongoDB connection string path segment. */
function databaseNameFromUri(uri) {
  if (!uri) return null;
  const match = /mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i.exec(uri);
  const name = match && match[1] ? decodeURIComponent(match[1]).trim() : '';
  return name || null;
}

module.exports = {
  PROJECT_ROOT,
  BACKEND_ROOT,
  MONGODB_URI: mongoUri.value || null,
  MONGODB_SOURCE: mongoUri.source,
  MONGODB_DB_NAME: dbName.value || databaseNameFromUri(mongoUri.value) || 'novelcast',
  PORT: Number(port.value) || 4000,
  CORS_ORIGIN: corsOrigin.value || '*',
  /**
   * Resolvers used only if the machine's own DNS refuses the SRV lookup that
   * `mongodb+srv://` requires (VPN clients and local stubs often do).
   * Set MONGODB_DNS_SERVERS="" to disable the fallback entirely.
   */
  MONGODB_DNS_SERVERS:
    dnsServers.source === null ? '8.8.8.8,1.1.1.1' : dnsServers.value,
  /** Non-secret summary, safe to log on boot. */
  describe() {
    return SOURCES.map((source) => `${source.name} (${source.exists ? 'found' : 'missing'})`).join(', ');
  },
};
