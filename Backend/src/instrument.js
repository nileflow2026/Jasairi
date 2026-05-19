// @ts-nocheck
/**
 * Sentry instrumentation for JASIRI Backend.
 *
 * MUST be required as the very first import in server.js so Sentry can
 * patch Node.js core modules (http, https) before any other code loads.
 *
 * PRIVACY: sendDefaultPii is off — we do not send IP addresses or session
 * cookies to Sentry. Only the anonymous user ID is attached to events.
 * Complies with COPPA-friendly data minimisation principles.
 *
 * Env vars:
 *   SENTRY_DSN      — Sentry DSN for this project (required to activate)
 *   NODE_ENV        — used to set environment tag and enable/disable sending
 */

const Sentry = require("@sentry/node");
const { version } = require("../package.json");

const DSN = process.env.SENTRY_DSN;
const IS_PROD = process.env.NODE_ENV === "production";
const RELEASE = `jasiri-backend@${version}`;

if (!DSN) {
  // Non-fatal — app runs normally, errors just aren't sent to Sentry
  console.info("[sentry] SENTRY_DSN not set — error reporting disabled");
} else {
  Sentry.init({
    dsn: DSN,
    release: RELEASE,
    environment: process.env.NODE_ENV ?? "development",

    // Only send events in production to keep the dashboard clean
    enabled: IS_PROD,

    // Capture 10% of requests for performance tracing in production
    tracesSampleRate: IS_PROD ? 0.1 : 1.0,

    // Do NOT send IP addresses, cookies, or user PII automatically
    sendDefaultPii: false,

    // Strip any residual PII before the event leaves the server
    beforeSend(event) {
      // Remove IP from request context
      if (event.request) {
        delete event.request.env;
        delete event.request.cookies;
      }
      // Keep only anonymous user ID — never name, email, or phone
      if (event.user) {
        const { id } = event.user;
        event.user = id ? { id } : null;
      }
      return event;
    },
  });

  console.info(`[sentry] Initialized (enabled=${IS_PROD})`);
}
