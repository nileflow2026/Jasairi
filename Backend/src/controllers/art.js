// @ts-nocheck
const { InputFile } = require("node-appwrite/file");
const {
  databases,
  storage,
  ID,
  Permission,
  Role,
  Query,
} = require("../services/appwriteservice");
const { success, created, paginated, noContent } = require("../utils/response");
const {
  NotFoundError,
  AuthorizationError,
  BadRequestError,
} = require("../utils/errors");
const { logger } = require("../utils/logger");
const { auditLog } = require("../utils/audit");

// ── Collection / bucket helpers ───────────────────────────────────────────────

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL_ARTWORK = () => process.env.APPWRITE_ARTWORKS_SESSIONS_COLLECTION;
const COL_CHILDREN = () => process.env.APPWRITE_COLLECTION_CHILDREN;
const BUCKET_ARTWORK = () => process.env.APPWRITE_ARTWORK_BUCKET_ID;

// ── Constants ─────────────────────────────────────────────────────────────────

/** Art types that match the artwork_sessions collection schema */
const ART_TYPES = ["drawing", "painting", "coloring"];

/** Default number of artworks returned per page */
const DEFAULT_LIMIT = 20;

/**
 * Roles that are allowed to delete artwork.
 * Teachers have read + update access but cannot delete child artwork.
 */
const DELETION_ROLES = ["parent", "guardian"];

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Verify the requesting guardian (parent or teacher) has access to the child.
 * Both parents and teachers may appear in child.guardianIds.
 *
 * @param {string} childId
 * @param {string} guardianId - req.user.sub
 * @returns {Promise<object>} The child document
 */
const assertChildAccess = async (childId, guardianId) => {
  const child = await databases
    .getDocument(DB(), COL_CHILDREN(), childId)
    .catch(() => {
      throw new NotFoundError("Child");
    });

  const ids = Array.isArray(child.guardianIds) ? child.guardianIds : [];
  if (!ids.includes(guardianId)) {
    throw new AuthorizationError(
      "You do not have access to this child profile",
    );
  }
  return child;
};

/**
 * Fetch an artwork document and assert the requestor can access it
 * via child ownership.
 *
 * @param {string} artworkId
 * @param {string} guardianId - req.user.sub
 * @returns {Promise<object>} The artwork document
 */
const assertArtworkAccess = async (artworkId, guardianId) => {
  const artwork = await databases
    .getDocument(DB(), COL_ARTWORK(), artworkId)
    .catch(() => {
      throw new NotFoundError("Artwork");
    });

  await assertChildAccess(artwork.childId, guardianId);
  return artwork;
};

// ── Storage helpers ───────────────────────────────────────────────────────────

/**
 * Build the public view URL for an Appwrite Storage file.
 *
 * @param {string} fileId
 * @returns {string}
 */
const buildFileUrl = (fileId) => {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  return `${endpoint}/storage/buckets/${BUCKET_ARTWORK()}/files/${fileId}/view?project=${projectId}`;
};

/**
 * Upload a file buffer to Appwrite Storage.
 * Returns { fileId, imageUrl } or null when no file is provided
 * or the artwork bucket is not configured.
 *
 * Upload failures are treated as non-fatal — the artwork metadata is
 * still saved without an image URL.
 *
 * @param {Express.Multer.File|undefined} file
 * @returns {Promise<{fileId: string, imageUrl: string}|null>}
 */
const uploadImage = async (file) => {
  if (!file || !BUCKET_ARTWORK()) return null;

  const fileId = ID.unique();
  const inputFile = InputFile.fromBuffer(
    file.buffer,
    file.originalname || `artwork_${fileId}.png`,
  );

  await storage.createFile(BUCKET_ARTWORK(), fileId, inputFile);

  return { fileId, imageUrl: buildFileUrl(fileId) };
};

/**
 * Safely delete an image from Appwrite Storage.
 * Extracts the file ID from the stored imageUrl.
 *
 * @param {string} imageUrl - The full Appwrite storage view URL
 */
const deleteStorageImage = async (imageUrl) => {
  if (!imageUrl || !BUCKET_ARTWORK()) return;
  const match = imageUrl.match(/files\/([^/]+)\/view/);
  if (!match) return;
  await storage.deleteFile(BUCKET_ARTWORK(), match[1]).catch((err) => {
    logger.warn("Failed to delete artwork image from storage", {
      error: err.message,
    });
  });
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /art
 * Save new artwork created by a child.
 *
 * Accepts multipart/form-data — the optional 'image' field is the artwork file.
 *
 * Body:
 *   childId       {string}  required — the child who created the art
 *   type          {string}  required — 'drawing' | 'painting' | 'coloring'
 *   duration      {number}  required — time spent in seconds
 *   title         {string}  optional — child-friendly label
 *   templateId    {string}  optional — coloring template used
 *   colors        {string}  optional — JSON array of hex colors used
 *   tools         {string}  optional — JSON object describing tools used
 *   isCompleted   {boolean} optional — whether the session was completed
 */
const saveArtwork = async (req, res, next) => {
  try {
    const { childId, type, duration, title, templateId, colors, tools, isCompleted } =
      req.body;

    await assertChildAccess(childId, req.user.sub);

    // Upload image; non-fatal if it fails
    const upload = await uploadImage(req.file).catch((err) => {
      logger.warn("Artwork image upload failed — saving metadata without image", {
        error: err.message,
        childId,
      });
      return null;
    });

    // Parse colors — mobile clients send a JSON array string
    let colorsArray = [];
    if (colors) {
      try {
        const parsed = typeof colors === "string" ? JSON.parse(colors) : colors;
        colorsArray = Array.isArray(parsed) ? parsed : [];
      } catch {
        colorsArray = [];
      }
    }

    const isCompletedBool =
      isCompleted === "true" || isCompleted === true;

    const doc = await databases.createDocument(
      DB(),
      COL_ARTWORK(),
      ID.unique(),
      {
        childId,
        type,
        duration: parseInt(duration, 10),
        title: title ?? null,
        templateId: templateId ?? null,
        colors: colorsArray,
        tools: tools ?? null,
        isCompleted: isCompletedBool,
        imageUrl: upload?.imageUrl ?? null,
        thumbnailUrl: null,
      },
      [
        // Only the owning guardian can read/update/delete via document-level permissions
        Permission.read(Role.user(req.user.sub)),
        Permission.update(Role.user(req.user.sub)),
        Permission.delete(Role.user(req.user.sub)),
      ],
    );

    await auditLog({
      action: "ARTWORK_SAVED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "artwork",
      resourceId: doc.$id,
      childId,
      meta: { type, title, hasImage: !!upload },
    });

    logger.info("Artwork saved", {
      artworkId: doc.$id,
      childId,
      type,
      hasImage: !!upload,
    });

    return created(res, doc, "Artwork saved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /art
 * List artwork for a child (paginated, newest first).
 *
 * Query params:
 *   childId  {string}  required
 *   type     {string}  optional — filter by art type
 *   limit    {number}  optional — default 20, max 50
 *   offset   {number}  optional — default 0
 */
const listArtwork = async (req, res, next) => {
  try {
    const {
      childId,
      type,
      limit = DEFAULT_LIMIT,
      offset = 0,
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10), 50);
    const parsedOffset = parseInt(offset, 10);

    await assertChildAccess(childId, req.user.sub);

    const filters = [
      Query.equal("childId", childId),
      Query.orderDesc("$createdAt"),
      Query.limit(parsedLimit),
      Query.offset(parsedOffset),
    ];

    if (type) filters.push(Query.equal("type", type));

    const result = await databases.listDocuments(DB(), COL_ARTWORK(), filters);

    return paginated(
      res,
      result.documents,
      {
        total: result.total,
        page: Math.floor(parsedOffset / parsedLimit) + 1,
        limit: parsedLimit,
      },
      "Artwork retrieved",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /art/:id
 * Get a single artwork by ID.
 * The requesting guardian must have access to the child who created it.
 */
const getArtwork = async (req, res, next) => {
  try {
    const artwork = await assertArtworkAccess(req.params.id, req.user.sub);
    return success(res, artwork, "Artwork retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /art/:id
 * Update artwork metadata.
 *
 * Editable fields:
 *   title        {string}  — rename the artwork
 *   isCompleted  {boolean} — mark as finished
 *
 * Both parents and teachers can update.
 * Teachers can use this to add descriptive titles for progress reports.
 */
const updateArtwork = async (req, res, next) => {
  try {
    const artwork = await assertArtworkAccess(req.params.id, req.user.sub);

    const updates = {};

    if (req.body.title !== undefined) {
      updates.title = req.body.title;
    }
    if (req.body.isCompleted !== undefined) {
      updates.isCompleted =
        req.body.isCompleted === "true" || req.body.isCompleted === true;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError("No valid fields provided to update");
    }

    const updated = await databases.updateDocument(
      DB(),
      COL_ARTWORK(),
      artwork.$id,
      updates,
    );

    await auditLog({
      action: "ARTWORK_UPDATED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "artwork",
      resourceId: artwork.$id,
      childId: artwork.childId,
      meta: { updates },
    });

    return success(res, updated, "Artwork updated");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /art/:id
 * Permanently delete artwork and its image from Appwrite Storage.
 *
 * Restricted to parents/guardians only.
 * Teachers have read/update access but cannot delete a child's artwork.
 */
const deleteArtwork = async (req, res, next) => {
  try {
    const artwork = await assertArtworkAccess(req.params.id, req.user.sub);

    if (!DELETION_ROLES.includes(req.user.role)) {
      throw new AuthorizationError(
        "Only parents or guardians can delete artwork",
      );
    }

    // Remove image from storage — non-fatal if this fails
    await deleteStorageImage(artwork.imageUrl);

    await databases.deleteDocument(DB(), COL_ARTWORK(), artwork.$id);

    await auditLog({
      action: "ARTWORK_DELETED",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "artwork",
      resourceId: artwork.$id,
      childId: artwork.childId,
      meta: { type: artwork.type, title: artwork.title },
    });

    logger.info("Artwork deleted", {
      artworkId: artwork.$id,
      childId: artwork.childId,
    });

    return noContent(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  saveArtwork,
  listArtwork,
  getArtwork,
  updateArtwork,
  deleteArtwork,
  ART_TYPES,
};
