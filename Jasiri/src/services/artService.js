/**
 * Art Service
 * Wraps backend /art endpoints
 */

import { api } from "./api";

export const artService = {
  /**
   * List artworks for a child.
   * @param {string} childId
   */
  async list(childId) {
    const res = await api.get(`/art?childId=${childId}`);
    return res.data;
  },

  /**
   * Save artwork metadata (and optional image blob).
   * @param {{ childId: string, type: string, duration: number, imageUri?: string }} data
   */
  async save(data) {
    const formData = new FormData();
    formData.append("childId", data.childId);
    formData.append("type", data.type || "drawing");
    formData.append("duration", String(data.duration || 0));

    if (data.imageUri) {
      const filename = data.imageUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/png";
      formData.append("image", {
        uri: data.imageUri,
        name: filename,
        type: mimeType,
      });
    }

    const res = await api.upload("/art", formData);
    return res.data;
  },

  /**
   * Get a single artwork by ID.
   * @param {string} artId
   */
  async get(artId) {
    const res = await api.get(`/art/${artId}`);
    return res.data;
  },

  /**
   * Delete an artwork.
   * @param {string} artId
   */
  async remove(artId) {
    await api.delete(`/art/${artId}`);
  },
};
