const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables
dotenv.config();

// Environment validation schema
const configSchema = z.object({
  nodeEnv: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  port: z.coerce.number().default(3000),
  apiVersion: z.string().default('v1'),

  // Database
  databaseUrl: z.string().min(1, 'Database URL is required'),

  // Appwrite
  appwrite: z.object({
    endpoint: z.string().url('Valid Appwrite endpoint required'),
    projectId: z.string().min(1, 'Appwrite Project ID required'),
    apiKey: z.string().min(1, 'Appwrite API Key required'),
  }),

  // JWT
  jwt: z.object({
    secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    expiresIn: z.string().default('7d'),
    refreshSecret: z
      .string()
      .min(32, 'JWT refresh secret must be at least 32 characters'),
    refreshExpiresIn: z.string().default('30d'),
  }),

  // Redis
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
    password: z.string().optional(),
  }),

  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
    maxRequests: z.coerce.number().default(100),
  }),

  // CORS
  cors: z.object({
    origin: z.string().transform(str => str.split(',')),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    file: z.string().default('logs/app.log'),
  }),

  // Security
  security: z.object({
    bcryptRounds: z.coerce.number().default(12),
    maxFileSize: z.string().default('10mb'),
    uploadFolder: z.string().default('uploads'),
  }),
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    return configSchema.parse({
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      apiVersion: process.env.API_VERSION,
      databaseUrl: process.env.DATABASE_URL,
      appwrite: {
        endpoint: process.env.APPWRITE_ENDPOINT,
        projectId: process.env.APPWRITE_PROJECT_ID,
        apiKey: process.env.APPWRITE_API_KEY,
      },
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      },
      redis: {
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
      },
      rateLimit: {
        windowMs: process.env.RATE_LIMIT_WINDOW_MS,
        maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
      },
      cors: {
        origin: process.env.CORS_ORIGIN,
      },
      logging: {
        level: process.env.LOG_LEVEL,
        file: process.env.LOG_FILE,
      },
      security: {
        bcryptRounds: process.env.BCRYPT_ROUNDS,
        maxFileSize: process.env.MAX_FILE_SIZE,
        uploadFolder: process.env.UPLOAD_FOLDER,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

const config = parseConfig();

module.exports = { config };
