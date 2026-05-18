const {
  databases,
  ID,
  Permission,
  Role,
  Query,
} = require("../services/appwriteservice");
const { success, created } = require("../utils/response");
const {
  NotFoundError,
  BadRequestError,
} = require("../utils/errors");
const { logger } = require("../utils/logger");
const { auditLog } = require("../utils/audit");

// ── Collection helpers ─────────────────────────────────────────────────────────

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL_GAMES = () => process.env.APPWRITE_COLLECTION_GAMES;
const COL_SESSIONS = () => process.env.APPWRITE_GAME_SESSIONS_COLLECTION;
const COL_ATTEMPTS = () => process.env.APPWRITE_GAME_ATTEMPTS_COLLECTION;
const COL_CHILDREN = () => process.env.APPWRITE_COLLECTION_CHILDREN;

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"];
const SESSION_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
};

// ── Guards ────────────────────────────────────────────────────────────────────

/** Verify the requesting guardian owns the child via listDocuments (avoids getDocument permission issues) */
const assertChildOwnership = async (childId, guardianId) => {
  const result = await databases.listDocuments(DB(), COL_CHILDREN(), [
    Query.equal("$id", childId),
    Query.contains("guardianIds", guardianId),
  ]);
  if (result.total === 0) throw new NotFoundError("Child");
  return result.documents[0];
};

/** Fetch a session and assert guardian ownership */
const assertSessionOwnership = async (sessionId, guardianId) => {
  const result = await databases.listDocuments(DB(), COL_SESSIONS(), [
    Query.equal("$id", sessionId),
    Query.equal("guardianId", guardianId),
  ]);
  if (result.total === 0) throw new NotFoundError("Session");
  return result.documents[0];
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /games
 */
const listGames = async (req, res, next) => {
  try {
    if (!COL_GAMES()) {
      throw new BadRequestError(
        "Games collection not configured. Add APPWRITE_COLLECTION_GAMES to .env",
      );
    }
    const result = await databases.listDocuments(DB(), COL_GAMES(), [
      Query.orderAsc("name"),
    ]);
    return success(res, result.documents, "Games retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /games/:id
 */
const getGame = async (req, res, next) => {
  try {
    const game = await databases
      .getDocument(DB(), COL_GAMES(), req.params.id)
      .catch(() => {
        throw new NotFoundError("Game");
      });
    return success(res, game);
  } catch (err) {
    next(err);
  }
};

// ── Session endpoints ─────────────────────────────────────────────────────────

/**
 * POST /games/:id/sessions
 * Start a new play session for a child.
 *
 * Body: { childId, difficulty }
 *   difficulty: 'beginner' | 'intermediate' | 'advanced'
 */
const startSession = async (req, res, next) => {
  try {
    const { childId, difficulty } = req.body;
    await assertChildOwnership(childId, req.user.sub);

    const game = await databases
      .getDocument(DB(), COL_GAMES(), req.params.id)
      .catch(() => {
        throw new NotFoundError("Game");
      });

    // Abandon any sessions left active from a previous crashed/killed session.
    // This prevents orphaned "active" sessions from skewing analytics and
    // AI recommendations. Non-fatal — must not block new session creation.
    try {
      const staleSessions = await databases.listDocuments(DB(), COL_SESSIONS(), [
        Query.equal("childId", childId),
        Query.equal("status", SESSION_STATUS.ACTIVE),
      ]);
      if (staleSessions.total > 0) {
        await Promise.allSettled(
          staleSessions.documents.map((s) =>
            databases.updateDocument(DB(), COL_SESSIONS(), s.$id, {
              status: SESSION_STATUS.ABANDONED,
              completedAt: new Date().toISOString(),
              notes: "auto_abandoned:app_restart",
            }),
          ),
        );
        logger.info("Auto-abandoned stale sessions", {
          childId,
          count: staleSessions.total,
        });
      }
    } catch (cleanupErr) {
      logger.warn("Stale session cleanup failed (non-fatal)", {
        childId,
        error: cleanupErr.message,
      });
    }

    const session = await databases.createDocument(
      DB(),
      COL_SESSIONS(),
      ID.unique(),
      {
        gameId: game.$id,
        childId,
        guardianId: req.user.sub,
        difficulty,
        status: SESSION_STATUS.ACTIVE,
        attemptCount: 0,
        startedAt: new Date().toISOString(),
        completedAt: null,
        finalScore: null,
        completionTimeMs: null,
        notes: null,
      },
      [Permission.read(Role.user(req.user.sub))],
    );

    await auditLog({
      action: "GAME_SESSION_STARTED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "game_session",
      resourceId: session.$id,
      childId,
      gameId: game.$id,
      meta: { difficulty, gameName: game.name },
    });

    return created(res, session, "Session started");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /games/:id/sessions/:sessionId/attempts
 * Record a single game attempt within an active session.
 *
 * Body: { score, completionTimeMs, correct, difficulty?, notes? }
 *   score:             0–1000 (raw points for this attempt)
 *   completionTimeMs:  how long the attempt took in milliseconds
 *   correct:           boolean — did the child answer/complete correctly?
 *   difficulty:        optional per-attempt override (defaults to session value)
 *   notes:             free-text observation from the guardian/therapist
 */
const recordAttempt = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { score, completionTimeMs, correct, difficulty, notes } = req.body;

    const session = await assertSessionOwnership(sessionId, req.user.sub);

    if (session.status !== SESSION_STATUS.ACTIVE) {
      throw new BadRequestError(
        "Cannot record attempts on a " + session.status + " session",
      );
    }

    const attemptNumber = (session.attemptCount ?? 0) + 1;

    const attempt = await databases.createDocument(
      DB(),
      COL_ATTEMPTS(),
      ID.unique(),
      {
        sessionId,
        gameId: session.gameId,
        childId: session.childId,
        guardianId: req.user.sub,
        attemptNumber,
        score,
        completionTimeMs,
        correct: correct ?? null,
        difficulty: difficulty ?? session.difficulty,
        notes: notes ?? null,
        recordedAt: new Date().toISOString(),
      },
      [Permission.read(Role.user(req.user.sub))],
    );

    // Increment the session attemptCount (best-effort)
    await databases.updateDocument(DB(), COL_SESSIONS(), sessionId, {
      attemptCount: attemptNumber,
    });

    await auditLog({
      action: "GAME_ATTEMPT_RECORDED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "game_attempt",
      resourceId: attempt.$id,
      childId: session.childId,
      gameId: session.gameId,
      meta: {
        sessionId,
        attemptNumber,
        score,
        completionTimeMs,
        correct,
        difficulty: difficulty ?? session.difficulty,
      },
    });

    logger.info("Game attempt recorded", {
      attemptId: attempt.$id,
      sessionId,
      attemptNumber,
      score,
      completionTimeMs,
      correct,
    });

    return created(res, attempt, "Attempt recorded");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /games/:id/sessions/:sessionId/attempts
 * List all attempts for a session, ordered by attempt number.
 */
const listAttempts = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await assertSessionOwnership(sessionId, req.user.sub);

    const result = await databases.listDocuments(DB(), COL_ATTEMPTS(), [
      Query.equal("sessionId", sessionId),
      Query.orderAsc("attemptNumber"),
    ]);

    return success(
      res,
      result.documents,
      result.total + " attempt(s) retrieved",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /games/:id/sessions/:sessionId
 * Complete an active session with final aggregated results.
 *
 * Body: { finalScore, completionTimeMs, notes? }
 *   finalScore:        0–1000 (aggregated score across all attempts)
 *   completionTimeMs:  total session time in milliseconds
 */
const completeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { finalScore, completionTimeMs, notes } = req.body;

    const session = await assertSessionOwnership(sessionId, req.user.sub);

    if (session.status !== SESSION_STATUS.ACTIVE) {
      throw new BadRequestError(
        "Session is already " + session.status + " and cannot be completed",
      );
    }

    const updated = await databases.updateDocument(
      DB(),
      COL_SESSIONS(),
      sessionId,
      {
        status: SESSION_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        finalScore: finalScore ?? null,
        completionTimeMs: completionTimeMs ?? null,
        notes: notes ?? null,
      },
    );

    await auditLog({
      action: "GAME_SESSION_COMPLETED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "game_session",
      resourceId: sessionId,
      childId: session.childId,
      gameId: session.gameId,
      meta: {
        finalScore,
        completionTimeMs,
        attemptCount: session.attemptCount,
        difficulty: session.difficulty,
      },
    });

    logger.info("Game session completed", {
      sessionId,
      finalScore,
      completionTimeMs,
      attemptCount: session.attemptCount,
    });

    return success(res, updated, "Session completed");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /games/:id/sessions/:sessionId
 * Abandon an active session — marks as abandoned for audit purposes.
 * The document is retained; no data is deleted.
 */
const abandonSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await assertSessionOwnership(sessionId, req.user.sub);

    if (session.status !== SESSION_STATUS.ACTIVE) {
      throw new BadRequestError("Session is already " + session.status);
    }

    const updated = await databases.updateDocument(
      DB(),
      COL_SESSIONS(),
      sessionId,
      {
        status: SESSION_STATUS.ABANDONED,
        completedAt: new Date().toISOString(),
      },
    );

    await auditLog({
      action: "GAME_SESSION_ABANDONED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "game_session",
      resourceId: sessionId,
      childId: session.childId,
      gameId: session.gameId,
      meta: {
        attemptCount: session.attemptCount,
        difficulty: session.difficulty,
      },
    });

    return success(res, updated, "Session abandoned");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /games/sessions
 * List sessions for the authenticated guardian.
 * Query params: childId?, status?, gameId?
 */
const listSessions = async (req, res, next) => {
  try {
    const { childId, status, gameId } = req.query;
    if (childId) await assertChildOwnership(childId, req.user.sub);

    const filters = [Query.equal("guardianId", req.user.sub)];
    if (childId) filters.push(Query.equal("childId", childId));
    if (status) filters.push(Query.equal("status", status));
    if (gameId) filters.push(Query.equal("gameId", gameId));
    filters.push(Query.orderDesc("startedAt"));

    const result = await databases.listDocuments(DB(), COL_SESSIONS(), filters);
    return success(res, result.documents, "Sessions retrieved");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listGames,
  getGame,
  startSession,
  recordAttempt,
  listAttempts,
  completeSession,
  abandonSession,
  listSessions,
  DIFFICULTY_LEVELS,
  SESSION_STATUS,
};
