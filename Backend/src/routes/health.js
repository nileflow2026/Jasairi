const express = require("express");
const router = express.Router();
const os = require("os");

/**
 * GET /health
 *
 * Lightweight liveness probe — no auth required.
 * Returns uptime, memory usage, and the current timestamp.
 */
router.get("/", (_req, res) => {
  const mem = process.memoryUsage();

  res.status(200).json({
    status: "healthy",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
    },
  });
});

module.exports = { healthRoutes: router };
