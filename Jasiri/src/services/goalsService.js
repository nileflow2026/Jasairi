/**
 * Goals Service
 *
 * Manages learning goals for a child.
 * Goals are persisted locally in AsyncStorage (offline-first).
 * The optimalSessionLength is synced to the backend child profile
 * via PATCH /children/:id when connectivity allows.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const GOALS_KEY_PREFIX = "@jasiri_goals_";
const GOALS_PENDING_SYNC_PREFIX = "@jasiri_goals_pending_";

export const SKILL_OPTIONS = ["Memory", "Language", "Motor Skills", "Creativity"];
export const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"];
export const SESSION_MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60];

export const DEFAULT_GOALS = {
  dailyMinutes: 15,
  weeklySessionTarget: 5,
  focusSkills: ["Memory", "Language"],
  difficulty: "beginner",
  updatedAt: null,
};

export const goalsService = {
  /**
   * Load goals for a child from local storage.
   * Returns DEFAULT_GOALS if none have been set yet.
   * Also attempts to flush any pending backend sync from a previous failure.
   * @param {string} childId
   * @returns {Promise<object>}
   */
  async load(childId) {
    try {
      const cached = await AsyncStorage.getItem(`${GOALS_KEY_PREFIX}${childId}`);
      if (cached) {
        const goals = JSON.parse(cached);

        // Flush pending sync — silently, without blocking the return
        const pendingKey = `${GOALS_PENDING_SYNC_PREFIX}${childId}`;
        AsyncStorage.getItem(pendingKey).then((pending) => {
          if (!pending) return;
          api
            .patch(`/children/${childId}`, {
              optimalSessionLength: goals.dailyMinutes,
            })
            .then(() => AsyncStorage.removeItem(pendingKey))
            .catch(() => {}); // Will retry on next load
        });

        return goals;
      }
    } catch {
      // Non-fatal — return defaults
    }
    return { ...DEFAULT_GOALS };
  },

  /**
   * Persist goals locally and best-effort sync to backend.
   * Marks a pending sync flag if the backend call fails, so the
   * next `load()` can retry automatically.
   * @param {string} childId
   * @param {object} goals
   * @returns {Promise<object>} The saved goals object with updatedAt timestamp
   */
  async save(childId, goals) {
    const updated = { ...goals, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(
      `${GOALS_KEY_PREFIX}${childId}`,
      JSON.stringify(updated),
    );

    // Sync the session length goal to the child's learning profile on the backend.
    // This allows the AI recommendation engine to use it.
    try {
      await api.patch(`/children/${childId}`, {
        optimalSessionLength: updated.dailyMinutes,
      });
      // Sync succeeded — clear any stale pending flag
      await AsyncStorage.removeItem(`${GOALS_PENDING_SYNC_PREFIX}${childId}`);
    } catch {
      // Mark as pending — will retry on next load()
      await AsyncStorage.setItem(
        `${GOALS_PENDING_SYNC_PREFIX}${childId}`,
        "1",
      ).catch(() => {});
    }

    return updated;
  },
};
