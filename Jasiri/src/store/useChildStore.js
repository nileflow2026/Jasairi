/**
 * Child Store (Zustand)
 *
 * Manages:
 *  - List of children belonging to the logged-in guardian
 *  - The currently selected/active child
 *  - Child learning progress cache
 *  - Offline-safe local cache in AsyncStorage
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { childService } from "../services/childService";

const CHILDREN_CACHE_KEY = "@jasiri_children";
const SELECTED_CHILD_KEY = "@jasiri_selected_child";
const PROGRESS_CACHE_PREFIX = "@jasiri_progress_";

const useChildStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  children: [],
  selectedChild: null,
  progress: null, // learning profile for selectedChild
  isLoading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────

  /**
   * Load children from backend. Falls back to local cache on failure.
   */
  loadChildren: async () => {
    set({ isLoading: true, error: null });
    try {
      const children = await childService.list();
      await AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(children));
      set({ children, isLoading: false });
    } catch (err) {
      // Offline fallback
      const cached = await AsyncStorage.getItem(CHILDREN_CACHE_KEY);
      if (cached) {
        set({ children: JSON.parse(cached), isLoading: false });
      } else {
        set({
          error: err.isNetworkError ? "You appear to be offline." : err.message,
          isLoading: false,
        });
      }
    }
  },

  /**
   * Create a new child profile and add it to the store.
   * @param {{ name: string, age: number }} data
   */
  addChild: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const child = await childService.create(data);
      const updated = [...get().children, child];
      await AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(updated));
      set({ children: updated, isLoading: false });
      return child;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  /**
   * Set the active child for the current learning session.
   * Restores cached progress immediately (offline-safe), then refreshes in background.
   * @param {object} child
   */
  selectChild: async (child) => {
    if (!child?.$id) return;
    set({ selectedChild: child, progress: null });
    await AsyncStorage.setItem(SELECTED_CHILD_KEY, JSON.stringify(child));

    // Restore cached progress immediately so UI isn't empty offline
    try {
      const cachedProgress = await AsyncStorage.getItem(
        `${PROGRESS_CACHE_PREFIX}${child.$id}`,
      );
      if (cachedProgress) {
        set({ progress: JSON.parse(cachedProgress) });
      }
    } catch {
      // Non-fatal
    }

    // Fetch fresh progress in background and persist it
    childService
      .getProgress(child.$id)
      .then(async (progress) => {
        set({ progress });
        try {
          await AsyncStorage.setItem(
            `${PROGRESS_CACHE_PREFIX}${child.$id}`,
            JSON.stringify(progress),
          );
        } catch {
          // Non-fatal
        }
      })
      .catch(() => {
        // Silent — cached progress already shown
      });
  },

  /**
   * Restore the previously selected child from local storage.
   */
  restoreSelectedChild: async () => {
    const cached = await AsyncStorage.getItem(SELECTED_CHILD_KEY);
    if (cached) {
      set({ selectedChild: JSON.parse(cached) });
    }
  },

  clearSelectedChild: () => {
    AsyncStorage.removeItem(SELECTED_CHILD_KEY);
    set({ selectedChild: null, progress: null });
  },

  /**
   * Full store reset — called on guardian logout to prevent data leakage
   * between different guardians on the same device.
   */
  reset: async () => {
    await Promise.allSettled([
      AsyncStorage.removeItem(CHILDREN_CACHE_KEY),
      AsyncStorage.removeItem(SELECTED_CHILD_KEY),
    ]);
    set({
      children: [],
      selectedChild: null,
      progress: null,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useChildStore;
