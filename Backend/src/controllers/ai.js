const { databases } = require("../services/appwriteservice");
const { success } = require("../utils/response");
const { NotFoundError, AuthorizationError } = require("../utils/errors");
const { logger } = require("../utils/logger");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL_CHILDREN = () => process.env.APPWRITE_COLLECTION_CHILDREN;
const COL_SESSIONS = () => process.env.APPWRITE_GAME_SESSIONS_COLLECTION;
const COL_PROFILES = () => process.env.APPWRITE_LEARNING_PROFILES_COLLECTION;

/** Verify the requesting guardian owns the child */
const assertChildOwnership = async (childId, guardianId) => {
  const child = await databases
    .getDocument(DB(), COL_CHILDREN(), childId)
    .catch(() => {
      throw new NotFoundError("Child");
    });
  const ids = Array.isArray(child.guardianIds) ? child.guardianIds : [];
  if (!ids.includes(guardianId)) {
    throw new AuthorizationError(
      "You do not have access to this child profile",
    );
  }
  return child;
};

/**
 * POST /ai/recommendations
 * Generate adaptive game recommendations based on the child's learning profile.
 * Body: { childId, context? }
 */
const getRecommendations = async (req, res, next) => {
  try {
    const { childId, context } = req.body;
    await assertChildOwnership(childId, req.user.sub);

    // Fetch learning profile
    const profileResult = await databases.listDocuments(DB(), COL_PROFILES(), [
      `childId=${childId}`,
    ]);
    const profile = profileResult.documents[0] || null;

    // Fetch recent sessions (last 10)
    const sessionResult = await databases.listDocuments(DB(), COL_SESSIONS(), [
      `childId=${childId}`,
    ]);
    const sessions = sessionResult.documents.slice(-10);

    // Derive recommendations from profile data
    const recommendations = buildRecommendations(profile, sessions, context);

    logger.info("AI recommendations generated", {
      childId,
      guardianId: req.user.sub,
      count: recommendations.length,
    });

    return success(
      res,
      {
        childId,
        recommendations,
        basedOn: {
          profile: !!profile,
          sessionsAnalysed: sessions.length,
        },
      },
      "Recommendations generated",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /ai/analyze-performance
 * Analyse a child's performance trends across sessions.
 * Body: { childId, periodDays? }
 */
const analyzePerformance = async (req, res, next) => {
  try {
    const { childId, periodDays = 30 } = req.body;
    await assertChildOwnership(childId, req.user.sub);

    const sessionResult = await databases.listDocuments(DB(), COL_SESSIONS(), [
      `childId=${childId}`,
    ]);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);

    const recentSessions = sessionResult.documents.filter(
      (s) => s.completedAt && new Date(s.completedAt) >= cutoff,
    );

    const analysis = analyseSessionData(recentSessions, periodDays);

    logger.info("Performance analysis completed", {
      childId,
      guardianId: req.user.sub,
      sessionCount: recentSessions.length,
    });

    return success(
      res,
      { childId, periodDays, ...analysis },
      "Performance analysis complete",
    );
  } catch (err) {
    next(err);
  }
};

// ── Internal helpers ───────────────────────────────────────────────────────────

function buildRecommendations(profile, sessions, _context) {
  const recommendations = [];

  const avgScore =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length
      : 0;

  if (avgScore >= 80) {
    recommendations.push({
      type: "challenge_increase",
      priority: "high",
      message: "Excellent performance! Try harder difficulty levels.",
    });
  } else if (avgScore >= 50) {
    recommendations.push({
      type: "maintain_level",
      priority: "medium",
      message:
        "Good progress. Maintain current difficulty to build consistency.",
    });
  } else {
    recommendations.push({
      type: "skill_review",
      priority: "high",
      message: "Consider reviewing foundational skills at a lower difficulty.",
    });
  }

  if (profile?.challengeAreas?.length > 0) {
    recommendations.push({
      type: "targeted_practice",
      priority: "medium",
      message: `Focus on: ${profile.challengeAreas.join(", ")}.`,
      areas: profile.challengeAreas,
    });
  }

  if (sessions.length === 0) {
    recommendations.push({
      type: "get_started",
      priority: "high",
      message: "No sessions recorded yet. Start with beginner-level games!",
    });
  }

  return recommendations;
}

function analyseSessionData(sessions, periodDays) {
  if (sessions.length === 0) {
    return {
      summary: "No completed sessions in this period.",
      sessionCount: 0,
      averageScore: null,
      averageDuration: null,
      trend: "insufficient_data",
    };
  }

  const scores = sessions.map((s) => s.score || 0);
  const durations = sessions.map((s) => s.duration || 0);

  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const averageDuration =
    durations.reduce((a, b) => a + b, 0) / durations.length;

  // Simple linear trend
  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const secondHalf = scores.slice(mid);
  const firstAvg =
    firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const secondAvg =
    secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);

  let trend = "stable";
  if (secondAvg - firstAvg > 5) trend = "improving";
  else if (firstAvg - secondAvg > 5) trend = "declining";

  return {
    sessionCount: sessions.length,
    averageScore: Math.round(averageScore * 10) / 10,
    averageDuration: Math.round(averageDuration),
    trend,
    periodDays,
  };
}

module.exports = { getRecommendations, analyzePerformance };
