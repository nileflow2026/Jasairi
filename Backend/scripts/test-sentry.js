/**
 * Sends a single test error event to Sentry using the backend project DSN.
 * No auth token or extra npm packages required — uses Node.js built-in https.
 *
 * Usage:
 *   node scripts/test-sentry.js
 */

const https = require("https");
const crypto = require("crypto");

// ── Parse DSN ──────────────────────────────────────────────────────────────
const DSN =
  process.env.SENTRY_DSN ||
  "https://3e9ce9a9291fc67848f0d7b4defd9ec5@o4510430501666816.ingest.us.sentry.io/4511412300546048";

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
  logger: "jasiri.backend.test",
  environment: "test",
  release: "jasiri-backend@1.0.0",
  message: "JASIRI Backend: Sentry integration verified ✓",
  exception: {
    values: [
      {
        type: "SentryVerificationError",
        value:
          "JASIRI Backend: First Sentry test event — Express SDK is working correctly.",
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
    service: "jasiri-backend",
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

console.log("Sending test event to Sentry (backend project)...");
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
