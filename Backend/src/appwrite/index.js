// @ts-nocheck
const { appwriteService } = require('./client');
const { AuthService } = require('./auth');
const { SecurityService } = require('./security');
const { logger } = require('../utils/logger');

/**
 * Initialize Appwrite Services
 */
async function initializeAppwrite() {
  try {
    logger.info('🚀 Initializing Appwrite services...');

    // Initialize database schema and collections
    await appwriteService.initializeDatabase();

    // Initialize auth service
    const authService = new AuthService(appwriteService);

    // Initialize security service
    const securityService = new SecurityService(appwriteService);

    // Set up periodic security tasks
    setupSecurityTasks(securityService);

    logger.info('✅ Appwrite services initialized successfully');

    return {
      appwriteService,
      authService,
      securityService,
    };
  } catch (error) {
    logger.error('❌ Failed to initialize Appwrite:', error);
    throw error;
  }
}

/**
 * Setup recurring security and maintenance tasks
 */
function setupSecurityTasks(securityService) {
  // Run data retention cleanup daily at 2 AM
  const dailyCleanup = setInterval(
    async () => {
      try {
        logger.info('Running daily data retention cleanup...');
        await securityService.enforceDataRetention();
        logger.info('✅ Daily cleanup completed');
      } catch (error) {
        logger.error('❌ Daily cleanup failed:', error);
      }
    },
    24 * 60 * 60 * 1000
  ); // 24 hours

  // Cleanup interval on process exit
  process.on('SIGTERM', () => {
    clearInterval(dailyCleanup);
  });

  process.on('SIGINT', () => {
    clearInterval(dailyCleanup);
  });
}

/**
 * Health check for Appwrite services
 */
async function checkAppwriteHealth() {
  try {
    // Test database connection
    await appwriteService
      .getDatabase()
      .listDocuments(
        appwriteService.databaseId,
        appwriteService.collections.guardians,
        []
      );

    // Test storage connection
    await appwriteService.getStorage().listBuckets();

    return {
      status: 'healthy',
      database: 'connected',
      storage: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Appwrite health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create development seed data
 */
async function seedDevelopmentData() {
  if (process.env.NODE_ENV !== 'development') {
    logger.warn('Seed data only available in development environment');
    return;
  }

  try {
    logger.info('Seeding development data...');

    const authService = new AuthService(appwriteService);

    // Create sample parent guardian
    const parentGuardian = await authService.registerGuardian(
      'parent@example.com',
      'SecurePassword123!',
      'Sample Parent',
      'parent'
    );

    // Create sample child
    const sampleChild = await authService.createChildProfile(
      parentGuardian.user.$id,
      {
        name: 'Alex Johnson',
        age: 8,
        dateOfBirth: '2018-03-15T00:00:00.000Z',
      }
    );

    // Create sample teacher
    const teacherGuardian = await authService.registerGuardian(
      'teacher@school.edu',
      'SecurePassword123!',
      'Ms. Sarah Wilson',
      'teacher',
      { name: 'Lincoln Elementary School' }
    );

    // Grant teacher view access to child
    await authService.grantChildAccess(
      parentGuardian.user.$id,
      teacherGuardian.user.$id,
      sampleChild.$id,
      'view'
    );

    logger.info('✅ Development seed data created');
    logger.info(`Parent ID: ${parentGuardian.user.$id}`);
    logger.info(`Child ID: ${sampleChild.$id}`);
    logger.info(`Teacher ID: ${teacherGuardian.user.$id}`);
  } catch (error) {
    logger.error('❌ Failed to seed development data:', error);
  }
}

module.exports = {
  initializeAppwrite,
  checkAppwriteHealth,
  seedDevelopmentData,
  appwriteService,
};
