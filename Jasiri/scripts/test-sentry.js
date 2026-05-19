/**
 * Sends a single test error event to Sentry using only the project DSN.
 * No auth token or extra npm packages required — uses Node.js built-in https.
 *
 * Usage:
 *   node scripts/test-sentry.js
 */

const https = require("https");
const crypto = require("crypto");

// ── Parse DSN ──────────────────────────────────────────────────────────────
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (!DSN) {
  console.error(
    "ERROR: EXPO_PUBLIC_SENTRY_DSN is not set.\n" +
      "Run:  $env:EXPO_PUBLIC_SENTRY_DSN='your-dsn'; node scripts/test-sentry.js",
  );
  process.exit(1);
}

const url = new URL(DSN);
const publicKey = url.username;
const projectId = url.pathname.replace("/", "");
const host = url.hostname;

const storeUrl = `https://${host}/api/${projectId}/store/`;
const authHeader = `Sentry sentry_version=7, sentry_key=${publicKey}`;

// ── Build event payload ────────────────────────────────────────────────────
const event = {
  event_id: crypto.randomBytes(16).toString("hex"),
  timestamp: new Date().toISOString(),
  platform: "node",
  level: "error",
  logger: "jasiri.test",
  environment: "test",
  release: "jasiri@1.0.0",
  message: "JASIRI: Sentry integration verified ✓",
  exception: {
    values: [
      {
        type: "SentryVerificationError",
        value: "JASIRI: First Sentry test event — SDK is working correctly.",
        stacktrace: {
          frames: [
            {
              filename: "scripts/test-sentry.js",
              function: "main",
              lineno: 1,
              in_app: true,
            },
          ],
        },
      },
    ],
  },
  tags: {
    test: "true",
    source: "cli",
  },
};

const body = JSON.stringify(event);

// ── Send ───────────────────────────────────────────────────────────────────
const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "X-Sentry-Auth": authHeader,
  },
};

console.log(`Sending test event to Sentry...`);
console.log(`  Project : ${projectId}`);
console.log(`  Host    : ${host}`);

const req = https.request(storeUrl, options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      console.log(`\n✓ Event accepted by Sentry!`);
      console.log(`  Event ID : ${parsed.id}`);
      console.log(
        `  View it  : https://sentry.io/organizations/nile-flow-holidings/issues/?project=${projectId}`,
      );
    } else {
      console.error(`✗ Sentry returned HTTP ${res.statusCode}: ${data}`);
    }
  });
});

req.on("error", (err) => {
  console.error("✗ Request failed:", err.message);
});

req.write(body);
req.end();
