// @ts-nocheck
const {
  databases,
  ID,
  Permission,
  Role,
  Query,
} = require("../services/appwriteservice");
const { success, created, noContent } = require("../utils/response");
const { NotFoundError } = require("../utils/errors");
const { logger } = require("../utils/logger");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL_CHILDREN = () => process.env.APPWRITE_COLLECTION_CHILDREN;
const COL_PROGRESS = () => process.env.APPWRITE_LEARNING_PROFILES_COLLECTION;

/**
 * Verify child exists and is owned by the guardian via a single listDocuments query.
 * Returns the child document or null.
 */
const findOwnedChild = async (childId, guardianId) => {
  const result = await databases.listDocuments(DB(), COL_CHILDREN(), [
    Query.equal("$id", childId),
    Query.contains("guardianIds", guardianId),
  ]);
  return result.total > 0 ? result.documents[0] : null;
};

/**
 * GET /children
 * List all children belonging to the authenticated guardian.
 */
const listChildren = async (req, res, next) => {
  try {
    const result = await databases.listDocuments(DB(), COL_CHILDREN(), [
      Query.contains("guardianIds", req.user.sub),
    ]);

    return success(res, result.documents, "Children retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /children
 * Create a new child profile under the authenticated guardian.
 */
const createChild = async (req, res, next) => {
  try {
    const { name, age, dateOfBirth, photoUrl, medicalInfo, emergencyContact } =
      req.body;

    const child = await databases.createDocument(
      DB(),
      COL_CHILDREN(),
      ID.unique(),
      {
        name,
        age: parseInt(age, 10),
        dateOfBirth: dateOfBirth || null,
        photoUrl: photoUrl || null,
        guardianIds: [req.user.sub],
        medicalInfo: medicalInfo || null,
        emergencyContact: emergencyContact || null,
        isActive: true,
      },
      [
        Permission.read(Role.user(req.user.sub)),
        Permission.update(Role.user(req.user.sub)),
        Permission.delete(Role.user(req.user.sub)),
      ],
    );

    // Seed an empty learning profile
    await databases
      .createDocument(DB(), COL_PROGRESS(), ID.unique(), {
        childId: child.$id,
        accuracy: 0,
        averageSpeed: 0,
        consistency: 0,
        preferredGameTypes: [],
        optimalSessionLength: 10,
        bestTimeOfDay: "morning",
        attentionSpan: 10,
        strongSkills: [],
        challengeAreas: [],
        progressTrend: "stable",
        accessibilityNeeds: null,
      })
      .catch((err) =>
        logger.warn("Could not seed learning profile", { err: err.message }),
      );

    logger.info("Child profile created", {
      childId: child.$id,
      guardianId: req.user.sub,
    });

    return created(res, child, "Child profile created");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /children/:id
 */
const getChild = async (req, res, next) => {
  try {
    const child = await findOwnedChild(req.params.id, req.user.sub);
    if (!child) return next(new NotFoundError("Child"));
    return success(res, child);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /children/:id
 */
const updateChild = async (req, res, next) => {
  try {
    const child = await findOwnedChild(req.params.id, req.user.sub);
    if (!child) return next(new NotFoundError("Child"));

    const allowed = [
      "name",
      "age",
      "dateOfBirth",
      "photoUrl",
      "medicalInfo",
      "emergencyContact",
      "isActive",
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );

    const updated = await databases.updateDocument(
      DB(),
      COL_CHILDREN(),
      req.params.id,
      updates,
    );

    return success(res, updated, "Child profile updated");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /children/:id
 */
const deleteChild = async (req, res, next) => {
  try {
    const child = await findOwnedChild(req.params.id, req.user.sub);
    if (!child) return next(new NotFoundError("Child"));

    await databases.deleteDocument(DB(), COL_CHILDREN(), req.params.id);

    logger.info("Child profile deleted", {
      childId: req.params.id,
      guardianId: req.user.sub,
    });

    return noContent(res);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /children/:id/progress
 *
 * Returns the learning profile for the child, or null if not yet seeded.
 */
const getProgress = async (req, res, next) => {
  try {
    const child = await findOwnedChild(req.params.id, req.user.sub);
    if (!child) return next(new NotFoundError("Child"));

    const result = await databases.listDocuments(DB(), COL_PROGRESS(), [
      Query.equal("childId", req.params.id),
    ]);

    const profile = result.documents[0] || null;
    return success(res, profile, "Progress retrieved");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listChildren,
  createChild,
  getChild,
  updateChild,
  deleteChild,
  getProgress,
};
