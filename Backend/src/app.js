// @ts-nocheck
const Sentry = require("@sentry/node");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const { config } = require("./config");
const { logger } = require("./utils/logger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/requestLogger");
const { sanitizeBody } = require("./middleware/sanitize");
const { generalLimiter } = require("./middleware/rateLimiter");
const { authRoutes } = require("./routes/auth");
const { childRoutes } = require("./routes/child");
const { gameRoutes } = require("./routes/game");
const { aiRoutes } = require("./routes/ai");
const { artRoutes } = require("./routes/art");
const { healthRoutes } = require("./routes/health");

const app = express();

// ── Request ID ────────────────────────────────────────────────────────────────
// Attach a per-request ID for tracing across logs (A09).
// Clients receive it as X-Request-Id for support correlation.
app.use((req, res, next) => {
  const id = uuidv4();
  req.id = id;
  res.set("X-Request-Id", id);
  next();
});

// ── Security headers (A05) ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    // Prevent MIME-type sniffing
    noSniff: true,
    // Force HTTPS for 1 year (preload-ready)
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Deny framing — mitigates clickjacking
    frameguard: { action: "deny" },
    // Remove X-Powered-By to avoid fingerprinting
    hidePoweredBy: true,
    // Block reflected XSS in older browsers
    xssFilter: true,
    // Disable client-side DNS prefetch
    dnsPrefetchControl: { allow: false },
    // Restrict referrer to origin only
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // Minimal permissions policy — this is a data API, not a browser app
    permittedCrossDomainPolicies: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
// React Native apps do not send an Origin header (they are not browsers).
// We pass those through unconditionally and only validate browser origins.
app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = React Native / server-to-server / curl → allow
      if (!origin) return callback(null, true);
      // Browser origin must be in the allow-list
      if (config.cors.origin.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Request-Id"],
  }),
);

// Baseline rate limiting for all /api routes
app.use("/api", generalLimiter);

// ── Body parsing & compression ────────────────────────────────────────────────
// JSON limit is 100 kb — enough for any legitimate JSON payload on this API.
// File uploads go through multer in the art router and bypass this limit.
// Keeping this small mitigates large-payload DoS (A05).
app.use(compression());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Strip HTML tags from all string body fields — prevents stored XSS (A03).
// Applied after body parsing, before route handlers.
app.use(sanitizeBody);

// Request logging
app.use(requestLogger);

// Health check (no auth, no rate limit)
app.use("/health", healthRoutes);

// Versioned API routes
const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes);
apiRouter.use("/children", childRoutes);
apiRouter.use("/games", gameRoutes);
apiRouter.use("/ai", aiRoutes);
apiRouter.use("/art", artRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// 404 handler — must come after all valid routes
app.use("*", notFoundHandler);

// Sentry error handler — captures unhandled errors from routes.
// Must be registered after all controllers and before any other error middleware.
Sentry.setupExpressErrorHandler(app);

// Global error handler — must be last
app.use(errorHandler);

module.exports = { app };
