// @ts-nocheck
const { databases, ID } = require("../services/appwriteservice");
const { logger } = require("./logger");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL_AUDIT = () => process.env.APPWRITE_AUDIT_COLLECTION;

/**
 * Structured audit log helper.
 *
 * Every game event (attempt recorded, session started/completed/abandoned)
 * is written here. Writes always go to Winston; they also persist to an
 * Appwrite audit collection when APPWRITE_AUDIT_COLLECTION is set.
 *
 * Audit writes must NEVER throw — a persistence failure is logged and
 * swallowed so the main request is not interrupted.
 *
 * @param {object} event
 * @param {string}        event.action        e.g. 'GAME_SESSION_STARTED'
 * @param {string}        event.actorId       Guardian user ID (req.user.sub)
 * @param {string}        event.actorRole     Guardian role from JWT
 * @param {string}        event.resourceType  'game_session' | 'game_attempt'
 * @param {string}        event.resourceId    Appwrite document ID
 * @param {string|null}   [event.childId]     Child this event belongs to
 * @param {string|null}   [event.gameId]      Game involved
 * @param {object}        [event.meta]        Additional context data
 */
const auditLog = async ({
  action,
  actorId,
  actorRole,
  resourceType,
  resourceId,
  childId = null,
  gameId = null,
  meta = {},
}) => {
  const timestamp = new Date().toISOString();

  const entry = {
    action,
    actorId,
    actorRole,
    resourceType,
    resourceId,
    childId,
    gameId,
    meta: JSON.stringify(meta),
    timestamp,
  };

  // Structured Winston log — always written
  logger.info("[AUDIT]", entry);

  // Persist to Appwrite when the audit collection is configured
  const col = COL_AUDIT();
  const db = DB();
  if (!col || !db) return;

  try {
    await databases.createDocument(db, col, ID.unique(), entry);
  } catch (err) {
    // Never let an audit write failure bubble up to the caller
    logger.warn("[AUDIT] Failed to persist audit record to Appwrite", {
      action,
      resourceId,
      err: err.message,
    });
  }
};

module.exports = { auditLog };
