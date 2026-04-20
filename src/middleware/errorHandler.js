/**
 * Centralized error handler middleware
 * Must be the last middleware added in server.js
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err);
  } else {
    console.error(`[ERROR] ${statusCode} - ${message} | ${req.method} ${req.path}`);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
