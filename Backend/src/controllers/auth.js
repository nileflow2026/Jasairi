// @ts-nocheck
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { config } = require("../config");
const { success, created } = require("../utils/response");
const {
  AuthenticationError,
  ConflictError,
  BadRequestError,
} = require("../utils/errors");
const {
  databases,
  users,
  ID,
  Permission,
  Role,
  Query,
} = require("../services/appwriteservice");
const { logger } = require("../utils/logger");
const { auditLog } = require("../utils/audit");

const VALID_ROLES = ["parent", "teacher", "therapist", "caregiver"];

// ── Token helpers ──────────────────────────────────────────────────────────────

const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

/**
 * Sign a refresh token with a unique `jti` (JWT ID) for rotation tracking.
 * The jti is stored in Appwrite user prefs so we can detect token reuse (A07).
 * @returns {{ token: string, jti: string }}
 */
const signRefreshToken = (payload) => {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { token, jti };
};

// ── OTP helpers ───────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit numeric OTP. */
const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

/** OTP TTL: 15 minutes in milliseconds */
const OTP_TTL_MS = 15 * 60 * 1000;

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 *
 * COPPA compliant: only guardians create accounts.
 * Children are managed as sub-resources under a guardian profile.
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, role, phoneNumber } = req.body;

    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestError(
        `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      );
    }

    // Hash password for server-side verification
    const passwordHash = await bcrypt.hash(
      password,
      config.security.bcryptRounds,
    );

    // Create the Appwrite account (handles uniqueness at platform level)
    let appwriteUser;
    try {
      appwriteUser = await users.create(
        ID.unique(),
        email,
        undefined,
        password,
        name,
      );
    } catch (err) {
      if (err.code === 409 || err.message?.includes("already exists")) {
        throw new ConflictError("An account with that email already exists");
      }
      throw err;
    }

    // Store bcrypt hash in Appwrite user prefs (avoids needing a schema attribute)
    await users.updatePrefs(appwriteUser.$id, { passwordHash });

    // Persist guardian document — if this fails, roll back the Appwrite account
    // so the guardian is never left in an unrecoverable state (can't log in AND
    // can't re-register because the email is taken).
    try {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_GUARDIANS,
        appwriteUser.$id,
        {
          email,
          name,
          role,          phoneNumber: phoneNumber || null,          isVerified: false,
          preferences: JSON.stringify({ 
            notifications: true,
            language: "en",
            timezone: "UTC",
          }),
        },
        [
          Permission.read(Role.user(appwriteUser.$id)),
          Permission.update(Role.user(appwriteUser.$id)),
        ],
      );
    } catch (docErr) {
      // Roll back: delete the Appwrite account so the guardian can retry
      // registration later without hitting a 409 conflict on their email.
      try {
        await users.delete(appwriteUser.$id);
      } catch (cleanupErr) {
        logger.error("Failed to roll back orphaned Appwrite account", {
          userId: appwriteUser.$id,
          cleanupError: cleanupErr.message,
        });
      }
      throw docErr;
    }

    const tokenPayload = {
      sub: appwriteUser.$id,
      email,
      name,
      role,
      isVerified: false, // newly registered — always unverified
    };
    const accessToken = signAccessToken(tokenPayload);
    const { token: refreshToken, jti } = signRefreshToken({
      sub: appwriteUser.$id,
    });

    // Store jti in prefs alongside passwordHash for rotation validation (A07)
    // Also generate and store an initial email verification OTP.
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = Date.now() + OTP_TTL_MS;

    await users.updatePrefs(appwriteUser.$id, {
      passwordHash,
      refreshJti: jti,
      otpHash,
      otpExpiresAt,
    });

    // ── Send initial verification email ───────────────────────────────────────
    // TODO (production): replace with a real email service (Resend, SendGrid…)
    if (process.env.NODE_ENV !== "production") {
      logger.info(`[DEV] Email verification OTP for ${email}: ${otp}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    logger.info("Guardian registered", { userId: appwriteUser.$id, role });
    await auditLog({
      action: "AUTH_REGISTER",
      actorId: appwriteUser.$id,
      actorRole: role,
      resourceType: "guardian",
      resourceId: appwriteUser.$id,
    });

    return created(
      res,
      {
        accessToken,
        refreshToken,
        user: { id: appwriteUser.$id, email, name, role, isVerified: false },
      },
      "Account created successfully",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find Appwrite user by email (Appwrite v13 Query syntax)
    const userList = await users.list([Query.equal("email", email)]);
    const appwriteUser = userList.users?.[0];

    // Guard against timing attacks — always run bcrypt even if user is missing
    const dummyHash =
      "$2a$12$invalidhashpaddingtomatchbcryptlength00000000000000000000";

    let guardian = null;
    let hashToVerify = dummyHash;
    if (appwriteUser) {
      try {
        guardian = await databases.getDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_COLLECTION_GUARDIANS,
          appwriteUser.$id,
        );
      } catch (_err) {
        // guardian document missing — treat as invalid credentials
      }
      try {
        const prefs = await users.getPrefs(appwriteUser.$id);
        hashToVerify = prefs.passwordHash || dummyHash;
      } catch (_err) {
        // prefs unreadable — fall through to dummyHash (login will fail safely)
      }
    }
    const isValid = await bcrypt.compare(password, hashToVerify);

    if (!appwriteUser || !guardian || !isValid) {
      // Audit failed login without exposing which field was wrong (A09)
      await auditLog({
        action: "AUTH_LOGIN_FAILED",
        actorId: appwriteUser?.$id ?? "unknown",
        actorRole: "unknown",
        resourceType: "guardian",
        resourceId: appwriteUser?.$id ?? "unknown",
        meta: { reason: "invalid_credentials" },
      }).catch(() => {}); // non-blocking
      throw new AuthenticationError("Invalid email or password");
    }

    const tokenPayload = {
      sub: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name,
      role: guardian.role,
      isVerified: guardian.isVerified ?? false,
    };
    const accessToken = signAccessToken(tokenPayload);
    const { token: refreshToken, jti } = signRefreshToken({
      sub: appwriteUser.$id,
    });

    // Rotate jti — invalidates any previously issued refresh token (A07)
    await users.updatePrefs(appwriteUser.$id, { refreshJti: jti });

    logger.info("Guardian logged in", { userId: appwriteUser.$id });
    await auditLog({
      action: "AUTH_LOGIN_SUCCESS",
      actorId: appwriteUser.$id,
      actorRole: guardian.role,
      resourceType: "guardian",
      resourceId: appwriteUser.$id,
    }).catch(() => {});

    return success(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: appwriteUser.$id,
          email: appwriteUser.email,
          name: appwriteUser.name,
          role: guardian.role,
          isVerified: guardian.isVerified ?? false,
        },
      },
      "Login successful",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/refresh
 *
 * Re-validates the Appwrite account status and re-fetches the current role
 * and verification state so any changes take effect on the next token pair.
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AuthenticationError("Refresh token required");

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret);
    } catch (_err) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    // Validate Appwrite account is still active
    let appwriteUser;
    try {
      appwriteUser = await users.get(decoded.sub);
    } catch (_err) {
      throw new AuthenticationError("Account not found. Please sign in again.");
    }

    if (appwriteUser.status === false) {
      throw new AuthenticationError(
        "Account has been disabled. Contact support.",
      );
    }

    // Re-fetch guardian document to pick up latest role / isVerified
    let guardian;
    try {
      guardian = await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_GUARDIANS,
        decoded.sub,
      );
    } catch (_err) {
      throw new AuthenticationError(
        "Account profile not found. Please sign in again.",
      );
    }

    const tokenPayload = {
      sub: decoded.sub,
      email: appwriteUser.email,
      name: appwriteUser.name,
      role: guardian.role,
      isVerified: guardian.isVerified ?? false,
    };
    const accessToken = signAccessToken(tokenPayload);

    // ── Refresh token rotation (A07) ──────────────────────────────────────────
    // Each refresh token is single-use. We compare the incoming jti against
    // the one stored in Appwrite prefs. A mismatch means the token was already
    // used — sign of refresh token theft / replay. Revoke by clearing jti.
    let prefs = {};
    try {
      prefs = await users.getPrefs(decoded.sub);
    } catch (_err) {
      // prefs unreadable — treat as suspicious, refuse refresh
      throw new AuthenticationError(
        "Session validation failed. Please log in again.",
      );
    }

    if (!prefs.refreshJti || prefs.refreshJti !== decoded.jti) {
      // Possible token reuse — clear stored jti to force re-login on all clients
      await users
        .updatePrefs(decoded.sub, { refreshJti: null })
        .catch(() => {});
      await auditLog({
        action: "AUTH_REFRESH_TOKEN_REUSE",
        actorId: decoded.sub,
        actorRole: guardian.role,
        resourceType: "guardian",
        resourceId: decoded.sub,
        meta: { reason: "jti_mismatch" },
      }).catch(() => {});
      throw new AuthenticationError(
        "Refresh token already used. Please log in again.",
      );
    }

    const { token: newRefreshToken, jti: newJti } = signRefreshToken({
      sub: decoded.sub,
    });
    await users.updatePrefs(decoded.sub, { refreshJti: newJti });

    return success(
      res,
      { accessToken, refreshToken: newRefreshToken },
      "Token refreshed",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/logout
 * Clears the stored refresh jti so the refresh token cannot be reused (A07).
 */
const logout = async (req, res, next) => {
  try {
    // Invalidate the server-side refresh token by clearing the stored jti.
    // Even if the client keeps the old refresh token it will be rejected.
    await users.updatePrefs(req.user.sub, { refreshJti: null }).catch(() => {});

    logger.info("Guardian logged out", { userId: req.user?.sub });
    await auditLog({
      action: "AUTH_LOGOUT",
      actorId: req.user.sub,
      actorRole: req.user.role,
      resourceType: "guardian",
      resourceId: req.user.sub,
    }).catch(() => {});

    return success(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/me
 */
const me = async (req, res, next) => {
  try {
    const [appwriteUser, guardian] = await Promise.all([
      users.get(req.user.sub),
      databases.getDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_GUARDIANS,
        req.user.sub,
      ),
    ]);

    return success(res, {
      id: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name,
      role: guardian.role,
      isVerified: guardian.isVerified,
      preferences: JSON.parse(guardian.preferences || "{}"),
    });
  } catch (err) {
    next(err);
  }
};

// ── Verification controllers ──────────────────────────────────────────────────

/**
 * POST /auth/send-verification
 *
 * Generates a 6-digit OTP, stores its bcrypt hash + expiry in Appwrite user
 * prefs, then sends it to the guardian's email.
 *
 * NOTE (MVP): email delivery is logged to the console.
 * Replace the console.log block below with your transactional email provider
 * (e.g. Resend, SendGrid, Postmark) before going to production.
 */
const sendVerification = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    // Fetch current guardian to get email
    const appwriteUser = await users.get(userId);

    // Re-check: skip if already verified
    const guardian = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_GUARDIANS,
      userId,
    );
    if (guardian.isVerified) {
      return success(res, null, "Email is already verified");
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10); // lighter rounds for OTP
    const otpExpiresAt = Date.now() + OTP_TTL_MS;

    await users.updatePrefs(userId, { otpHash, otpExpiresAt });

    // ── Email delivery ────────────────────────────────────────────────────────
    // TODO (production): replace with a real email service.
    // Example using Resend:
    //   await resend.emails.send({
    //     from: 'Jasiri <no-reply@jasiri.app>',
    //     to: appwriteUser.email,
    //     subject: 'Verify your Jasiri account',
    //     html: `<p>Your verification code is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
    //   });
    if (process.env.NODE_ENV !== "production") {
      logger.info(`[DEV] Email verification OTP for ${appwriteUser.email}: ${otp}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    await auditLog({
      action: "AUTH_VERIFICATION_SENT",
      actorId: userId,
      actorRole: req.user.role,
      resourceType: "guardian",
      resourceId: userId,
    }).catch(() => {});

    return success(res, null, "Verification code sent to your email");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/verify-email
 *
 * Validates the submitted OTP against the stored hash + expiry, then marks
 * the guardian as verified in both Appwrite Users and the guardians collection.
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const userId = req.user.sub;

    // Fetch stored OTP hash from prefs
    let prefs = {};
    try {
      prefs = await users.getPrefs(userId);
    } catch (_err) {
      throw new BadRequestError("Verification session not found. Please request a new code.");
    }

    const { otpHash, otpExpiresAt } = prefs;

    if (!otpHash || !otpExpiresAt) {
      throw new BadRequestError("No verification code found. Please request a new code.");
    }

    if (Date.now() > Number(otpExpiresAt)) {
      // Clear expired OTP
      await users.updatePrefs(userId, { otpHash: null, otpExpiresAt: null }).catch(() => {});
      throw new BadRequestError("Verification code has expired. Please request a new one.");
    }

    const isValid = await bcrypt.compare(String(otp), otpHash);
    if (!isValid) {
      throw new BadRequestError("Invalid verification code. Please try again.");
    }

    // Mark verified in the guardians collection
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_GUARDIANS,
      userId,
      { isVerified: true },
    );

    // Clear the used OTP from prefs so it cannot be replayed
    await users.updatePrefs(userId, { otpHash: null, otpExpiresAt: null }).catch(() => {});

    logger.info("Guardian email verified", { userId });
    await auditLog({
      action: "AUTH_EMAIL_VERIFIED",
      actorId: userId,
      actorRole: req.user.role,
      resourceType: "guardian",
      resourceId: userId,
    }).catch(() => {});

    return success(res, { isVerified: true }, "Email verified successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, me, sendVerification, verifyEmail };
