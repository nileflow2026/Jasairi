const {
  databases,
  users,
  Permission,
  Role,
  ID,
} = require("../services/appwriteservice");

/**
 * Type Definitions
 */

/**
 * @typedef {Object} OrganizationInfo
 * @property {string} name
 */

/**
 * @typedef {Object} GuardianPreferences
 * @property {boolean} notifications
 * @property {string} language
 * @property {string} timezone
 */

/**
 * @typedef {Object} GuardianData
 * @property {string} email
 * @property {string} name
 * @property {string} role
 * @property {string|null} organization
 * @property {boolean} isVerified
 * @property {string} preferences
 */

/**
 * @typedef {Object} RegistrationResult
 * @property {Object} user
 * @property {Object} guardian
 * @property {boolean} requiresVerification
 */

/**
 * @typedef {Object} ChildData
 * @property {string} name
 * @property {number} age
 * @property {string} [dateOfBirth]
 * @property {string} [photoUrl]
 * @property {Object} [medicalInfo]
 * @property {Object} [emergencyContact]
 */

/**
 * @typedef {Object} SanitizedChildData
 * @property {string} name
 * @property {number} age
 * @property {string|null} dateOfBirth
 * @property {string|null} photoUrl
 * @property {string[]} guardianIds
 * @property {Object|null} medicalInfo
 * @property {Object|null} emergencyContact
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} PermissionRecord
 * @property {string} guardianId
 * @property {string} childId
 * @property {string} level
 * @property {string} grantedBy
 * @property {string|null} expiresAt
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} LearningProfile
 * @property {string} childId
 * @property {number} accuracy
 * @property {number} averageSpeed
 * @property {number} consistency
 * @property {string[]} preferredGameTypes
 * @property {number} optimalSessionLength
 * @property {string|null} bestTimeOfDay
 * @property {number} attentionSpan
 * @property {string[]} strongSkills
 * @property {string[]} challengeAreas
 * @property {string} progressTrend
 * @property {string|null} accessibilityNeeds
 */

/**
 * @typedef {Object} AccessGrantResult
 * @property {boolean} success
 * @property {string} message
 */

/**
 * COPPA Compliant Authentication Service
 * Children never authenticate directly - only guardians
 */

/**
 * Register new guardian with role-based access
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string} role
 * @param {OrganizationInfo|null} [organizationInfo=null]
 * @returns {Promise<RegistrationResult>}
 */
async function registerGuardian(
  email,
  password,
  name,
  role,
  organizationInfo = null,
) {
  try {
    // Validate role
    const validRoles = ["parent", "teacher", "therapist", "caregiver"];
    if (!validRoles.includes(role)) {
      throw new Error("Invalid guardian role");
    }

    // Create Appwrite user account
    const user = await users.create(
      ID.unique(), // Let Appwrite generate ID
      email,
      password,
      name,
    );

    // Create guardian profile in database
    const guardianData = {
      email,
      name,
      role,
      organization: organizationInfo?.name || null,
      isVerified: false,
      preferences: JSON.stringify({
        notifications: true,
        language: "en",
        timezone: "UTC",
      }),
    };

    const guardian = await databases.createDocument(
      // @ts-ignore
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_GUARDIANS,
      user.$id, // Use Appwrite user ID as document ID
      guardianData,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ],
    );

    // Add to appropriate team based on role
    await assignRoleToUser(user.$id, role);

    return {
      user,
      guardian,
      requiresVerification: role !== "parent", // Teachers/therapists need verification
    };
  } catch (error) {
    throw new Error(
      `Registration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * @typedef {Object} AuthenticationError
 * @property {string} message
 */

/**
 * Authenticate guardian and return session info
 * @param {string} email
 * @param {string} password
 * @throws {Error}
 */
// @ts-ignore
async function authenticateGuardian(email, password) {
  try {
    // This would typically be handled by Appwrite's client-side SDK
    // Server-side authentication for API access
    // Note: Server-side session creation requires different approach
    throw new Error(
      "Server-side authentication not supported - use client SDK",
    );
  } catch (error) {
    // @ts-ignore
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Create child profile (guardian action only)
 * @param {string} guardianId
 * @param {ChildData} childData
 * @returns {Promise<Object>}
 * @throws {Error}
 */
async function createChildProfile(guardianId, childData) {
  try {
    // Validate guardian permissions
    await validateGuardianPermissions(guardianId, "create_child");

    // Sanitize child data (no PII in logs)
    /** @type {SanitizedChildData} */
    const sanitizedData = {
      name: childData.name,
      // @ts-ignore
      age: parseInt(childData.age),
      dateOfBirth: childData.dateOfBirth || null,
      photoUrl: childData.photoUrl || null,
      guardianIds: [guardianId],
      medicalInfo: childData.medicalInfo || null,
      emergencyContact: childData.emergencyContact || null,
      isActive: true,
    };

    // Create child profile with guardian-only access
    const child = await databases.createDocument(
      // @ts-ignore
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_CHILDREN,
      ID.unique(),
      sanitizedData,
      [
        Permission.read(Role.user(guardianId)),
        Permission.update(Role.user(guardianId)),
        Permission.delete(Role.user(guardianId)),
      ],
    );

    // Create initial learning profile
    await createInitialLearningProfile(child.$id);

    // Create guardian-child permission record
    await createPermission(guardianId, child.$id, "admin", guardianId);

    return child;
  } catch (error) {
    // @ts-ignore
    throw new Error(`Child profile creation failed: ${error.message}`);
  }
}

/**
 * Grant access to child for another guardian
 */
async function grantChildAccess(
  // @ts-ignore
  grantingGuardianId,
  // @ts-ignore
  receivingGuardianId,
  // @ts-ignore
  childId,
  // @ts-ignore
  accessLevel,
) {
  try {
    // Validate granting guardian has admin access
    await validateChildAccess(grantingGuardianId, childId, "admin");

    // Validate receiving guardian exists and is verified
    const receivingGuardian = await databases.getDocument(
      // @ts-ignore
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_GUARDIANS,
      receivingGuardianId,
    );

    if (!receivingGuardian.isVerified) {
      throw new Error("Guardian must be verified before granting access");
    }

    // Create permission record
    await createPermission(
      receivingGuardianId,
      childId,
      accessLevel,
      grantingGuardianId,
    );

    // Update child document permissions
    const permissions = await buildChildPermissions(childId);
    await databases.updateDocument(
      // @ts-ignore
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_CHILDREN,
      childId,
      {},
      permissions,
    );

    return { success: true, message: "Access granted successfully" };
  } catch (error) {
    // @ts-ignore
    throw new Error(`Access grant failed: ${error.message}`);
  }
}

/**
 * Assign user to role-based team
 */
// @ts-ignore
async function assignRoleToUser(userId, role) {
  // Note: Team functionality needs to be implemented with environment variables
  // or passed as parameters since we no longer have access to this.appwrite
  console.log(
    `Role assignment for user ${userId} with role ${role} - implement team logic`,
  );
}

/**
 * Validate guardian has specific permissions
 */
// @ts-ignore
async function validateGuardianPermissions(guardianId, action) {
  const guardian = await databases.getDocument(
    // @ts-ignore
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_COLLECTION_GUARDIANS,
    guardianId,
  );

  if (!guardian.isVerified && guardian.role !== "parent") {
    throw new Error("Guardian account requires verification");
  }

  // Add role-specific permission checks here
  return true;
}

/**
 * Validate guardian access to specific child
 */
async function validateChildAccess(
  // @ts-ignore
  guardianId,
  // @ts-ignore
  childId,
  requiredLevel = "view",
) {
  try {
    const permission = await databases.listDocuments(
      // @ts-ignore
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_PERMISSIONS_COLLECTION,
      [`guardianId=${guardianId}`, `childId=${childId}`, "isActive=true"],
    );

    if (permission.documents.length === 0) {
      throw new Error("Access denied: No permission found");
    }

    const userPermission = permission.documents[0];
    const levelHierarchy = { view: 1, edit: 2, admin: 3 };

    // @ts-ignore
    if (levelHierarchy[userPermission.level] < levelHierarchy[requiredLevel]) {
      throw new Error(
        `Access denied: Insufficient permissions (${requiredLevel} required)`,
      );
    }

    return true;
  } catch (error) {
    // @ts-ignore
    throw new Error(`Access validation failed: ${error.message}`);
  }
}

/**
 * Create initial learning profile for new child
 */
// @ts-ignore
async function createInitialLearningProfile(childId) {
  const initialProfile = {
    childId,
    accuracy: 0.0,
    averageSpeed: 0,
    consistency: 0.0,
    preferredGameTypes: [],
    optimalSessionLength: 10,
    bestTimeOfDay: null,
    attentionSpan: 10,
    strongSkills: [],
    challengeAreas: [],
    progressTrend: "stable",
    accessibilityNeeds: null,
  };

  return await databases.createDocument(
    // @ts-ignore
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_LEARNING_PROFILES_COLLECTION,
    "unique()",
    initialProfile,
    [Permission.read(Role.users()), Permission.update(Role.users())],
  );
}

/**
 * Create permission record
 */
// @ts-ignore
async function createPermission(guardianId, childId, level, grantedBy) {
  const permissionData = {
    guardianId,
    childId,
    level,
    grantedBy,
    expiresAt: null, // Permanent by default
    isActive: true,
  };

  return await databases.createDocument(
    // @ts-ignore
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_PERMISSIONS_COLLECTION,
    "unique()",
    permissionData,
    [
      Permission.read(Role.user(guardianId)),
      Permission.read(Role.user(grantedBy)),
      Permission.update(Role.user(grantedBy)),
      Permission.delete(Role.user(grantedBy)),
    ],
  );
}

/**
 * Build comprehensive permissions for child document
 */
// @ts-ignore
async function buildChildPermissions(childId) {
  const permissions = await databases.listDocuments(
    // @ts-ignore
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_PERMISSIONS_COLLECTION,
    [`childId=${childId}`, "isActive=true"],
  );

  // @ts-ignore
  const documentPermissions = [];

  permissions.documents.forEach((perm) => {
    documentPermissions.push(Permission.read(Role.user(perm.guardianId)));

    if (perm.level === "edit" || perm.level === "admin") {
      documentPermissions.push(Permission.update(Role.user(perm.guardianId)));
    }

    if (perm.level === "admin") {
      documentPermissions.push(Permission.delete(Role.user(perm.guardianId)));
    }
  });

  // @ts-ignore
  return documentPermissions;
}

module.exports = {
  registerGuardian,
  authenticateGuardian,
  createChildProfile,
  grantChildAccess,
  assignRoleToUser,
  validateGuardianPermissions,
  validateChildAccess,
  createInitialLearningProfile,
  createPermission,
  buildChildPermissions,
};
