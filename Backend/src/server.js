const { app } = require("./app");
const { config } = require("./config");
const { logger } = require("./utils/logger");

const PORT = config.port || 3000;

/** Gracefully close the HTTP server before exiting */
const shutdown = (server, signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000).unref();
};

async function startServer() {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API URL: http://localhost:${PORT}/api/${config.apiVersion}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    process.on("SIGTERM", () => shutdown(server, "SIGTERM"));
    process.on("SIGINT", () => shutdown(server, "SIGINT"));

    // Unhandled rejection guard — async errors that escaped try/catch
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled promise rejection", { reason });
      shutdown(server, "unhandledRejection");
    });

    // Uncaught exception guard — synchronous throws that escaped all handlers.
    // Always shut down after an uncaught exception; the process is in an
    // unknown state and should not continue serving requests.
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception — shutting down", {
        error: error.message,
        stack: error.stack,
      });
      shutdown(server, "uncaughtException");
    });

    return server;
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
}

startServer();
