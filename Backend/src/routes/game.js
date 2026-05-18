const express = require("express");
const { body, param, query } = require("express-validator");
const {
  listGames,
  getGame,
  startSession,
  recordAttempt,
  listAttempts,
  completeSession,
  abandonSession,
  listSessions,
  DIFFICULTY_LEVELS,
} = require("../controllers/game");
const { authenticate, requireVerified } = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");

const router = express.Router();

// All game routes require a valid, verified account (professional roles must be email-verified)
router.use(authenticate, requireVerified);

// ── Catalogue ─────────────────────────────────────────────────────────────────

// GET /games
router.get("/", listGames);

// GET /games/sessions  — must come BEFORE /:id so Express doesn't treat "sessions" as a param
router.get(
  "/sessions",
  validate([
    query("childId").optional().isString().trim().notEmpty(),
    query("status")
      .optional()
      .isIn(["active", "completed", "abandoned"])
      .withMessage("status must be active, completed, or abandoned"),
    query("gameId").optional().isString().trim().notEmpty(),
  ]),
  listSessions,
);

// GET /games/:id
router.get("/:id", validate([param("id").notEmpty()]), getGame);

// ── Session lifecycle ─────────────────────────────────────────────────────────

// POST /games/:id/sessions — start a session
router.post(
  "/:id/sessions",
  validate([
    param("id").notEmpty().withMessage("Game ID required"),
    body("childId").notEmpty().withMessage("childId is required"),
    body("difficulty")
      .isIn(DIFFICULTY_LEVELS)
      .withMessage("difficulty must be beginner, intermediate, or advanced"),
  ]),
  startSession,
);

// PATCH /games/:id/sessions/:sessionId — complete a session
router.patch(
  "/:id/sessions/:sessionId",
  validate([
    param("sessionId").notEmpty(),
    body("finalScore")
      .optional()
      .isInt({ min: 0, max: 1000 })
      .withMessage("finalScore must be an integer 0–1000"),
    body("completionTimeMs")
      .optional()
      .isInt({ min: 0 })
      .withMessage("completionTimeMs must be a non-negative integer"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("notes must be ≤500 characters"),
  ]),
  completeSession,
);

// DELETE /games/:id/sessions/:sessionId — abandon a session
router.delete(
  "/:id/sessions/:sessionId",
  validate([param("sessionId").notEmpty()]),
  abandonSession,
);

// ── Attempts ──────────────────────────────────────────────────────────────────

// POST /games/:id/sessions/:sessionId/attempts — record one attempt
router.post(
  "/:id/sessions/:sessionId/attempts",
  validate([
    param("sessionId").notEmpty().withMessage("sessionId is required"),
    body("score")
      .isInt({ min: 0, max: 1000 })
      .withMessage("score must be an integer 0–1000"),
    body("completionTimeMs")
      .isInt({ min: 0 })
      .withMessage("completionTimeMs must be a non-negative integer"),
    body("correct")
      .optional()
      .isBoolean()
      .withMessage("correct must be a boolean"),
    body("difficulty")
      .optional()
      .isIn(DIFFICULTY_LEVELS)
      .withMessage("difficulty must be beginner, intermediate, or advanced"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("notes must be ≤500 characters"),
  ]),
  recordAttempt,
);

// GET /games/:id/sessions/:sessionId/attempts — list attempts for a session
router.get(
  "/:id/sessions/:sessionId/attempts",
  validate([param("sessionId").notEmpty()]),
  listAttempts,
);

module.exports = { gameRoutes: router };
