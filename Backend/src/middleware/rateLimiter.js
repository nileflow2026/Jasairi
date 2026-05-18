const rateLimit = require("express-rate-limit");

/**
 * Rate limiter factory
 *
 * Four named limiters cover the common Jasiri API patterns:
 *   authLimiter    — applied to /auth/login & /auth/register (brute-force guard)
 *   refreshLimiter — applied to /auth/refresh (token rotation abuse guard)
 *   generalLimiter — applied to all /api/* routes as a baseline
 *   aiLimiter      — applied to /ai/* routes (expensive inference calls)
 */

/** Strict limiter for authentication endpoints */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  skipSuccessfulRequests: true, // count only failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
    timestamp: new Date().toISOString(),
  },
});

/**
 * Refresh token limiter — prevents token rotation abuse.
 * A legitimate client refreshes at most once per access-token lifetime.
 * 10 attempts per 15 min is generous even for flaky networks (A01).
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many token refresh attempts. Please log in again.",
    timestamp: new Date().toISOString(),
  },
});

/** Baseline limiter for general API routes */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please slow down.",
    timestamp: new Date().toISOString(),
  },
});

/** Tighter limiter for AI inference endpoints */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "AI rate limit reached. Please wait before sending more requests.",
    timestamp: new Date().toISOString(),
  },
});

module.exports = { authLimiter, refreshLimiter, generalLimiter, aiLimiter };
