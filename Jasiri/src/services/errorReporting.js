/**
 * Error reporting service for JASIRI.
 *
 * This is a Sentry-ready stub. In the current form it:
 *  - Works in development (logs to console)
 *  - Works in production without Sentry (silent, no crashes)
 *  - Becomes fully active the moment @sentry/react-native is installed
 *    and EXPO_PUBLIC_SENTRY_DSN is set in .env
 *
 * To activate Sentry:
 *   1. npx expo install @sentry/react-native
 *   2. Add EXPO_PUBLIC_SENTRY_DSN=<your-dsn> to .env
 *   3. Uncomment the Sentry import blocks below
 *
 * PRIVACY: We set minimal user context — only the child's anonymous profile ID
 * (not name, DOB, or any guardian PII). Complies with COPPA-friendly design.
 */

// ── Sentry import (uncomment after installing @sentry/react-native) ────────────
// import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const IS_DEV = __DEV__;

let initialized = false;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call once at app startup (inside RootLayout before rendering).
 */
export function initErrorReporting() {
  if (!DSN || initialized) return;

  try {
    // Sentry.init({
    //   dsn: DSN,
    //   environment: IS_DEV ? 'development' : 'production',
    //   // Capture 20% of sessions for performance tracing — cheap on free tier
    //   tracesSampleRate: IS_DEV ? 1.0 : 0.2,
    //   // Disable in dev to avoid polluting Sentry with test errors
    //   enabled: !IS_DEV,
    //   // Strip PII from breadcrumbs
    //   beforeSend(event) {
    //     if (event.user) delete event.user.email;
    //     return event;
    //   },
    // });
    initialized = true;
    if (IS_DEV) console.info("[errorReporting] initialized (stub mode)");
  } catch (err) {
    // Reporting must never crash the app
    if (IS_DEV) console.warn("[errorReporting] init failed", err);
  }
}

/**
 * Capture an error event.
 *
 * @param {Error} error     - The error to report
 * @param {object} context  - Extra metadata (screen, action, etc.)
 */
export function reportError(error, context = {}) {
  if (IS_DEV) {
    // In dev, surface errors prominently in the Metro console
    console.error("[errorReporting]", error?.message ?? error, context);
    return;
  }

  if (!initialized) return;

  try {
    // Sentry.withScope((scope) => {
    //   Object.entries(context).forEach(([key, value]) =>
    //     scope.setExtra(key, value)
    //   );
    //   Sentry.captureException(error);
    // });
  } catch {
    // Swallow — reporting must never crash the app
  }
}

/**
 * Set the active child profile for error grouping.
 * Only stores an anonymous profile ID — no names or PII.
 *
 * @param {{ profileId: string }} profile
 */
export function setReportingUser({ profileId }) {
  if (!initialized || !profileId) return;
  // Sentry.setUser({ id: profileId });
}

/**
 * Clear the current user context (on logout or profile switch).
 */
export function clearReportingUser() {
  if (!initialized) return;
  // Sentry.setUser(null);
}

/**
 * Add a breadcrumb for richer error context (e.g., game events).
 *
 * @param {{ category: string, message: string, level?: string }} breadcrumb
 */
export function addBreadcrumb({ category, message, level = "info" }) {
  if (!initialized) return;
  // Sentry.addBreadcrumb({ category, message, level });
}
