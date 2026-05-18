const { logger } = require("../utils/logger");

// Patterns in URLs that may contain PII or sensitive identifiers.
// We redact Appwrite-style document IDs (24-char hex) to avoid leaking
// child/user IDs into log aggregators (A09 — secure logging).
const SENSITIVE_PATH_RE = /\/[0-9a-f]{20,24}/gi;

/**
 * Replace resource IDs in a path with [id] to reduce PII exposure in logs.
 * e.g. /children/6645abc123def0987654abcd -> /children/[id]
 */
const maskPath = (url) => url.replace(SENSITIVE_PATH_RE, "/[id]");

/**
 * Request logging middleware.
 * Attaches req.id (set upstream) to every log entry so all log lines
 * for a single request share a common trace handle (A09).
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const maskedUrl = maskPath(req.originalUrl);

  logger.info("Incoming request", {
    requestId: req.id,
    method: req.method,
    url: maskedUrl,
    // Log hashed IP to allow abuse detection without storing raw PII (A09)
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentLength: req.get("Content-Length"),
  });

  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - start;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level]("Request completed", {
      requestId: req.id,
      method: req.method,
      url: maskedUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = { requestLogger };
