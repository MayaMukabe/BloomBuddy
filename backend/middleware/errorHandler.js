// middleware/errorHandler.js — Structured error handling and request logging

/**
 * Request logger middleware
 * Logs each incoming request with method, path, and response time
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  req.requestId = requestId;

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${logLevel}] [${requestId}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

/**
 * Structured error class for consistent API errors
 */
class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns structured JSON responses
 */
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error
  const logData = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    message: err.message,
    timestamp: new Date().toISOString(),
  };

  if (!isProduction) {
    logData.stack = err.stack;
  }

  if (statusCode >= 500) {
    console.error('[CRITICAL]', JSON.stringify(logData));
  } else {
    console.warn('[HANDLED]', JSON.stringify(logData));
  }

  // Send response
  res.status(statusCode).json({
    error: err.isOperational ? err.message : 'An unexpected error occurred',
    ...(err.details && !isProduction ? { details: err.details } : {}),
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  requestLogger,
  AppError,
  globalErrorHandler,
  notFoundHandler,
};
