#!/usr/bin/env node
/**
 * setup-game-collections.js
 * Creates game collections + attributes in Appwrite. Safe to re-run.
 * Usage: node scripts/setup-game-collections.js
 */
require("dotenv").config();
const { Client, Databases, ID, Permission, Role } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const DB = process.env.APPWRITE_DATABASE_ID;
let COL_GAMES = process.env.APPWRITE_COLLECTION_GAMES;
let COL_SESSIONS = process.env.APPWRITE_GAME_SESSIONS_COLLECTION;
let COL_ATTEMPTS = process.env.APPWRITE_GAME_ATTEMPTS_COLLECTION;

const PLACEHOLDERS = ["", "appwrite_games_collection", "appwrite_game_attempts_collection"];

async function ensureCollection(currentId, name, envKey) {
  const isPlaceholder = !currentId || PLACEHOLDERS.includes(currentId);
  if (!isPlaceholder) {
    try { await db.getCollection(DB, currentId); console.log(`  OK  "${name}" (${currentId})`); return currentId; }
    catch (_) {}
  }
  const col = await db.createCollection(DB, ID.unique(), name, [
    Permission.read(Role.users()), Permission.create(Role.users()),
    Permission.update(Role.users()), Permission.delete(Role.users()),
  ]);
  console.log(`  NEW "${name}" -> ${col.$id}`);
  console.log(`      Add to .env: ${envKey}="${col.$id}"`);
  return col.$id;
}

async function attr(fn, colId, key, ...args) {
  try { await fn(DB, colId, key, ...args); console.log(`    + ${key}`); }
  catch (e) { if (e.code !== 409) throw e; else console.log(`    ~ ${key} exists`); }
}

async function waitReady(colId, n) {
  for (let i = 0; i < 30; i++) {
    const col = await db.getCollection(DB, colId);
    const ready = (col.attributes||[]).filter(a=>a.status==="available").length;
    if (ready >= n) { console.log(`    Ready: ${ready}/${n}`); return; }
    process.stdout.write(`    Waiting ${ready}/${n}...\r`);
    await new Promise(r=>setTimeout(r, 2500));
  }
  console.log("\n    WARN: timeout waiting for attributes");
}

async function setupGames(c) {
  console.log("\n[games] attributes...");
  await attr(db.createStringAttribute.bind(db), c, "name", 120, true);
  await attr(db.createStringAttribute.bind(db), c, "description", 1000, false);
  await attr(db.createStringAttribute.bind(db), c, "type", 60, false);
  await attr(db.createStringAttribute.bind(db), c, "difficulty", 30, false);
  await attr(db.createIntegerAttribute.bind(db), c, "minAge", false, 0, 18);
  await attr(db.createIntegerAttribute.bind(db), c, "maxAge", false, 0, 18);
  await attr(db.createStringAttribute.bind(db), c, "thumbnailUrl", 512, false);
  await attr(db.createBooleanAttribute.bind(db), c, "isActive", false, true);
  await attr(db.createStringAttribute.bind(db), c, "tags", 512, false);
  await waitReady(c, 9);
  console.log("[games] indexes...");
  for (const [k,a] of [["idx_name",["name"]],["idx_type",["type"]],["idx_active",["isActive"]]]) {
    try { await db.createIndex(DB,c,k,"key",a); console.log(`    + index ${k}`); }
    catch(e) { if(e.code!==409) throw e; else console.log(`    ~ index ${k} exists`); }
  }
}

async function setupSessions(c) {
  console.log("\n[game_sessions] attributes...");
  await attr(db.createStringAttribute.bind(db), c, "gameId", 36, true);
  await attr(db.createStringAttribute.bind(db), c, "childId", 36, true);
  await attr(db.createStringAttribute.bind(db), c, "guardianId", 36, true);
  await attr(db.createStringAttribute.bind(db), c, "difficulty", 30, true);
  await attr(db.createStringAttribute.bind(db), c, "status", 20, true);
  await attr(db.createIntegerAttribute.bind(db), c, "attemptCount", false, 0, undefined, 0);
  await attr(db.createStringAttribute.bind(db), c, "startedAt", 30, true);
  await attr(db.createStringAttribute.bind(db), c, "completedAt", 30, false);
  await attr(db.createFloatAttribute.bind(db), c, "finalScore", false, 0, 1000);
  await attr(db.createIntegerAttribute.bind(db), c, "completionTimeMs", false, 0);
  await attr(db.createStringAttribute.bind(db), c, "notes", 2000, false);
  await waitReady(c, 11);
  console.log("[game_sessions] indexes...");
  for (const [k,a] of [["idx_guardianId",["guardianId"]],["idx_childId",["childId"]],["idx_gameId",["gameId"]],["idx_status",["status"]],["idx_startedAt",["startedAt"]]]) {
    try { await db.createIndex(DB,c,k,"key",a); console.log(`    + index ${k}`); }
    catch(e) { if(e.code!==409) throw e; else console.log(`    ~ index ${k} exists`); }
  }
}

async function setupAttempts(c) {
  console.log("\n[game_attempts] attributes...");
  await attr(db.createStringAttribute.bind(db), c, "sessionId", 36, true);
  await attr(db.createStringAttribute.bind(db), c, "gameId", 36, true);
  await attr(db.createStringAttribute.bind(db), c, "childId", 36, true);
  await attr(db.createStringAttribute.bind(db), c, "guardianId", 36, true);
  await attr(db.createIntegerAttribute.bind(db), c, "attemptNumber", true, 1);
  await attr(db.createFloatAttribute.bind(db), c, "score", false, 0, 1000);
  await attr(db.createIntegerAttribute.bind(db), c, "completionTimeMs", false, 0);
  await attr(db.createBooleanAttribute.bind(db), c, "correct", false);
  await attr(db.createStringAttribute.bind(db), c, "difficulty", 30, false);
  await attr(db.createStringAttribute.bind(db), c, "notes", 2000, false);
  await attr(db.createStringAttribute.bind(db), c, "recordedAt", 30, true);
  await waitReady(c, 11);
  console.log("[game_attempts] indexes...");
  for (const [k,a] of [["idx_sessionId",["sessionId"]],["idx_childId",["childId"]],["idx_attemptNumber",["attemptNumber"]]]) {
    try { await db.createIndex(DB,c,k,"key",a); console.log(`    + index ${k}`); }
    catch(e) { if(e.code!==409) throw e; else console.log(`    ~ index ${k} exists`); }
  }
}

async function main() {
  console.log("=== Jasiri Game Collection Setup ===");
  const missing = ["APPWRITE_ENDPOINT","APPWRITE_PROJECT_ID","APPWRITE_API_KEY","APPWRITE_DATABASE_ID"].filter(k=>!process.env[k]);
  if (missing.length) { console.error("Missing:", missing.join(", ")); process.exit(1); }

  console.log("\nEnsuring collections...");
  COL_GAMES    = await ensureCollection(COL_GAMES,    "games",         "APPWRITE_COLLECTION_GAMES");
  COL_SESSIONS = await ensureCollection(COL_SESSIONS, "game_sessions", "APPWRITE_GAME_SESSIONS_COLLECTION");
  COL_ATTEMPTS = await ensureCollection(COL_ATTEMPTS, "game_attempts", "APPWRITE_GAME_ATTEMPTS_COLLECTION");

  await setupGames(COL_GAMES);
  await setupSessions(COL_SESSIONS);
  await setupAttempts(COL_ATTEMPTS);

  console.log("\n=== Done! ===");
  console.log("Copy these into Backend/.env if they are new:");
  console.log(`  APPWRITE_COLLECTION_GAMES="${COL_GAMES}"`);
  console.log(`  APPWRITE_GAME_SESSIONS_COLLECTION="${COL_SESSIONS}"`);
  console.log(`  APPWRITE_GAME_ATTEMPTS_COLLECTION="${COL_ATTEMPTS}"`);
  console.log("\nThen restart: npm run dev");
}

main().catch(e=>{ console.error("Failed:", e.message||e); process.exit(1); });
