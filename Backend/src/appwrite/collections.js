const { Permission, Role } = require('node-appwrite');

/**
 * Guardian Collection Schema
 * Stores parent, teacher, therapist information
 */
async function createGuardiansCollection() {
  const attributes = [
    {
      key: 'email',
      type: 'string',
      size: 255,
      required: true,
    },
    {
      key: 'name',
      type: 'string',
      size: 100,
      required: true,
    },
    {
      key: 'role',
      type: 'string',
      size: 20,
      required: true,
      array: false,
    },
    {
      key: 'phoneNumber',
      type: 'string',
      size: 20,
      required: false,
    },
    {
      key: 'organization',
      type: 'string',
      size: 100,
      required: false,
    },
    {
      key: 'isVerified',
      type: 'boolean',
      required: false,
      default: false,
    },
    {
      key: 'lastLoginAt',
      type: 'datetime',
      required: false,
    },
    {
      key: 'preferences',
      type: 'string',
      size: 5000,
      required: false,
    },
  ];

  const indexes = [
    {
      key: 'email_index',
      type: 'unique',
      attributes: ['email'],
    },
    {
      key: 'role_index',
      type: 'key',
      attributes: ['role'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'guardians',
    name: 'Guardians',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Children Collection Schema
 * Stores child profile information (no direct authentication)
 */
async function createChildrenCollection() {
  const attributes = [
    {
      key: 'name',
      type: 'string',
      size: 100,
      required: true,
    },
    {
      key: 'age',
      type: 'integer',
      required: true,
      min: 2,
      max: 18,
    },
    {
      key: 'dateOfBirth',
      type: 'datetime',
      required: false,
    },
    {
      key: 'photoUrl',
      type: 'string',
      size: 500,
      required: false,
    },
    {
      key: 'guardianIds',
      type: 'string',
      size: 50,
      required: true,
      array: true,
    },
    {
      key: 'medicalInfo',
      type: 'string',
      size: 2000,
      required: false,
    },
    {
      key: 'emergencyContact',
      type: 'string',
      size: 500,
      required: false,
    },
    {
      key: 'isActive',
      type: 'boolean',
      required: false,
      default: true,
    },
  ];

  const indexes = [
    {
      key: 'guardian_index',
      type: 'key',
      attributes: ['guardianIds'],
    },
    {
      key: 'age_index',
      type: 'key',
      attributes: ['age'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'children',
    name: 'Children',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Learning Profiles Collection Schema
 * Stores AI-driven learning analytics for each child
 */
async function createLearningProfilesCollection() {
  const attributes = [
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'accuracy',
      type: 'double',
      required: true,
      min: 0.0,
      max: 1.0,
    },
    {
      key: 'averageSpeed',
      type: 'integer',
      required: true,
    },
    {
      key: 'consistency',
      type: 'double',
      required: true,
      min: 0.0,
      max: 1.0,
    },
    {
      key: 'preferredGameTypes',
      type: 'string',
      size: 50,
      required: false,
      array: true,
    },
    {
      key: 'optimalSessionLength',
      type: 'integer',
      required: true,
      min: 1,
      max: 60,
    },
    {
      key: 'bestTimeOfDay',
      type: 'string',
      size: 20,
      required: false,
    },
    {
      key: 'attentionSpan',
      type: 'integer',
      required: true,
      min: 1,
      max: 60,
    },
    {
      key: 'strongSkills',
      type: 'string',
      size: 50,
      required: false,
      array: true,
    },
    {
      key: 'challengeAreas',
      type: 'string',
      size: 50,
      required: false,
      array: true,
    },
    {
      key: 'progressTrend',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'accessibilityNeeds',
      type: 'string',
      size: 2000,
      required: false,
    },
  ];

  const indexes = [
    {
      key: 'child_unique',
      type: 'unique',
      attributes: ['childId'],
    },
    {
      key: 'progress_trend_index',
      type: 'key',
      attributes: ['progressTrend'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'learning_profiles',
    name: 'Learning Profiles',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Game Sessions Collection Schema
 * Tracks individual game play sessions
 */
async function createGameSessionsCollection() {
  const attributes = [
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'gameId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'gameType',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'startTime',
      type: 'datetime',
      required: true,
    },
    {
      key: 'endTime',
      type: 'datetime',
      required: false,
    },
    {
      key: 'duration',
      type: 'integer',
      required: false,
    },
    {
      key: 'difficulty',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'score',
      type: 'integer',
      required: false,
      min: 0,
    },
    {
      key: 'accuracy',
      type: 'double',
      required: false,
      min: 0.0,
      max: 1.0,
    },
    {
      key: 'completionStatus',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'hintsUsed',
      type: 'integer',
      required: false,
      min: 0,
    },
    {
      key: 'pauseCount',
      type: 'integer',
      required: false,
      min: 0,
    },
  ];

  const indexes = [
    {
      key: 'child_game_index',
      type: 'key',
      attributes: ['childId', 'gameId'],
    },
    {
      key: 'start_time_index',
      type: 'key',
      attributes: ['startTime'],
    },
    {
      key: 'completion_index',
      type: 'key',
      attributes: ['completionStatus'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'game_sessions',
    name: 'Game Sessions',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Game Interactions Collection Schema
 * Detailed interaction data for AI analysis
 */
async function createGameInteractionsCollection() {
  const attributes = [
    {
      key: 'sessionId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'timestamp',
      type: 'datetime',
      required: true,
    },
    {
      key: 'interactionType',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'success',
      type: 'boolean',
      required: true,
    },
    {
      key: 'responseTime',
      type: 'integer',
      required: true,
    },
    {
      key: 'difficulty',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'coordinates',
      type: 'string',
      size: 100,
      required: false,
    },
    {
      key: 'metadata',
      type: 'string',
      size: 1000,
      required: false,
    },
  ];

  const indexes = [
    {
      key: 'session_index',
      type: 'key',
      attributes: ['sessionId'],
    },
    {
      key: 'child_timestamp_index',
      type: 'key',
      attributes: ['childId', 'timestamp'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'game_interactions',
    name: 'Game Interactions',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Artwork Sessions Collection Schema
 * Creative art activities tracking
 */
async function createArtworkSessionsCollection() {
  const attributes = [
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'type',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'templateId',
      type: 'string',
      size: 50,
      required: false,
    },
    {
      key: 'duration',
      type: 'integer',
      required: true,
    },
    {
      key: 'tools',
      type: 'string',
      size: 500,
      required: false,
    },
    {
      key: 'colors',
      type: 'string',
      size: 20,
      required: false,
      array: true,
    },
    {
      key: 'isCompleted',
      type: 'boolean',
      required: false,
      default: false,
    },
    {
      key: 'imageUrl',
      type: 'string',
      size: 500,
      required: false,
    },
    {
      key: 'thumbnailUrl',
      type: 'string',
      size: 500,
      required: false,
    },
    {
      key: 'title',
      type: 'string',
      size: 100,
      required: false,
    },
  ];

  const indexes = [
    {
      key: 'child_date_index',
      type: 'key',
      attributes: ['childId', '$createdAt'],
    },
    {
      key: 'type_index',
      type: 'key',
      attributes: ['type'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'artwork_sessions',
    name: 'Artwork Sessions',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Achievements Collection Schema
 * Gamification and milestone tracking
 */
async function createAchievementsCollection() {
  const attributes = [
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'achievementId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'name',
      type: 'string',
      size: 100,
      required: true,
    },
    {
      key: 'description',
      type: 'string',
      size: 500,
      required: true,
    },
    {
      key: 'category',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'iconUrl',
      type: 'string',
      size: 500,
      required: false,
    },
    {
      key: 'unlockedAt',
      type: 'datetime',
      required: true,
    },
    {
      key: 'progress',
      type: 'double',
      required: true,
      min: 0.0,
      max: 1.0,
    },
    {
      key: 'isVisible',
      type: 'boolean',
      required: false,
      default: true,
    },
  ];

  const indexes = [
    {
      key: 'child_achievement_index',
      type: 'unique',
      attributes: ['childId', 'achievementId'],
    },
    {
      key: 'category_index',
      type: 'key',
      attributes: ['category'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'achievements',
    name: 'Achievements',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * AI Recommendations Collection Schema
 * Machine learning driven suggestions
 */
async function createAIRecommendationsCollection() {
  const attributes = [
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'type',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'priority',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'message',
      type: 'string',
      size: 500,
      required: true,
    },
    {
      key: 'actionable',
      type: 'boolean',
      required: false,
      default: false,
    },
    {
      key: 'data',
      type: 'string',
      size: 2000,
      required: false,
    },
    {
      key: 'isRead',
      type: 'boolean',
      required: false,
      default: false,
    },
    {
      key: 'isImplemented',
      type: 'boolean',
      required: false,
      default: false,
    },
    {
      key: 'expiresAt',
      type: 'datetime',
      required: false,
    },
  ];

  const indexes = [
    {
      key: 'child_priority_index',
      type: 'key',
      attributes: ['childId', 'priority'],
    },
    {
      key: 'type_index',
      type: 'key',
      attributes: ['type'],
    },
    {
      key: 'expires_index',
      type: 'key',
      attributes: ['expiresAt'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'ai_recommendations',
    name: 'AI Recommendations',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Progress Reports Collection Schema
 * Periodic learning progress summaries
 */
async function createProgressReportsCollection() {
  const attributes = [
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'periodStart',
      type: 'datetime',
      required: true,
    },
    {
      key: 'periodEnd',
      type: 'datetime',
      required: true,
    },
    {
      key: 'totalPlayTime',
      type: 'integer',
      required: true,
    },
    {
      key: 'sessionsCompleted',
      type: 'integer',
      required: true,
    },
    {
      key: 'averageAccuracy',
      type: 'double',
      required: true,
      min: 0.0,
      max: 1.0,
    },
    {
      key: 'improvementAreas',
      type: 'string',
      size: 50,
      required: false,
      array: true,
    },
    {
      key: 'achievements',
      type: 'string',
      size: 50,
      required: false,
      array: true,
    },
    {
      key: 'recommendations',
      type: 'string',
      size: 2000,
      required: false,
    },
    {
      key: 'generatedBy',
      type: 'string',
      size: 20,
      required: true,
    },
  ];

  const indexes = [
    {
      key: 'child_period_index',
      type: 'key',
      attributes: ['childId', 'periodStart'],
    },
    {
      key: 'generated_by_index',
      type: 'key',
      attributes: ['generatedBy'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'progress_reports',
    name: 'Progress Reports',
    attributes,
    indexes,
    permissions,
  };
}

/**
 * Permissions Collection Schema
 * Fine-grained access control between guardians and children
 */
async function createPermissionsCollection() {
  const attributes = [
    {
      key: 'guardianId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'childId',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'level',
      type: 'string',
      size: 20,
      required: true,
    },
    {
      key: 'grantedBy',
      type: 'string',
      size: 50,
      required: true,
    },
    {
      key: 'expiresAt',
      type: 'datetime',
      required: false,
    },
    {
      key: 'isActive',
      type: 'boolean',
      required: false,
      default: true,
    },
  ];

  const indexes = [
    {
      key: 'guardian_child_unique',
      type: 'unique',
      attributes: ['guardianId', 'childId'],
    },
    {
      key: 'level_index',
      type: 'key',
      attributes: ['level'],
    },
    {
      key: 'expires_index',
      type: 'key',
      attributes: ['expiresAt'],
    },
  ];

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  return {
    collectionId: 'permissions',
    name: 'Permissions',
    attributes,
    indexes,
    permissions,
  };
}

module.exports = {
  createGuardiansCollection,
  createChildrenCollection,
  createLearningProfilesCollection,
  createGameSessionsCollection,
  createGameInteractionsCollection,
  createArtworkSessionsCollection,
  createAchievementsCollection,
  createAIRecommendationsCollection,
  createProgressReportsCollection,
  createPermissionsCollection,
};
