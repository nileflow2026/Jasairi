// @ts-nocheck
const {
  Client,
  Databases,
  Storage,
  Users,
  Teams,
  ID,
  Compression,
} = require('node-appwrite');
const { config } = require('../config');
const { logger } = require('../utils/logger');
const {
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
} = require('./collections');

/**
 * Appwrite Client Configuration
 */
class AppwriteService {
  constructor() {
    this.client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);

    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);

    // Database and Collection IDs - use existing database ID
    this.databaseId = '67a2be30000c7b3cfe4c'; // Use existing database instead of creating new
    this.collections = {
      guardians: ID.unique(),
      children: ID.unique(),
      learningProfiles: ID.unique(),
      gameSessions: ID.unique(),
      gameInteractions: ID.unique(),
      artworkSessions: ID.unique(),
      achievements: ID.unique(),
      aiRecommendations: ID.unique(),
      progressReports: ID.unique(),
      permissions: ID.unique(),
    };

    // Storage Bucket IDs
    this.buckets = {
      childPhotos: 'child_photos',
      artwork: 'child_artwork',
      gameAssets: 'game_assets',
      avatars: 'user_avatars',
    };

    // Team IDs for role management
    this.teams = {
      parents: 'parents_team',
      teachers: 'teachers_team',
      therapists: 'therapists_team',
    };
  }

  /**
   * Initialize Appwrite database and collections
   */
  async initializeDatabase() {
    try {
      logger.info('Initializing Appwrite database...');

      // Create database
      await this.createDatabase();

      // Create all collections
      await this.createCollections();

      // Create storage buckets
      await this.createStorageBuckets();

      // Create teams for role management
      await this.createTeams();

      logger.info('✅ Appwrite database initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Appwrite database:', error);
      throw error;
    }
  }

  /**
   * Create main database
   */
  async createDatabase() {
    try {
      // Try to get the existing database instead of creating a new one
      const database = await this.databases.get(this.databaseId);
      logger.info('Using existing database:', database.name);
    } catch (error) {
      if (error.code === 404) {
        // Database doesn't exist, try to create it
        try {
          await this.databases.create(this.databaseId, 'Jasiri Learning App');
          logger.info('Created main database');
        } catch (createError) {
          if (createError.code === 403) {
            logger.error(
              '❌ Database limit reached. Please use an existing database ID or upgrade your Appwrite plan.'
            );
            throw new Error(
              'Database limit reached. Update APPWRITE_DATABASE_ID in your .env to use an existing database.'
            );
          }
          throw createError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Create all collections with proper schema and permissions
   */
  async createCollections() {
    const collectionConfigs = await Promise.all([
      createGuardiansCollection(),
      createChildrenCollection(),
      createLearningProfilesCollection(),
      createGameSessionsCollection(),
      createGameInteractionsCollection(),
      createArtworkSessionsCollection(),
      createAchievementsCollection(),
      createAIRecommendationsCollection(),
      createProgressReportsCollection(),
      createPermissionsCollection(),
    ]);

    const createdCollections = [];

    for (const config of collectionConfigs) {
      try {
        const collection = await this.databases.createCollection(
          this.databaseId,
          this.collections[config.collectionId] || ID.unique(),
          config.name,
          config.permissions
        );

        // Create attributes
        for (const attribute of config.attributes) {
          await this.createAttribute(collection.$id, attribute);
        }

        // Wait for attributes to be processed before creating indexes
        if (config.indexes && config.indexes.length > 0) {
          logger.info(
            `Skipping index creation for collection: ${config.name} (will be enabled after basic setup works)`
          );

          // Temporarily disable index creation to test basic setup
          // TODO: Re-enable after confirming attributes are created properly
          // for (const index of config.indexes) {
          //   await this.createIndex(collection.$id, index);
          // }
        }

        createdCollections.push(collection);
        logger.info(`Created collection: ${config.name}`);
      } catch (error) {
        if (error.code !== 409) {
          throw error;
        }
        logger.info(`Collection ${config.name} already exists`);
      }
    }

    logger.info(`Processed ${collectionConfigs.length} collections`);
  }

  /**
   * Create attribute for a collection
   */
  async createAttribute(collectionId, attribute) {
    try {
      switch (attribute.type) {
        case 'string':
          await this.databases.createStringAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.size,
            attribute.required,
            attribute.default,
            attribute.array || false
          );
          break;
        case 'integer':
          await this.databases.createIntegerAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.min,
            attribute.max,
            attribute.default,
            attribute.array || false
          );
          break;
        case 'float':
          await this.databases.createFloatAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.min,
            attribute.max,
            attribute.default,
            attribute.array || false
          );
          break;
        case 'boolean':
          await this.databases.createBooleanAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.default,
            attribute.array || false
          );
          break;
        case 'datetime':
          await this.databases.createDatetimeAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.default,
            attribute.array || false
          );
          break;
        case 'email':
          await this.databases.createEmailAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.default,
            attribute.array || false
          );
          break;
        case 'url':
          await this.databases.createUrlAttribute(
            this.databaseId,
            collectionId,
            attribute.key,
            attribute.required,
            attribute.default,
            attribute.array || false
          );
          break;
        default:
          logger.warn(`Unknown attribute type: ${attribute.type}`);
      }
    } catch (error) {
      if (error.code !== 409) {
        throw error;
      }
      // Attribute already exists, skip
    }
  }

  /**
   * Create index for a collection with retry logic
   */
  async createIndex(collectionId, index, retryCount = 0) {
    const maxRetries = 3;
    try {
      await this.databases.createIndex(
        this.databaseId,
        collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders
      );
    } catch (error) {
      if (error.code === 409) {
        // Index already exists, skip
        return;
      }

      if (error.type === 'attribute_not_available' && retryCount < maxRetries) {
        logger.info(
          `Attribute not available, retrying index creation in 3 seconds... (attempt ${retryCount + 1}/${maxRetries})`
        );
        await this.delay(3000);
        return await this.createIndex(collectionId, index, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Delay utility method
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create storage buckets with proper permissions
   */
  async createStorageBuckets() {
    const buckets = [
      {
        id: this.buckets.childPhotos,
        name: 'Child Photos',
        permissions: [
          'read("any")',
          'create("users")',
          'update("users")',
          'delete("users")',
        ],
        fileSecurity: true,
        enabled: true,
        maximumFileSize: 5000000, // 5MB
        allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        compression: Compression.Gzip,
        encryption: true,
        antivirus: true,
      },
      {
        id: this.buckets.artwork,
        name: 'Child Artwork',
        permissions: [
          'read("any")',
          'create("users")',
          'update("users")',
          'delete("users")',
        ],
        fileSecurity: true,
        enabled: true,
        maximumFileSize: 10000000, // 10MB
        allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        compression: 'gzip',
        encryption: true,
        antivirus: true,
      },
      {
        id: this.buckets.gameAssets,
        name: 'Game Assets',
        permissions: ['read("any")'],
        fileSecurity: false,
        enabled: true,
        maximumFileSize: 50000000, // 50MB
        allowedFileExtensions: [
          'jpg',
          'jpeg',
          'png',
          'webp',
          'svg',
          'mp3',
          'wav',
        ],
        compression: 'gzip',
        encryption: false,
        antivirus: true,
      },
      {
        id: this.buckets.avatars,
        name: 'User Avatars',
        permissions: [
          'read("any")',
          'create("users")',
          'update("users")',
          'delete("users")',
        ],
        fileSecurity: true,
        enabled: true,
        maximumFileSize: 2000000, // 2MB
        allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        compression: 'gzip',
        encryption: true,
        antivirus: true,
      },
    ];

    for (const bucket of buckets) {
      try {
        await this.storage.createBucket(
          bucket.id,
          bucket.name,
          bucket.permissions,
          bucket.fileSecurity,
          bucket.enabled,
          bucket.maximumFileSize,
          bucket.allowedFileExtensions,
          bucket.compression,
          bucket.encryption,
          bucket.antivirus
        );
        logger.info(`Created storage bucket: ${bucket.name}`);
      } catch (error) {
        if (error.code !== 409) {
          throw error;
        }
        logger.info(`Storage bucket ${bucket.name} already exists`);
      }
    }
  }

  /**
   * Create teams for role-based access
   */
  async createTeams() {
    const teams = [
      { id: this.teams.parents, name: 'Parents' },
      { id: this.teams.teachers, name: 'Teachers' },
      { id: this.teams.therapists, name: 'Therapists' },
    ];

    for (const team of teams) {
      try {
        await this.teams.create(team.id, team.name);
        logger.info(`Created team: ${team.name}`);
      } catch (error) {
        if (error.code !== 409) {
          throw error;
        }
        logger.info(`Team ${team.name} already exists`);
      }
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    return this.databases;
  }

  /**
   * Get storage instance
   */
  getStorage() {
    return this.storage;
  }

  /**
   * Get users instance
   */
  getUsers() {
    return this.users;
  }
}

// Export singleton instance
const appwriteService = new AppwriteService();

module.exports = {
  appwriteService,
  AppwriteService,
};
