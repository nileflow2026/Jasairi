const winston = require('winston');
const { config } = require('../config');

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'jasiri-backend',
    environment: config.nodeEnv 
  },
  transports: [
    // Write to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Write to file in production
    ...(config.nodeEnv === 'production' ? [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log' 
      })
    ] : [])
  ]
});

module.exports = { logger };