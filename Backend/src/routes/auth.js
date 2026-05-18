const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  refreshToken,
  logout,
  me,
  sendVerification,
  verifyEmail,
} = require("../controllers/auth");
const { authLimiter, refreshLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

// POST /register
router.post(
  "/register",
  authLimiter,
  validate([
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be 8–128 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number"),
    body("name")
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage("Name is required and must be ≤100 characters"),
    body("role")
      .isIn(["parent", "teacher", "therapist", "caregiver"])
      .withMessage("Role must be parent, teacher, therapist, or caregiver"),
    body("phoneNumber")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .matches(/^[+\d][\d\s\-().]{6,18}$/)
      .withMessage("Phone number format is invalid"),
  ]),
  register,
);

// POST /login
router.post(
  "/login",
  authLimiter,
  validate([
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  login,
);

// POST /refresh
router.post(
  "/refresh",
  refreshLimiter,
  validate([
    body("refreshToken").notEmpty().withMessage("Refresh token required"),
  ]),
  refreshToken,
);

// POST /logout
router.post("/logout", authenticate, logout);

// POST /send-verification  — resend OTP to the authenticated guardian's email
router.post("/send-verification", authenticate, sendVerification);

// POST /verify-email  — validate the OTP and mark the guardian as verified
router.post(
  "/verify-email",
  authenticate,
  validate([
    body("otp")
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage("OTP must be a 6-digit code"),
  ]),
  verifyEmail,
);

// GET /me
router.get("/me", authenticate, me);

module.exports = { authRoutes: router };
