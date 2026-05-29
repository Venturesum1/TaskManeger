const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  logger.error('[API Error]', {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
