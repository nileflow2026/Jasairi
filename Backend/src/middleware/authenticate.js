const jwt = require("jsonwebtoken");
const { config } = require("../config");
const { users } = require("../services/appwriteservice");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");

// Roles that must have isVerified:true before accessing child/AI data
const ROLES_REQUIRING_VERIFICATION = ["teacher", "therapist"];

/**
 * Require a valid Bearer JWT.
 * Attaches the decoded payload to `req.user`.
 *
 * Usage:
 *   router.get('/profile', authenticate, getProfile);
 */
// @ts-ignore
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AuthenticationError("Bearer token required"));
    }

    const token = authHeader.slice(7);
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch (err) {
    if (
      // @ts-ignore
      err.name === "JsonWebTokenError" ||
      // @ts-ignore
      err.name === "TokenExpiredError" ||
      // @ts-ignore
      err.name === "NotBeforeError"
    ) {
      return next(new AuthenticationError("Invalid or expired token"));
    }
    next(err);
  }
};

/**
 * Verify the Appwrite account behind the JWT is still active.
 *
 * Must come after `authenticate`. Makes an async call to Appwrite to check:
 *   - The account still exists (not deleted)
 *   - The account has not been disabled by an admin
 *
 * Attach to routes that handle highly sensitive operations (e.g. account
 * deletion, role elevation, payment actions).
 *
 * Usage:
 *   router.delete('/account', authenticate, verifyAppwriteAccount, deleteAccount);
 */
// @ts-ignore
const verifyAppwriteAccount = async (req, res, next) => {
  try {
    const appwriteUser = await users.get(req.user.sub);

    // Appwrite marks disabled accounts with status === false
    if (appwriteUser.status === false) {
      return next(
        new AuthenticationError(
          "This account has been disabled. Contact support.",
        ),
      );
    }

    // Expose the full Appwrite user object for downstream controllers
    req.appwriteUser = appwriteUser;
    next();
  } catch (err) {
    // @ts-ignore
    if (err.code === 404) {
      return next(
        new AuthenticationError(
          "Account no longer exists. Please sign in again.",
        ),
      );
    }
    next(err);
  }
};

/**
 * Require account verification for professional roles.
 *
 * Parents and caregivers may act immediately after registration.
 * Teachers and therapists must have their account verified (isVerified: true)
 * before they can access child profiles, progress data, or AI features.
 *
 * Must come after `authenticate`. Reads `req.user.isVerified` from the JWT
 * payload — no extra DB call needed since login/refresh always include it.
 *
 * Usage:
 *   router.get('/children', authenticate, requireVerified, listChildren);
 */
// @ts-ignore
const requireVerified = (req, res, next) => {
  const role = req.user?.role;
  if (
    ROLES_REQUIRING_VERIFICATION.includes(role) &&
    req.user?.isVerified !== true
  ) {
    return next(
      new AuthorizationError(
        "Your professional account is awaiting verification. " +
          "Contact an administrator to complete the process.",
      ),
    );
  }
  next();
};

/**
 * Attach req.user if a Bearer token is present, but do NOT fail if absent.
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 */
// @ts-ignore
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  authenticate(req, res, next);
};

/**
 * Role guard — must come after `authenticate` in the middleware chain.
 *
 * Usage:
 *   router.delete('/children/:id', authenticate, requireRole('parent', 'caregiver'), deleteChild);
 */
const requireRole =
  // @ts-ignore
  (...roles) =>
    // @ts-ignore
    (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(
          new AuthorizationError(
            `This action requires one of the following roles: ${roles.join(", ")}`,
          ),
        );
      }
      next();
    };

module.exports = {
  authenticate,
  verifyAppwriteAccount,
  requireVerified,
  optionalAuth,
  requireRole,
};
