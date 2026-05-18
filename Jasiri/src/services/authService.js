/**
 * Auth Service
 * Wraps backend /auth endpoints
 */

import { api, tokenStorage } from "./api";

export const authService = {
  /**
   * Register a new guardian account.
   * @param {{ name: string, email: string, password: string, role: string }} data
   */
  async register(data) {
    const res = await api.post("/auth/register", data, { withAuth: false });
    await tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
    return res.data;
  },

  /**
   * Log in with email + password.
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials) {
    const res = await api.post("/auth/login", credentials, { withAuth: false });
    await tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
    return res.data;
  },

  /**
   * Fetch the current authenticated user profile.
   */
  async me() {
    const res = await api.get("/auth/me");
    return res.data;
  },

  /**
   * Log out and clear stored tokens.
   */
  async logout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Best-effort — always clear local tokens
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  /**
   * Request a verification OTP to be sent to the authenticated guardian's email.
   */
  async sendVerification() {
    const res = await api.post("/auth/send-verification", {});
    return res.data;
  },

  /**
   * Submit the 6-digit OTP to verify the guardian's email address.
   * @param {string} otp - 6-digit code from the email
   */
  async verifyEmail(otp) {
    const res = await api.post("/auth/verify-email", { otp });
    return res.data;
  },
};
