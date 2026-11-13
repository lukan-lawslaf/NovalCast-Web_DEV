'use strict';

// Format API failures as JSON without revealing database errors or private provider details.
// Express identifies error middleware by its four arguments.
module.exports = function errorHandler(error, req, res, next) {
  // Once a response has started, let Express handle the failure instead of sending JSON twice.
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
  console.error(`[error] ${req.method} ${req.path}: ${error.name || 'Error'} (${status})`);
  // Only deliberately marked dependency errors may expose a 5xx message.
  // Unexpected exceptions and unmarked database/provider failures stay private.
  const publicUnavailable = status === 503 && error.expose === true;
  let message = status >= 500 && !publicUnavailable ? 'Internal server error' : error.message || 'Request failed';
  // Replace body-parser errors with clear messages that do not expose request contents.
  if (error.type === 'entity.parse.failed') message = 'Request body must be valid JSON.';
  if (error.type === 'entity.too.large') message = 'Request body is too large.';
  res.status(status).json({ error: message });
};
