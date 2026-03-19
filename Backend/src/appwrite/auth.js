const {
  databases,
  users,
  Permission,
  Role,
  ID,
} = require('../services/appwriteservice');

/**
 * COPPA Compliant Authentication Service
 * Children never authenticate directly - only guardians
 */

/**
 * Register new guardian with role-based access
 */
async function registerGuardian(
  email,
  password,
  name,
  role,
  organizationInfo = null
) {
  try {
    // Validate role
    const validRoles = ['parent', 'teacher', 'therapist', 'caregiver'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid guardian role');
    }

    // Create Appwrite user account
    const user = await users.create(
      ID.unique(), // Let Appwrite generate ID
      email,
      password,
      name
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
        language: 'en',
        timezone: 'UTC',
      }),
    };

    const guardian = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_GUARDIANS,
      user.$id, // Use Appwrite user ID as document ID
      guardianData,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );

    // Add to appropriate team based on role
    await assignRoleToUser(user.$id, role);

    return {
      user,
      guardian,
      requiresVerification: role !== 'parent', // Teachers/therapists need verification
    };
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
}

/**
 * Authenticate guardian and return session info
 */
async function authenticateGuardian(email, password) {
  try {
    // This would typically be handled by Appwrite's client-side SDK
    // Server-side authentication for API access
    // Note: Server-side session creation requires different approach
    throw new Error(
      'Server-side authentication not supported - use client SDK'
    );
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Create child profile (guardian action only)
 */
async function createChildProfile(guardianId, childData) {
  try {
    // Validate guardian permissions
    await validateGuardianPermissions(guardianId, 'create_child');

    // Sanitize child data (no PII in logs)
    const sanitizedData = {
      name: childData.name,
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
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_CHILDREN,
      ID.unique(),
      sanitizedData,
      [
        Permission.read(Role.user(guardianId)),
        Permission.update(Role.user(guardianId)),
        Permission.delete(Role.user(guardianId)),
      ]
    );

    // Create initial learning profile
    await createInitialLearningProfile(child.$id);

    // Create guardian-child permission record
    await createPermission(guardianId, child.$id, 'admin', guardianId);

    return child;
  } catch (error) {
    throw new Error(`Child profile creation failed: ${error.message}`);
  }
}

/**
 * Grant access to child for another guardian
 */
async function grantChildAccess(
  grantingGuardianId,
  receivingGuardianId,
  childId,
  accessLevel
) {
  try {
    // Validate granting guardian has admin access
    await validateChildAccess(grantingGuardianId, childId, 'admin');

    // Validate receiving guardian exists and is verified
    const receivingGuardian = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_GUARDIANS,
      receivingGuardianId
    );

    if (!receivingGuardian.isVerified) {
      throw new Error('Guardian must be verified before granting access');
    }

    // Create permission record
    await createPermission(
      receivingGuardianId,
      childId,
      accessLevel,
      grantingGuardianId
    );

    // Update child document permissions
    const permissions = await buildChildPermissions(childId);
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_CHILDREN,
      childId,
      {},
      permissions
    );

    return { success: true, message: 'Access granted successfully' };
  } catch (error) {
    throw new Error(`Access grant failed: ${error.message}`);
  }
}

/**
 * Assign user to role-based team
 */
async function assignRoleToUser(userId, role) {
  // Note: Team functionality needs to be implemented with environment variables
  // or passed as parameters since we no longer have access to this.appwrite
  console.log(
    `Role assignment for user ${userId} with role ${role} - implement team logic`
  );
}

/**
 * Validate guardian has specific permissions
 */
async function validateGuardianPermissions(guardianId, action) {
  const guardian = await databases.getDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_COLLECTION_GUARDIANS,
    guardianId
  );

  if (!guardian.isVerified && guardian.role !== 'parent') {
    throw new Error('Guardian account requires verification');
  }

  // Add role-specific permission checks here
  return true;
}

/**
 * Validate guardian access to specific child
 */
async function validateChildAccess(
  guardianId,
  childId,
  requiredLevel = 'view'
) {
  try {
    const permission = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_PERMISSIONS_COLLECTION,
      [`guardianId=${guardianId}`, `childId=${childId}`, 'isActive=true']
    );

    if (permission.documents.length === 0) {
      throw new Error('Access denied: No permission found');
    }

    const userPermission = permission.documents[0];
    const levelHierarchy = { view: 1, edit: 2, admin: 3 };

    if (levelHierarchy[userPermission.level] < levelHierarchy[requiredLevel]) {
      throw new Error(
        `Access denied: Insufficient permissions (${requiredLevel} required)`
      );
    }

    return true;
  } catch (error) {
    throw new Error(`Access validation failed: ${error.message}`);
  }
}

/**
 * Create initial learning profile for new child
 */
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
    progressTrend: 'stable',
    accessibilityNeeds: null,
  };

  return await databases.createDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_LEARNING_PROFILES_COLLECTION,
    'unique()',
    initialProfile,
    [Permission.read(Role.users()), Permission.update(Role.users())]
  );
}

/**
 * Create permission record
 */
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
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_PERMISSIONS_COLLECTION,
    'unique()',
    permissionData,
    [
      Permission.read(Role.user(guardianId)),
      Permission.read(Role.user(grantedBy)),
      Permission.update(Role.user(grantedBy)),
      Permission.delete(Role.user(grantedBy)),
    ]
  );
}

/**
 * Build comprehensive permissions for child document
 */
async function buildChildPermissions(childId) {
  const permissions = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_PERMISSIONS_COLLECTION,
    [`childId=${childId}`, 'isActive=true']
  );

  const documentPermissions = [];

  permissions.documents.forEach(perm => {
    documentPermissions.push(Permission.read(Role.user(perm.guardianId)));

    if (perm.level === 'edit' || perm.level === 'admin') {
      documentPermissions.push(Permission.update(Role.user(perm.guardianId)));
    }

    if (perm.level === 'admin') {
      documentPermissions.push(Permission.delete(Role.user(perm.guardianId)));
    }
  });

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
