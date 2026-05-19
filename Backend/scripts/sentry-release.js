#!/usr/bin/env node
/**
 * Notifies Sentry that a new backend release has been deployed.
 *
 * Run this as the final step of every backend deployment:
 *   node scripts/sentry-release.js
 *
 * Required env vars:
 *   SENTRY_AUTH_TOKEN  — Sentry auth token (Settings → Auth Tokens)
 *   NODE_ENV           — deployment environment (default: production)
 *
 * Optional env vars:
 *   SENTRY_RELEASE     — override release name (default: jasiri-backend@<version>)
 *
 * What this does (mirrors `sentry-cli releases` commands):
 *   1. Creates the release in Sentry
 *   2. Finalises it (marks it as deployed)
 *   3. Creates a deploy record tied to the environment
 */

const https = require("https");
const { version } = require("../package.json");

const AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const ORG = "nile-flow-holidings";
const PROJECT = "jasiribackend";
const ENVIRONMENT = process.env.NODE_ENV ?? "production";
const RELEASE = process.env.SENTRY_RELEASE ?? `jasiri-backend@${version}`;

if (!AUTH_TOKEN) {
  console.error(
    "ERROR: SENTRY_AUTH_TOKEN is not set.\n" +
      "Get one at: sentry.io → Settings → Auth Tokens → Create New Token\n" +
      "Required scopes: project:releases",
  );
  process.exit(1);
}

/** Make an authenticated Sentry API request. */
function sentryRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "sentry.io",
      path: `/api/0${path}`,
      method,
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        ...(payload && { "Content-Length": Buffer.byteLength(payload) }),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`\nSentry Release Notification`);
  console.log(`  Org         : ${ORG}`);
  console.log(`  Project     : ${PROJECT}`);
  console.log(`  Release     : ${RELEASE}`);
  console.log(`  Environment : ${ENVIRONMENT}\n`);

  // Step 1 — Create (or update) the release
  await sentryRequest("POST", `/organizations/${ORG}/releases/`, {
    version: RELEASE,
    projects: [PROJECT],
  });
  console.log(`✓ Release created: ${RELEASE}`);

  // Step 2 — Finalise the release (marks dateReleased)
  await sentryRequest(
    "PUT",
    `/organizations/${ORG}/releases/${encodeURIComponent(RELEASE)}/`,
    {
      projects: [PROJECT],
      dateReleased: new Date().toISOString(),
    },
  );
  console.log(`✓ Release finalised`);

  // Step 3 — Create a deploy record
  const deploy = await sentryRequest(
    "POST",
    `/organizations/${ORG}/releases/${encodeURIComponent(RELEASE)}/deploys/`,
    {
      environment: ENVIRONMENT,
      dateStarted: new Date().toISOString(),
      dateFinished: new Date().toISOString(),
    },
  );
  console.log(`✓ Deploy recorded (id: ${deploy.id})`);
  console.log(
    `\n  View: https://sentry.io/organizations/${ORG}/releases/${encodeURIComponent(RELEASE)}/`,
  );
}

main().catch((err) => {
  console.error(`\n✗ Sentry release notification failed: ${err.message}`);
  // Non-zero exit so CI/CD pipelines can detect the failure
  process.exit(1);
});
