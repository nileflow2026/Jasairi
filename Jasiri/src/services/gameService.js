/**
 * Game Service
 * Wraps backend /games endpoints: sessions + attempts
 */

import { api } from "./api";

export const gameService = {
  /**
   * List available games from the catalogue.
   */
  async list() {
    const res = await api.get("/games");
    return res.data;
  },

  /**
   * List game sessions for the authenticated guardian.
   * @param {{ childId?: string, status?: "active" | "completed" | "abandoned", gameId?: string }} [filters]
   */
  async listSessions(filters = {}) {
    const query = new URLSearchParams();
    if (filters.childId) query.set("childId", filters.childId);
    if (filters.status) query.set("status", filters.status);
    if (filters.gameId) query.set("gameId", filters.gameId);

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await api.get(`/games/sessions${suffix}`);
    return res.data;
  },

  /**
   * Start a new game session.
   * @param {string} gameId         - The backend game document ID
   * @param {string} childId        - Active child's ID
   * @param {string} difficulty     - "beginner" | "intermediate" | "advanced"
   */
  async startSession(gameId, childId, difficulty = "beginner") {
    const res = await api.post(`/games/${gameId}/sessions`, {
      childId,
      difficulty,
    });
    return res.data;
  },

  /**
   * Record an individual attempt within a session.
   * @param {string} gameId
   * @param {string} sessionId
   * @param {{ score: number, completionTimeMs: number, correct: boolean, metadata?: object }} attempt
   */
  async recordAttempt(gameId, sessionId, attempt) {
    const res = await api.post(
      `/games/${gameId}/sessions/${sessionId}/attempts`,
      attempt,
    );
    return res.data;
  },

  /**
   * Complete a game session.
   * @param {string} gameId
   * @param {string} sessionId
   * @param {{ finalScore: number, completionTimeMs: number }} result
   */
  async completeSession(gameId, sessionId, result) {
    const res = await api.patch(`/games/${gameId}/sessions/${sessionId}`, {
      status: "completed",
      ...result,
    });
    return res.data;
  },

  /**
   * Abandon a session (e.g. user navigates away).
   * @param {string} gameId
   * @param {string} sessionId
   */
  async abandonSession(gameId, sessionId) {
    try {
      await api.delete(`/games/${gameId}/sessions/${sessionId}`);
    } catch {
      // Best-effort — don't block navigation
    }
  },

  /**
   * Get AI recommendations for a child.
   * @param {string} childId
   */
  async getRecommendations(childId) {
    const res = await api.post("/ai/recommendations", { childId });
    return res.data;
  },
};
