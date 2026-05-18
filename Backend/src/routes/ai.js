const express = require("express");
const { body } = require("express-validator");
const { getRecommendations, analyzePerformance } = require("../controllers/ai");
const { authenticate, requireVerified } = require("../middleware/authenticate");
const { aiLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");

const router = express.Router();

// All AI routes require authentication, verified status, and a strict rate limit.
// requireVerified ensures unverified teachers/therapists cannot access AI analysis.
router.use(authenticate, requireVerified, aiLimiter);

// POST /ai/recommendations
router.post(
  "/recommendations",
  validate([body("childId").notEmpty().withMessage("childId required")]),
  getRecommendations,
);

// POST /ai/analyze-performance
router.post(
  "/analyze-performance",
  validate([
    body("childId").notEmpty().withMessage("childId required"),
    body("periodDays")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("periodDays must be 1-365"),
  ]),
  analyzePerformance,
);

module.exports = { aiRoutes: router };
