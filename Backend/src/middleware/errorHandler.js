const { logger } = require("../utils/logger");
const { AppError, ValidationError } = require("../utils/errors");

/**
 * Global error handler middleware.
 *
 * Distinguishes between operational errors (AppError subclasses, expected
 * failures) and programming errors (unexpected, log full stack).
 */
const errorHandler = (error, req, res, _next) => {
  const isOperational = error instanceof AppError;
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isOperational) {
    // Expected application error — log at warn level, expose to client
    logger.warn("Application error", {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      url: req.originalUrl,
      method: req.method,
    });

    const body = {
      success: false,
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    // Include field-level errors for validation failures
    if (error instanceof ValidationError && Array.isArray(error.errors)) {
      body.errors = error.errors;
    }

    return res.status(error.statusCode).json(body);
  }

  // Unexpected programming error — log full stack
  // err.cause contains the underlying OS/network error for fetch failures
  logger.error("Unexpected error", {
    error: error.message,
    cause: error.cause?.message ?? error.cause ?? undefined,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: isDevelopment
      ? error.message
      : "An unexpected error occurred. Please try again later.",
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack }),
  });
};

/**
 * 404 catch-all — placed after all valid routes in app.js.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { errorHandler, notFoundHandler };
