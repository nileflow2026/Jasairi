const { app } = require('./app');
const { config } = require('./config');
const { logger } = require('./utils/logger');

const PORT = config.port || 3000;

async function startServer() {
  try {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${config.nodeEnv}`);
      logger.info(
        `🔗 API URL: http://localhost:${PORT}/api/${config.apiVersion}`
      );
      logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
