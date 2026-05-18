/**
 * Reports Service
 *
 * Wraps backend endpoints used on the Reports screen:
 *  - Child progress snapshot (GET /children/:id/progress)
 *  - AI performance analysis (POST /ai/analyze-performance)
 *  - Game sessions for a child (GET /games/sessions?childId=...)
 *
 * Results are cached in AsyncStorage for offline access.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const REPORTS_CACHE_PREFIX = "@jasiri_reports_";
const SESSIONS_CACHE_PREFIX = "@jasiri_sessions_";

export const reportsService = {
  /**
   * Fetch the child's learning progress from the backend.
   * Falls back to AsyncStorage cache when offline.
   * @param {string} childId
   * @returns {Promise<object>}
   */
  async getProgress(childId) {
    try {
      const data = await api.get(`/children/${childId}/progress`);
      await AsyncStorage.setItem(
        `${REPORTS_CACHE_PREFIX}${childId}`,
        JSON.stringify(data),
      );
      return data;
    } catch (err) {
      const cached = await AsyncStorage.getItem(
        `${REPORTS_CACHE_PREFIX}${childId}`,
      );
      if (cached) return { ...JSON.parse(cached), _fromCache: true };
      throw err;
    }
  },

  /**
   * Request AI-driven performance analysis from the backend.
   * Falls back to cached analysis when offline.
   * @param {string} childId
   * @param {number} [periodDays=30]
   * @returns {Promise<object>}
   */
  async analyzePerformance(childId, periodDays = 30) {
    const cacheKey = `${REPORTS_CACHE_PREFIX}analysis_${childId}_${periodDays}`;
    try {
      const data = await api.post("/ai/analyze-performance", {
        childId,
        periodDays,
      });
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return { ...JSON.parse(cached), _fromCache: true };
      // Return empty analysis shell rather than crashing
      return {
        trend: "stable",
        averageScore: 0,
        totalSessions: 0,
        insights: [],
        _fromCache: false,
        _unavailable: true,
      };
    }
  },

  /**
   * Fetch recent game sessions for a child.
   * Falls back to AsyncStorage cache when offline.
   * @param {string} childId
   * @param {number} [limit=20]
   * @returns {Promise<Array>}
   */
  async getSessions(childId, limit = 20) {
    const cacheKey = `${SESSIONS_CACHE_PREFIX}${childId}`;
    try {
      const data = await api.get(
        `/games/sessions?childId=${childId}&limit=${limit}`,
      );
      const sessions = Array.isArray(data) ? data : [];
      await AsyncStorage.setItem(cacheKey, JSON.stringify(sessions));
      return sessions;
    } catch (err) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
      return [];
    }
  },
};
