/**
 * API Client
 *
 * Centralized fetch wrapper that handles:
 *  - Auth header injection
 *  - Automatic token refresh on 401
 *  - Consistent error normalization
 *  - Offline detection
 *  - Timeout (10 s) to avoid hanging on poor connectivity
 *
 * Security: auth tokens are stored in expo-secure-store (OS keychain / Keystore)
 * so they are encrypted at rest and inaccessible to other apps.
 */

import * as SecureStore from "expo-secure-store";
import { API_PREFIX } from "../config/api";

const TIMEOUT_MS = 10_000;
// SecureStore keys must match [A-Za-z0-9._-] only, max 256 chars
const TOKEN_KEY = "jasiri_access_token";
const REFRESH_KEY = "jasiri_refresh_token";

// ── Global auth failure handler ───────────────────────────────────────────────
// Registered by useAuthStore so that a failed token refresh triggers an
// automatic logout and navigation back to the login screen.
let _onAuthFailure = null;

/**
 * Register a callback to be invoked when a token refresh fails fatally.
 * Called once at app boot by useAuthStore.
 * @param {() => void} handler
 */
export function setAuthFailureHandler(handler) {
  _onAuthFailure = handler;
}

// ── Token storage helpers ──────────────────────────────────────────────────────
// Tokens are stored encrypted in the OS keychain (iOS) / Keystore (Android).
// This protects against backup extraction and other-app reads (A02).

export const tokenStorage = {
  async getAccess() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(accessToken, refreshToken) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
  },
  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

// ── Refresh logic ─────────────────────────────────────────────────────────────

let isRefreshing = false;
let pendingRequests = [];

async function attemptRefresh() {
  const refreshToken = await tokenStorage.getRefresh();
  if (!refreshToken) throw new Error("No refresh token available");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_PREFIX}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    await tokenStorage.clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const json = await res.json();
  const { accessToken, refreshToken: newRefresh } = json.data;
  await tokenStorage.setTokens(accessToken, newRefresh);
  return accessToken;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * Make an authenticated request to the JASIRI backend.
 *
 * @param {string} path          - Relative path, e.g. "/children"
 * @param {RequestInit} options  - fetch options
 * @param {boolean} withAuth     - Attach Authorization header (default true)
 */
export async function apiRequest(path, options = {}, withAuth = true) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = {
      ...(options._isUpload ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };

    if (withAuth) {
      const token = await tokenStorage.getAccess();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const url = `${API_PREFIX}${path}`;
    let res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // Token expired — try refresh once
    if (res.status === 401 && withAuth) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        await new Promise((resolve, reject) =>
          pendingRequests.push({ resolve, reject }),
        );
        const newToken = await tokenStorage.getAccess();
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } else {
        isRefreshing = true;
        try {
          const newToken = await attemptRefresh();
          pendingRequests.forEach((p) => p.resolve());
          headers.Authorization = `Bearer ${newToken}`;
          res = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          });
        } catch (refreshErr) {
          pendingRequests.forEach((p) => p.reject(refreshErr));
          // Notify the auth store so it can clear state and redirect to login
          _onAuthFailure?.();
          throw refreshErr;
        } finally {
          isRefreshing = false;
          pendingRequests = [];
        }
      }
    }

    // Parse response
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        (isJson && (body?.message || body?.error)) ||
        `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.code = isJson ? body?.code : null;
      err.errors = isJson ? body?.errors : null;
      throw err;
    }

    return body;
  } catch (err) {
    if (err.name === "AbortError") {
      const timeout = new Error(
        "Request timed out. Check your internet connection.",
      );
      timeout.status = 408;
      throw timeout;
    }
    // Network failure
    if (!err.status) {
      const network = new Error(
        "Cannot connect to server. You may be offline.",
      );
      network.status = 0;
      network.isNetworkError = true;
      throw network;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Convenience methods ───────────────────────────────────────────────────────

export const api = {
  get: (path, { withAuth = true, ...options } = {}) =>
    apiRequest(path, { method: "GET", ...options }, withAuth),

  post: (path, body, { withAuth = true, ...options } = {}) =>
    apiRequest(
      path,
      { method: "POST", body: JSON.stringify(body), ...options },
      withAuth,
    ),

  patch: (path, body, { withAuth = true, ...options } = {}) =>
    apiRequest(
      path,
      { method: "PATCH", body: JSON.stringify(body), ...options },
      withAuth,
    ),

  delete: (path, { withAuth = true, ...options } = {}) =>
    apiRequest(path, { method: "DELETE", ...options }, withAuth),

  /**
   * Upload multipart form data (artwork, files).
   * Omits Content-Type so fetch sets it automatically with the multipart boundary.
   */
  upload: (path, formData, { withAuth = true } = {}) =>
    apiRequest(
      path,
      { method: "POST", body: formData, _isUpload: true },
      withAuth,
    ),
};
