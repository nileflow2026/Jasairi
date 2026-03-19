const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { config } = require('./config');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { authRoutes } = require('./routes/auth');
const { childRoutes } = require('./routes/child');
const { gameRoutes } = require('./routes/game');
const { aiRoutes } = require('./routes/ai');
const { checkAppwriteHealth } = require('./appwrite');

const app = express();

// Security Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body Parsing & Compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use(requestLogger);

// Health Check
app.get('/health', async (req, res) => {
  try {
    const appwriteHealth = await checkAppwriteHealth();

    const healthStatus = {
      status: appwriteHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      services: {
        appwrite: appwriteHealth,
        api: 'healthy',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      environment: config.nodeEnv,
    });
  }
});

// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/children', childRoutes);
apiRouter.use('/games', gameRoutes);
apiRouter.use('/ai', aiRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = { app };
