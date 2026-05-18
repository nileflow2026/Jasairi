const winston = require("winston");
const path = require("path");
const fs = require("fs");
const { config } = require("../config");

// Ensure logs directory exists in production
if (config.nodeEnv === "production") {
  const logsDir = path.resolve("logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
}

// ── Log format ────────────────────────────────────────────────────────────────

/** JSON format for structured log aggregators (Loki, Logtail, Datadog) */
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  // Redact child IDs from message strings to limit PII in external services
  winston.format((info) => {
    if (typeof info.message === "string") {
      info.message = info.message.replace(/[0-9a-f]{20,24}/gi, "[id]");
    }
    return info;
  })(),
  winston.format.json(),
);

/** Human-readable format for local development */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const rid = requestId ? ` [${requestId.slice(0, 8)}]` : "";
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp}${rid} ${level}: ${message}${extras}`;
  }),
);

// ── Transports ────────────────────────────────────────────────────────────────

const transports = [
  new winston.transports.Console({
    format: config.nodeEnv === "production" ? structuredFormat : devFormat,
  }),
];

if (config.nodeEnv === "production") {
  // Try to use daily-rotate-file for automatic rotation; fall back to static files.
  // Install with: npm install winston-daily-rotate-file
  try {
    require("winston-daily-rotate-file");
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: "logs/error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "14d", // retain 2 weeks
        zippedArchive: true,
      }),
      new winston.transports.DailyRotateFile({
        filename: "logs/combined-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxSize: "50m",
        maxFiles: "14d",
        zippedArchive: true,
      }),
    );
  } catch {
    // winston-daily-rotate-file not installed — use static files
    transports.push(
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({ filename: "logs/combined.log" }),
    );
  }
}

// ── Logger instance ───────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: config.logging.level,
  format: structuredFormat,
  defaultMeta: {
    service: "jasiri-backend",
    environment: config.nodeEnv,
  },
  transports,
  // Do NOT exit on handled exceptions — let our shutdown logic decide
  exitOnError: false,
});

// ── Sentry transport (optional) ───────────────────────────────────────────────
// Set SENTRY_DSN env var and install @sentry/node to enable.
// This captures every logger.error() call as a Sentry event automatically.
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require("@sentry/node");
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: config.nodeEnv });

    // Monkey-patch logger.error to also forward to Sentry
    const originalError = logger.error.bind(logger);
    logger.error = (message, meta = {}) => {
      const err = meta.error instanceof Error ? meta.error : new Error(message);
      Sentry.captureException(err, { extra: meta });
      return originalError(message, meta);
    };

    logger.info("Sentry error transport enabled");
  } catch {
    logger.warn(
      "SENTRY_DSN set but @sentry/node is not installed — Sentry disabled",
    );
  }
}

module.exports = { logger };
