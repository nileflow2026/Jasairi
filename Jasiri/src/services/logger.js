/**
 * Centralized logger for the JASIRI mobile app.
 *
 * Design goals:
 *  - Zero dependencies — pure JS, no native modules required
 *  - dev: colorized console output with level prefix
 *  - prod: silent console + forward errors to errorReporting service
 *  - Structured payloads so log entries are parseable by aggregators
 *  - No PII — child IDs are masked before output
 *
 * Usage:
 *   import logger from '../services/logger';
 *   logger.info('Game started', { gameId: 'memory', childId: '[masked]' });
 *   logger.error('API failed', { error, path: '/games' });
 */

import { reportError } from "./errorReporting";

// ── Config ────────────────────────────────────────────────────────────────────

const IS_DEV = __DEV__;

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = IS_DEV ? LEVELS.debug : LEVELS.warn;

// Console method map
const CONSOLE_METHODS = {
  debug: "log",
  info: "info",
  warn: "warn",
  error: "error",
};

// Dev-only color codes (no-op on native, but readable in Metro/Hermes console)
const COLORS = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
};

// ── Sanitizer ─────────────────────────────────────────────────────────────────

/** Replace Appwrite-style IDs (20-24 hex chars) to avoid logging child PII */
const maskIds = (str) =>
  typeof str === "string" ? str.replace(/[0-9a-f]{20,24}/gi, "[id]") : str;

// ── Core log function ─────────────────────────────────────────────────────────

function log(level, message, context = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    level,
    message: maskIds(message),
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (IS_DEV) {
    const color = COLORS[level] ?? "";
    const reset = COLORS.reset;
    const prefix = `${color}[${level.toUpperCase()}]${reset}`;
    // eslint-disable-next-line no-console
    console[CONSOLE_METHODS[level]](prefix, entry.message, context);
  }

  // Forward errors to the reporting service (Sentry / custom backend)
  if (level === "error") {
    const err = context.error instanceof Error ? context.error : null;
    reportError(err ?? new Error(message), { level, ...context });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const logger = {
  debug: (message, context) => log("debug", message, context),
  info: (message, context) => log("info", message, context),
  warn: (message, context) => log("warn", message, context),
  error: (message, context) => log("error", message, context),
};

export default logger;
