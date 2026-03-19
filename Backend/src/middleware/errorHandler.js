const { logger } = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse = {
    success: false,
    message: isDevelopment ? error.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack }),
  };

  // Send error response
  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
