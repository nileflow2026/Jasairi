#!/usr/bin/env node
/**
 * setup-all-collections.js
 * Creates ALL Jasiri Appwrite collections and auto-updates .env.
 * Idempotent: skips collections whose IDs are already in .env and valid.
 *
 * Usage:
 *   1. Delete all collections from Appwrite console
 *   2. node scripts/setup-all-collections.js
 *   3. Restart: npm run dev
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Databases, ID, Permission, Role } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB = process.env.APPWRITE_DATABASE_ID;
const ENV_PATH = path.resolve(__dirname, "../.env");

const PERMS = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

// IDs written to .env during this run (env is reloaded from disk before each step)
function readEnvValue(key) {
  var content = fs.readFileSync(ENV_PATH, "utf8");
  var match = content.match(new RegExp("^" + key + "=\"?([^\"\\n]+)\"?", "m"));
  return match ? match[1].trim().replace(/"/g, "") : "";
}

function updateEnv(key, value) {
  var content = fs.readFileSync(ENV_PATH, "utf8");
  var regex = new RegExp("^(" + key + "=).*$", "m");
  if (regex.test(content)) {
    content = content.replace(regex, "$1\"" + value + "\"");
  } else {
    content += "\n" + key + "=\"" + value + "\"";
  }
  fs.writeFileSync(ENV_PATH, content, "utf8");
}

/**
 * Get or create a collection.
 * If the envKey already holds a valid Appwrite collection ID, reuse it.
 */
async function ensureCol(envKey, name) {
  var existingId = readEnvValue(envKey);
  if (existingId && existingId.length > 5) {
    try {
      await db.getCollection(DB, existingId);
      console.log("  [~] \"" + name + "\" already exists (" + existingId + ")");
      return existingId;
    } catch (_) {
      // ID in .env is stale / doesn't exist in Appwrite - create fresh
    }
  }
  var col = await db.createCollection(DB, ID.unique(), name, PERMS);
  console.log("  [+] \"" + name + "\" -> " + col.$id);
  return col.$id;
}

async function addAttr(type, colId, key) {
  var args = Array.prototype.slice.call(arguments, 3);
  try {
    await db[type].apply(db, [DB, colId, key].concat(args));
    process.stdout.write("      attr: " + key + "\n");
  } catch (e) {
    if (e.code === 409) process.stdout.write("      skip: " + key + " (exists)\n");
    else throw e;
  }
}

async function addIndex(colId, key, type, attrs) {
  try {
    await db.createIndex(DB, colId, key, type, attrs);
    process.stdout.write("      idx:  " + key + "\n");
  } catch (e) {
    if (e.code === 409) process.stdout.write("      skip: idx " + key + " (exists)\n");
    else throw e;
  }
}

async function waitReady(colId, n) {
  for (var i = 0; i < 40; i++) {
    var col = await db.getCollection(DB, colId);
    var ready = (col.attributes || []).filter(function(a) { return a.status === "available"; }).length;
    if (ready >= n) { process.stdout.write("      ready: " + ready + "/" + n + "\n"); return; }
    process.stdout.write("      waiting " + ready + "/" + n + "...\r");
    await new Promise(function(r) { setTimeout(r, 2500); });
  }
  console.log("\n      WARN: timed out - re-run the script if indexes fail");
}

// ── Collection setup functions ─────────────────────────────────────────────

async function setupGuardians() {
  var id = await ensureCol("APPWRITE_COLLECTION_GUARDIANS", "Guardians");
  await addAttr("createStringAttribute",  id, "email",       255, true);
  await addAttr("createStringAttribute",  id, "name",        100, true);
  await addAttr("createStringAttribute",  id, "role",         20, true);
  await addAttr("createStringAttribute",  id, "phoneNumber",  20, false);
  await addAttr("createStringAttribute",  id, "organization",100, false);
  await addAttr("createBooleanAttribute", id, "isVerified",      false, false);
  await addAttr("createDatetimeAttribute",id, "lastLoginAt",     false);
  await addAttr("createStringAttribute",  id, "preferences",5000, false);
  await waitReady(id, 8);
  await addIndex(id, "email_unique", "unique", ["email"]);
  await addIndex(id, "role_index",   "key",    ["role"]);
  return id;
}

async function setupChildren() {
  var id = await ensureCol("APPWRITE_COLLECTION_CHILDREN", "Children");
  await addAttr("createStringAttribute",  id, "name",            100, true);
  await addAttr("createIntegerAttribute", id, "age",                  true, 2, 18);
  await addAttr("createDatetimeAttribute",id, "dateOfBirth",          false);
  await addAttr("createStringAttribute",  id, "photoUrl",         500, false);
  // guardianIds: string array - Appwrite does NOT support indexes on array attributes
  await addAttr("createStringAttribute",  id, "guardianIds",       50, true, undefined, true);
  await addAttr("createStringAttribute",  id, "medicalInfo",     2000, false);
  await addAttr("createStringAttribute",  id, "emergencyContact", 500, false);
  await addAttr("createBooleanAttribute", id, "isActive",               false, true);
  await waitReady(id, 8);
  // Note: no index on guardianIds - Appwrite does not support indexing array attributes
  await addIndex(id, "age_index", "key", ["age"]);
  return id;
}

async function setupLearningProfiles() {
  var id = await ensureCol("APPWRITE_LEARNING_PROFILES_COLLECTION", "Learning Profiles");
  await addAttr("createStringAttribute",  id, "childId",           50, true);
  await addAttr("createFloatAttribute",   id, "accuracy",              true, 0.0, 1.0);
  await addAttr("createIntegerAttribute", id, "averageSpeed",          true);
  await addAttr("createFloatAttribute",   id, "consistency",           true, 0.0, 1.0);
  // array attributes - no indexes allowed
  await addAttr("createStringAttribute",  id, "preferredGameTypes", 50, false, undefined, true);
  await addAttr("createIntegerAttribute", id, "optimalSessionLength",  true, 1, 60);
  await addAttr("createStringAttribute",  id, "bestTimeOfDay",      20, false);
  await addAttr("createIntegerAttribute", id, "attentionSpan",          true, 1, 60);
  await addAttr("createStringAttribute",  id, "strongSkills",       50, false, undefined, true);
  await addAttr("createStringAttribute",  id, "challengeAreas",     50, false, undefined, true);
  await addAttr("createStringAttribute",  id, "progressTrend",      20, true);
  await addAttr("createStringAttribute",  id, "accessibilityNeeds",2000, false);
  await waitReady(id, 12);
  await addIndex(id, "child_unique",         "unique", ["childId"]);
  await addIndex(id, "progress_trend_index", "key",    ["progressTrend"]);
  return id;
}

async function setupPermissions() {
  var id = await ensureCol("APPWRITE_PERMISSIONS_COLLECTION", "Permissions");
  await addAttr("createStringAttribute",  id, "guardianId", 50, true);
  await addAttr("createStringAttribute",  id, "childId",    50, true);
  await addAttr("createStringAttribute",  id, "level",      20, true);
  await addAttr("createStringAttribute",  id, "grantedBy",  50, true);
  await addAttr("createDatetimeAttribute",id, "expiresAt",      false);
  await addAttr("createBooleanAttribute", id, "isActive",        false, true);
  await waitReady(id, 6);
  await addIndex(id, "guardian_child_unique", "unique", ["guardianId", "childId"]);
  await addIndex(id, "level_index",           "key",    ["level"]);
  await addIndex(id, "expires_index",         "key",    ["expiresAt"]);
  return id;
}

async function setupProgressReports() {
  var id = await ensureCol("APPWRITE_PROGRESS_COLLECTION", "Progress Reports");
  await addAttr("createStringAttribute",  id, "childId",           50, true);
  await addAttr("createDatetimeAttribute",id, "periodStart",           true);
  await addAttr("createDatetimeAttribute",id, "periodEnd",             true);
  await addAttr("createIntegerAttribute", id, "totalPlayTime",         true);
  await addAttr("createIntegerAttribute", id, "sessionsCompleted",     true);
  await addAttr("createFloatAttribute",   id, "averageAccuracy",       true, 0.0, 1.0);
  // array attributes - no indexes
  await addAttr("createStringAttribute",  id, "improvementAreas",  50, false, undefined, true);
  await addAttr("createStringAttribute",  id, "achievements",      50, false, undefined, true);
  await addAttr("createStringAttribute",  id, "recommendations", 2000, false);
  await addAttr("createStringAttribute",  id, "generatedBy",       20, true);
  await waitReady(id, 10);
  await addIndex(id, "child_period_index", "key", ["childId", "periodStart"]);
  await addIndex(id, "generated_by_index", "key", ["generatedBy"]);
  return id;
}

async function setupAIRecommendations() {
  var id = await ensureCol("APPWRITE_AI_RECOMMENDATIONS_COLLECTION", "AI Recommendations");
  await addAttr("createStringAttribute",  id, "childId",   50, true);
  await addAttr("createStringAttribute",  id, "type",      50, true);
  await addAttr("createStringAttribute",  id, "priority",  20, true);
  await addAttr("createStringAttribute",  id, "message",  500, true);
  await addAttr("createBooleanAttribute", id, "actionable",   false, false);
  await addAttr("createStringAttribute",  id, "data",     2000, false);
  await addAttr("createBooleanAttribute", id, "isRead",       false, false);
  await addAttr("createBooleanAttribute", id, "isImplemented",false, false);
  await addAttr("createDatetimeAttribute",id, "expiresAt",    false);
  await waitReady(id, 9);
  await addIndex(id, "child_priority_index", "key", ["childId", "priority"]);
  await addIndex(id, "type_index",           "key", ["type"]);
  await addIndex(id, "expires_index",        "key", ["expiresAt"]);
  return id;
}

async function setupArtworkSessions() {
  var id = await ensureCol("APPWRITE_ARTWORKS_SESSIONS_COLLECTION", "Artwork Sessions");
  await addAttr("createStringAttribute",  id, "childId",      50, true);
  await addAttr("createStringAttribute",  id, "guardianId",   36, true);
  await addAttr("createStringAttribute",  id, "type",         20, true);
  await addAttr("createStringAttribute",  id, "templateId",   50, false);
  await addAttr("createIntegerAttribute", id, "duration",         true);
  await addAttr("createStringAttribute",  id, "tools",        500, false);
  // colors is an array - no index
  await addAttr("createStringAttribute",  id, "colors",        20, false, undefined, true);
  await addAttr("createBooleanAttribute", id, "isCompleted",      false, false);
  await addAttr("createStringAttribute",  id, "imageUrl",     500, false);
  await addAttr("createStringAttribute",  id, "thumbnailUrl", 500, false);
  await addAttr("createStringAttribute",  id, "title",        100, false);
  await waitReady(id, 11);
  await addIndex(id, "child_date_index", "key", ["childId"]);
  await addIndex(id, "guardian_index",   "key", ["guardianId"]);
  await addIndex(id, "type_index",       "key", ["type"]);
  return id;
}

async function setupGameInteractions() {
  var id = await ensureCol("APPWRITE_GAME_INTERACTIONS_COLLECTION", "Game Interactions");
  await addAttr("createStringAttribute",  id, "sessionId",        50, true);
  await addAttr("createStringAttribute",  id, "childId",          50, true);
  await addAttr("createDatetimeAttribute",id, "timestamp",            true);
  await addAttr("createStringAttribute",  id, "interactionType",   20, true);
  await addAttr("createBooleanAttribute", id, "success",              true);
  await addAttr("createIntegerAttribute", id, "responseTime",         true);
  await addAttr("createStringAttribute",  id, "difficulty",        20, true);
  await addAttr("createStringAttribute",  id, "coordinates",      100, false);
  await addAttr("createStringAttribute",  id, "metadata",        1000, false);
  await waitReady(id, 9);
  await addIndex(id, "session_index",         "key", ["sessionId"]);
  await addIndex(id, "child_timestamp_index", "key", ["childId"]);
  return id;
}

async function setupGameSessions() {
  var id = await ensureCol("APPWRITE_GAME_SESSIONS_COLLECTION", "Game Sessions");
  await addAttr("createStringAttribute",  id, "gameId",        36, true);
  await addAttr("createStringAttribute",  id, "childId",       36, true);
  await addAttr("createStringAttribute",  id, "guardianId",    36, true);
  await addAttr("createStringAttribute",  id, "difficulty",    30, true);
  await addAttr("createStringAttribute",  id, "status",        20, true);
  await addAttr("createIntegerAttribute", id, "attemptCount",      false, 0, undefined, 0);
  await addAttr("createStringAttribute",  id, "startedAt",     30, true);
  await addAttr("createStringAttribute",  id, "completedAt",   30, false);
  await addAttr("createFloatAttribute",   id, "finalScore",        false, 0, 1000);
  await addAttr("createIntegerAttribute", id, "completionTimeMs",  false, 0);
  await addAttr("createStringAttribute",  id, "notes",        2000, false);
  await waitReady(id, 11);
  await addIndex(id, "idx_guardianId", "key", ["guardianId"]);
  await addIndex(id, "idx_childId",    "key", ["childId"]);
  await addIndex(id, "idx_gameId",     "key", ["gameId"]);
  await addIndex(id, "idx_status",     "key", ["status"]);
  await addIndex(id, "idx_startedAt",  "key", ["startedAt"]);
  return id;
}

async function setupGames() {
  var id = await ensureCol("APPWRITE_COLLECTION_GAMES", "Games");
  await addAttr("createStringAttribute",  id, "name",          120, true);
  await addAttr("createStringAttribute",  id, "description",  1000, false);
  await addAttr("createStringAttribute",  id, "type",           60, false);
  await addAttr("createStringAttribute",  id, "difficulty",     30, false);
  await addAttr("createIntegerAttribute", id, "minAge",             false, 0, 18);
  await addAttr("createIntegerAttribute", id, "maxAge",             false, 0, 18);
  await addAttr("createStringAttribute",  id, "thumbnailUrl",   512, false);
  await addAttr("createBooleanAttribute", id, "isActive",           false, true);
  await addAttr("createStringAttribute",  id, "tags",           512, false);
  await waitReady(id, 9);
  await addIndex(id, "idx_name",   "key", ["name"]);
  await addIndex(id, "idx_type",   "key", ["type"]);
  await addIndex(id, "idx_active", "key", ["isActive"]);
  return id;
}

async function setupGameAttempts() {
  var id = await ensureCol("APPWRITE_GAME_ATTEMPTS_COLLECTION", "Game Attempts");
  await addAttr("createStringAttribute",  id, "sessionId",          36, true);
  await addAttr("createStringAttribute",  id, "gameId",             36, true);
  await addAttr("createStringAttribute",  id, "childId",            36, true);
  await addAttr("createStringAttribute",  id, "guardianId",         36, true);
  await addAttr("createIntegerAttribute", id, "attemptNumber",          true, 1);
  await addAttr("createFloatAttribute",   id, "score",                  false, 0, 1000);
  await addAttr("createIntegerAttribute", id, "completionTimeMs",       false, 0);
  await addAttr("createBooleanAttribute", id, "correct",                false);
  await addAttr("createStringAttribute",  id, "difficulty",         30, false);
  await addAttr("createStringAttribute",  id, "notes",            2000, false);
  await addAttr("createStringAttribute",  id, "recordedAt",         30, true);
  await waitReady(id, 11);
  await addIndex(id, "idx_sessionId",     "key", ["sessionId"]);
  await addIndex(id, "idx_childId",       "key", ["childId"]);
  await addIndex(id, "idx_attemptNumber", "key", ["attemptNumber"]);
  return id;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Jasiri: Full Database Setup ===\n");

  var missing = ["APPWRITE_ENDPOINT","APPWRITE_PROJECT_ID","APPWRITE_API_KEY","APPWRITE_DATABASE_ID"]
    .filter(function(k) { return !process.env[k]; });
  if (missing.length) {
    console.error("Missing required env vars:", missing.join(", "));
    process.exit(1);
  }

  console.log("Endpoint : " + process.env.APPWRITE_ENDPOINT);
  console.log("Database : " + DB + "\n");

  var results = {};

  // Each step: [display name, setup function, [env keys to write the ID to]]
  // Note: some env keys are aliases (guardians = guardians_collection, etc.)
  var steps = [
    ["guardians",          setupGuardians,         ["APPWRITE_COLLECTION_GUARDIANS",         "APPWRITE_GUARDIANS_COLLECTION"]],
    ["children",           setupChildren,          ["APPWRITE_COLLECTION_CHILDREN",          "APPWRITE_CHILDREN_COLLECTION"]],
    ["learning_profiles",  setupLearningProfiles,  ["APPWRITE_LEARNING_PROFILES_COLLECTION"]],
    ["permissions",        setupPermissions,       ["APPWRITE_PERMISSIONS_COLLECTION"]],
    ["progress_reports",   setupProgressReports,   ["APPWRITE_PROGRESS_COLLECTION"]],
    ["ai_recommendations", setupAIRecommendations, ["APPWRITE_AI_RECOMMENDATIONS_COLLECTION"]],
    ["artwork_sessions",   setupArtworkSessions,   ["APPWRITE_ARTWORKS_SESSIONS_COLLECTION"]],
    ["game_interactions",  setupGameInteractions,  ["APPWRITE_GAME_INTERACTIONS_COLLECTION"]],
    ["game_sessions",      setupGameSessions,      ["APPWRITE_GAME_SESSIONS_COLLECTION"]],
    ["games",              setupGames,             ["APPWRITE_COLLECTION_GAMES"]],
    ["game_attempts",      setupGameAttempts,      ["APPWRITE_GAME_ATTEMPTS_COLLECTION"]],
  ];

  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var name = step[0];
    var fn = step[1];
    var envKeys = step[2];
    console.log("\n--- " + name + " ---");
    try {
      var id = await fn();
      results[name] = id;
      for (var j = 0; j < envKeys.length; j++) {
        updateEnv(envKeys[j], id);
        console.log("  .env: " + envKeys[j] + "=\"" + id + "\"");
      }
    } catch (e) {
      console.error("  ERROR in " + name + ":", e.message);
      process.exit(1);
    }
  }

  console.log("\n\n=== Done! All collection IDs written to .env ===\n");
  Object.keys(results).forEach(function(name) {
    var padded = (name + "                      ").slice(0, 22);
    console.log("  " + padded + " -> " + results[name]);
  });
  console.log("\nRestart with: npm run dev\n");
}

main().catch(function(e) {
  console.error("\nFATAL:", e.message || e);
  process.exit(1);
});
