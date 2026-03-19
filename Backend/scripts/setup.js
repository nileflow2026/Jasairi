#!/usr/bin/env node

/**
 * Jasiri Learning App - Appwrite Setup Script
 * Run this script to initialize your Appwrite backend
 */

const { initializeAppwrite, seedDevelopmentData } = require('../src/appwrite');
const { logger } = require('../src/utils/logger');

async function main() {
  try {
    console.log('🚀 Setting up Jasiri Learning App Backend...\n');

    // Check environment variables
    const requiredEnvVars = [
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID',
      'APPWRITE_API_KEY',
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error(
        '\nPlease copy .env.example to .env and configure the variables.\n'
      );
      process.exit(1);
    }

    console.log('✅ Environment variables validated');

    // Initialize Appwrite
    console.log('\n📊 Initializing Appwrite database and collections...');
    await initializeAppwrite();
    console.log('✅ Appwrite initialization complete');

    // Seed data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🌱 Seeding development data...');
      await seedDevelopmentData();
      console.log('✅ Development data seeded');
    }

    console.log('\n🎉 Jasiri Learning App backend is ready!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Visit http://localhost:3000/health to check status');
    console.log('   3. Check the API documentation at /api/v1');

    if (process.env.NODE_ENV === 'development') {
      console.log('\n👨‍👩‍👧‍👦 Development accounts created:');
      console.log('   Parent: parent@example.com / SecurePassword123!');
      console.log('   Teacher: teacher@school.edu / SecurePassword123!');
    }

    console.log('\n🔐 Security features enabled:');
    console.log('   ✅ COPPA compliant child data handling');
    console.log('   ✅ Role-based access control');
    console.log('   ✅ Content moderation');
    console.log('   ✅ Automatic data retention');
    console.log('   ✅ File upload security');
  } catch (error) {
    logger.error('❌ Setup failed:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify Appwrite server is running');
    console.error('   - Check your Appwrite project ID and API key');
    console.error('   - Ensure network connectivity to Appwrite endpoint');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Setup interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Setup terminated');
  process.exit(0);
});

// Run the setup
main();
