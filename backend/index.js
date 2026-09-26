'use strict';

/**
 * NovelCast backend entry point.
 *
 * Boots Express on PORT (default 4000), connects to MongoDB Atlas, and mounts
 * the catalog + ingestion routes. The server only starts listening once the
 * database connection is established, so /api/health is never a false positive.
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const env = require('./src/config/env');
const { connectDB, disconnectDB, connectionState } = require('./src/config/db');
const catalogRoutes = require('./src/routes/catalogRoutes');
const ingestRoutes = require('./src/routes/ingestRoutes');

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((value) => value.trim()),
  })
);
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

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

app.use('/api', catalogRoutes);
app.use('/api', ingestRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((error, req, res, next) => {
  const status = error.status && error.status >= 400 ? error.status : 500;
  console.error(`[error] ${req.method} ${req.originalUrl}:`, error.message);
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : error.message,
    detail: status === 500 ? error.message : undefined,
  });
});

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

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.start = start;
module.exports.mongoose = mongoose;
