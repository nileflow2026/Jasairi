/**
 * Custom error hierarchy
 *
 * Every thrown error that extends AppError is "operational" (expected).
 * The global error handler uses `isOperational` to decide whether to
 * log a full stack trace or just the message, and whether to expose
 * details to the client in production.
 */

class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} code       - Machine-readable error code for clients
   */
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 422 — input failed schema / business-rule validation */
class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    super(message, 422, "VALIDATION_ERROR");
    this.errors = errors; // [{ field, message }]
  }
}

/** 400 — malformed or logically invalid request */
class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400, "BAD_REQUEST");
  }
}

/** 401 — missing or invalid credentials */
class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_REQUIRED");
  }
}

/** 403 — authenticated but not authorised */
class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

/** 404 — resource does not exist */
class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/** 409 — state conflict (duplicate, stale update, etc.) */
class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

/** 429 — too many requests */
class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

module.exports = {
  AppError,
  ValidationError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
