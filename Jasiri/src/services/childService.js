/**
 * Child Service
 * Wraps backend /children endpoints
 */

import { api } from "./api";

export const childService = {
  /**
   * List all children belonging to the authenticated guardian.
   */
  async list() {
    const res = await api.get("/children");
    return res.data;
  },

  /**
   * Create a new child profile.
   * @param {{ name: string, age: number, dateOfBirth?: string }} data
   */
  async create(data) {
    const res = await api.post("/children", data);
    return res.data;
  },

  /**
   * Get a single child's full profile.
   * @param {string} childId
   */
  async get(childId) {
    const res = await api.get(`/children/${childId}`);
    return res.data;
  },

  /**
   * Update child profile fields.
   * @param {string} childId
   * @param {object} updates
   */
  async update(childId, updates) {
    const res = await api.patch(`/children/${childId}`, updates);
    return res.data;
  },

  /**
   * Get a child's learning progress + AI profile.
   * @param {string} childId
   */
  async getProgress(childId) {
    const res = await api.get(`/children/${childId}/progress`);
    return res.data;
  },
};
