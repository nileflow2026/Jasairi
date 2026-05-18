/**
 * Auth Store (Zustand)
 *
 * Manages:
 *  - Guardian user profile
 *  - Auth state (isAuthenticated, isLoading)
 *  - Login / register / logout actions
 *  - Token bootstrap on app start
 *
 * Persisted to AsyncStorage via tokenStorage.
 * The user object is also cached so the UI can render before the
 * /auth/me network call returns.
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authService } from "../services/authService";
import { tokenStorage, setAuthFailureHandler } from "../services/api";
import useChildStore from "./useChildStore";

// User profile cached in SecureStore — contains PII (email, name, role)
// so it must not live in plain AsyncStorage (A02).
const USER_CACHE_KEY = "jasiri_user";

const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  user: null,
  isAuthenticated: false,
  isBootstrapping: true, // true until initial token check finishes
  error: null,

  // ── Actions ────────────────────────────────────────────────

  /**
   * Called once on app mount.
   * Restores cached user and validates the stored token.
   *
   * Distinguishes between offline errors (keep cached auth) and
   * auth errors (clear tokens and log out).
   */
  bootstrap: async () => {
    try {
      const token = await tokenStorage.getAccess();
      if (!token) {
        set({ isBootstrapping: false });
        return;
      }

      // Restore cached user immediately so UI renders fast
      const cached = await SecureStore.getItemAsync(USER_CACHE_KEY);
      if (cached) {
        set({ user: JSON.parse(cached), isAuthenticated: true });
      }

      // Validate token with a /me call
      const user = await authService.me();
      await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch (err) {
      const isOffline =
        err?.isNetworkError || err?.status === 0 || err?.status === 408;

      if (isOffline) {
        // Device is offline — keep the cached user authenticated.
        // Tokens are still valid; we just can't reach the server right now.
        // isAuthenticated was already set to true above if a cached user existed.
      } else {
        // Auth failure (401/403) or unrecoverable error — clear everything.
        await tokenStorage.clearTokens();
        await SecureStore.deleteItemAsync(USER_CACHE_KEY);
        set({ user: null, isAuthenticated: false });
      }
    } finally {
      set({ isBootstrapping: false });
    }
  },

  /**
   * Register a new guardian account and sign in.
   * @param {{ name, email, password, role }} data
   */
  register: async (data) => {
    set({ error: null });
    const result = await authService.register(data);
    await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(result.user));
    set({ user: result.user, isAuthenticated: true });
    return result.user;
  },

  /**
   * Log in with email + password.
   * @param {{ email, password }} credentials
   */
  login: async (credentials) => {
    set({ error: null });
    const result = await authService.login(credentials);
    await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(result.user));
    set({ user: result.user, isAuthenticated: true });
    return result.user;
  },

  /**
   * Log out and clear all local auth state.
   * Resets the child store to prevent data leakage between guardians.
   */
  logout: async () => {
    await authService.logout();
    await SecureStore.deleteItemAsync(USER_CACHE_KEY);
    await useChildStore.getState().reset();
    set({ user: null, isAuthenticated: false, error: null });
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

// Register the global auth failure handler ONCE after the store is created.
// When a token refresh fails (expired / revoked refresh token), the api client
// calls this to clear state and redirect the guardian back to login.
setAuthFailureHandler(async () => {
  await tokenStorage.clearTokens();
  await SecureStore.deleteItemAsync(USER_CACHE_KEY);
  await useChildStore.getState().reset();
  useAuthStore.setState({ user: null, isAuthenticated: false, error: null });
});

export default useAuthStore;
