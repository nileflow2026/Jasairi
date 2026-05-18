const express = require("express");
const { body, param } = require("express-validator");
const {
  listChildren,
  createChild,
  getChild,
  updateChild,
  deleteChild,
  getProgress,
} = require("../controllers/child");
const {
  authenticate,
  requireVerified,
  requireRole,
} = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");

const router = express.Router();

// All child routes require authentication.
// Professional roles (teacher/therapist) must also be verified.
router.use(authenticate, requireVerified);

// GET /children
router.get("/", listChildren);

// POST /children
router.post(
  "/",
  validate([
    body("name")
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage("Child name is required and must be ≤100 characters"),
    body("age")
      .isInt({ min: 1, max: 18 })
      .withMessage("Age must be between 1 and 18"),
    body("dateOfBirth")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format"),
    body("medicalInfo")
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage("medicalInfo must be ≤2000 characters"),
    body("emergencyContact")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("emergencyContact must be ≤500 characters"),
    body("photoUrl")
      .optional()
      .isURL()
      .withMessage("photoUrl must be a valid URL"),
  ]),
  createChild,
);

// GET /children/:id
router.get("/:id", validate([param("id").notEmpty()]), getChild);

// PATCH /children/:id
router.patch(
  "/:id",
  validate([
    param("id").notEmpty(),
    body("age")
      .optional()
      .isInt({ min: 1, max: 18 })
      .withMessage("Age must be between 1 and 18"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage("Name cannot be blank and must be ≤100 characters"),
    body("medicalInfo")
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage("medicalInfo must be ≤2000 characters"),
    body("emergencyContact")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("emergencyContact must be ≤500 characters"),
    body("photoUrl")
      .optional()
      .isURL()
      .withMessage("photoUrl must be a valid URL"),
  ]),
  updateChild,
);

// DELETE /children/:id — only parents and caregivers may remove a child profile
router.delete(
  "/:id",
  requireRole("parent", "caregiver"),
  validate([param("id").notEmpty()]),
  deleteChild,
);

// GET /children/:id/progress
router.get("/:id/progress", validate([param("id").notEmpty()]), getProgress);

module.exports = { childRoutes: router };
