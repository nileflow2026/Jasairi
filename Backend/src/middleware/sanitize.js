/**
 * Input Sanitization Middleware (A03 — Injection)
 *
 * Recursively walks the parsed request body and strips characters that
 * could be used for stored XSS or HTML injection attacks.
 *
 * This is a defense-in-depth measure that sits alongside express-validator.
 * It does NOT replace proper output encoding on the client.
 *
 * Rules applied to every string value in the body:
 *  - Strip HTML tags (prevents stored XSS via caregiver notes / child names)
 *  - Collapse repeated whitespace
 *  - Trim leading / trailing whitespace
 *
 * Non-string primitives, Buffers, and file uploads are left untouched.
 */

// Simple, dependency-free HTML tag stripper — avoids pulling in a heavy parser.
// The regex is intentionally aggressive: it removes anything that looks like
// an HTML/XML tag, including malformed ones.
const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_EVENT_RE = /on\w+\s*=\s*["'][^"']*["']/gi;
const WHITESPACE_RE = /\s{2,}/g;

/**
 * Sanitize a single string value.
 * @param {string} value
 * @returns {string}
 */
const sanitizeString = (value) =>
  value
    .replace(HTML_TAG_RE, "")
    .replace(SCRIPT_EVENT_RE, "")
    .replace(WHITESPACE_RE, " ")
    .trim();

/**
 * Recursively sanitize all string values in an object or array.
 * @param {unknown} data
 * @returns {unknown}
 */
const sanitizeValue = (data) => {
  if (typeof data === "string") return sanitizeString(data);
  if (Array.isArray(data)) return data.map(sanitizeValue);
  if (data !== null && typeof data === "object") {
    const result = {};
    for (const [key, val] of Object.entries(data)) {
      result[key] = sanitizeValue(val);
    }
    return result;
  }
  return data; // numbers, booleans, null — unchanged
};

/**
 * Express middleware that sanitizes req.body in-place.
 *
 * Usage (applied globally in app.js after body parsers):
 *   app.use(sanitizeBody);
 *
 * Or per-router if you prefer selective application.
 */
const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = { sanitizeBody };
