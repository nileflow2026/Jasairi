// @ts-nocheck
const express = require("express");
const multer = require("multer");
const { body, param, query } = require("express-validator");
const {
  saveArtwork,
  listArtwork,
  getArtwork,
  updateArtwork,
  deleteArtwork,
  ART_TYPES,
} = require("../controllers/art");
const { authenticate, requireVerified } = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const { ValidationError } = require("../utils/errors");

const router = express.Router();

// ── File upload configuration ─────────────────────────────────────────────────

/**
 * In-memory multer for artwork image uploads.
 * - 8 MB limit is generous for compressed mobile art images.
 * - Only image MIME types are accepted.
 * - Max 1 file per request.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new ValidationError("Only image files are accepted"));
  },
});

/**
 * Translate multer-specific errors into our standard ValidationError
 * so they are handled cleanly by the global error handler.
 *
 * Must be used as the error-handling middleware directly after `upload`.
 */
const handleUploadError = (err, _req, _res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return next(new ValidationError("Image must be smaller than 8 MB"));
  }
  next(err);
};

// ── Global middleware ─────────────────────────────────────────────────────────

// Every art endpoint requires a valid, verified account
router.use(authenticate, requireVerified);

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /art
 * Save artwork created by a child.
 *
 * Content-Type: multipart/form-data
 * File field: 'image' (optional — metadata-only artworks are allowed)
 *
 * Body fields:
 *   childId       {string}   required
 *   type          {string}   required — 'drawing' | 'painting' | 'coloring'
 *   duration      {integer}  required — seconds spent creating
 *   title         {string}   optional
 *   templateId    {string}   optional
 *   colors        {string}   optional — JSON array, e.g. '["#ff0000","#00ff00"]'
 *   tools         {string}   optional — JSON object of tools used
 *   isCompleted   {boolean}  optional
 *
 * Permissions:
 *   Parents, teachers, and therapists who are linked to the child
 *   may submit artwork on the child's behalf.
 */
router.post(
  "/",
  upload.single("image"),
  handleUploadError,
  validate([
    body("childId")
      .notEmpty()
      .isString()
      .isLength({ max: 36 })
      .withMessage("childId is required"),

    body("type")
      .isIn(ART_TYPES)
      .withMessage(`type must be one of: ${ART_TYPES.join(", ")}`),

    body("duration")
      .isInt({ min: 0 })
      .withMessage("duration must be a non-negative integer (seconds)"),

    body("title")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage("title must be at most 100 characters"),

    body("templateId").optional().isString().trim().isLength({ max: 36 }),

    body("colors")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("colors must be a JSON array string"),

    body("tools").optional().isString().trim().isLength({ max: 500 }),

    body("isCompleted")
      .optional()
      .isBoolean()
      .withMessage("isCompleted must be a boolean"),
  ]),
  saveArtwork,
);

/**
 * GET /art
 * List artwork for a child (paginated, newest first).
 *
 * Query params:
 *   childId  {string}   required — filter to a specific child
 *   type     {string}   optional — filter by art type
 *   limit    {integer}  optional — default 20, max 50
 *   offset   {integer}  optional — default 0
 *
 * Permissions:
 *   Parents and teachers linked to the child can list artwork.
 *   Used by the caregiver dashboard to display a child's creative portfolio.
 */
router.get(
  "/",
  validate([
    query("childId").notEmpty().withMessage("childId is required"),

    query("type")
      .optional()
      .isIn(ART_TYPES)
      .withMessage(`type must be one of: ${ART_TYPES.join(", ")}`),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("limit must be an integer between 1 and 50"),

    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("offset must be a non-negative integer"),
  ]),
  listArtwork,
);

/**
 * GET /art/:id
 * Retrieve a single artwork by ID.
 *
 * Permissions:
 *   Any guardian (parent or teacher) linked to the child who created
 *   the artwork may retrieve it.
 */
router.get(
  "/:id",
  validate([param("id").notEmpty().withMessage("Artwork ID is required")]),
  getArtwork,
);

/**
 * PATCH /art/:id
 * Update artwork metadata.
 *
 * Body fields (all optional — at least one required):
 *   title        {string}  — friendly label for the artwork
 *   isCompleted  {boolean} — mark the art session as completed
 *
 * Permissions:
 *   Both parents and teachers linked to the child can update.
 *   Teachers use this to annotate artwork for progress reports.
 */
router.patch(
  "/:id",
  validate([
    param("id").notEmpty().withMessage("Artwork ID is required"),

    body("title")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage("title must be at most 100 characters"),

    body("isCompleted")
      .optional()
      .isBoolean()
      .withMessage("isCompleted must be a boolean"),
  ]),
  updateArtwork,
);

/**
 * DELETE /art/:id
 * Delete artwork and its associated image from Appwrite Storage.
 *
 * Permissions:
 *   Restricted to parents/guardians — role: 'parent' or 'guardian'.
 *   Teachers have read/update access only and cannot delete artwork.
 *
 * Note: This is a hard delete. Deleted artwork cannot be recovered.
 */
router.delete(
  "/:id",
  validate([param("id").notEmpty().withMessage("Artwork ID is required")]),
  deleteArtwork,
);

module.exports = { artRoutes: router };
