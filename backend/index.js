'use strict';

/**
 * NovelCast backend entry point.
 *
 * Boots Express on PORT (default 4000), connects to MongoDB Atlas, and mounts
 * the public catalog and optional operator ingestion routes. /api/health
 * distinguishes the HTTP listener from a usable Atlas connection.
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const env = require('./src/config/env');
const { connectDB, disconnectDB, connectionState } = require('./src/config/db');
const catalogRoutes = require('./src/routes/catalogRoutes');
const ingestRoutes = require('./src/routes/ingestRoutes');
const ttsRoutes = require('./src/routes/ttsRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Middleware runs before routes: allow configured origins and record request timing.
app.disable('x-powered-by');
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((value) => value.trim()),
    exposedHeaders: ['X-TTS-Model', 'X-TTS-Voice-Id', 'X-TTS-Voice-Name'],
  })
);
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`[http] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

// Ingestion authorizes before parsing and uses a smaller body limit.
app.use('/api', ingestRoutes);
app.use(express.json({ limit: '1mb' }));

// A running HTTP server is not enough; health also checks the Atlas connection.
app.get('/api/health', (req, res) => {
  const state = connectionState();
  const healthy = state === 'connected';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database: healthy ? 'connected' : 'disconnected',
    connectionState: state,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Each router owns one feature; the library router uses JSON files, not Atlas.
app.use('/api', catalogRoutes);
app.use('/api', require('./src/routes/ratingRoutes'));
app.use('/api', require('./src/routes/libraryRoutes'));
app.use('/api', ttsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use(errorHandler);

// Start HTTP first so the catalog can still report useful results while Atlas reconnects.
async function start() {
  if (!env.MONGODB_URI) {
    console.error(
      '[startup] MONGODB_URI not found. Set it in atlas-credentials.env or the repo root .env.'
    );
  }

  console.log(`[startup] MONGODB_URI source: ${env.MONGODB_SOURCE || 'none'}`);

  const server = app.listen(env.PORT, () => {
    console.log(`[startup] NovelCast API listening on http://localhost:${env.PORT}`);
    console.log(`[startup] Database: ${env.MONGODB_DB_NAME}`);
  });

  if (env.MONGODB_URI) {
    connectDB(env.MONGODB_URI).catch((error) => {
      console.warn(`[startup] MongoDB Atlas connection delayed/unreachable: ${error.message}. Running in resilient public-domain catalog mode.`);
    });
  }

  const shutdown = async (signal) => {
    console.log(`[shutdown] ${signal} received, closing server.`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Importing this app in a test does not open a server or connect to the live database.
if (require.main === module) {
  start();
}

module.exports = app;
module.exports.start = start;
module.exports.mongoose = mongoose;
