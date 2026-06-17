/**
 * lib/api/authService.js
 * Authentication API calls
 */

import api, { setToken, setUser, removeToken } from "./client";

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const data = await api.post("/auth/login", { email, password });
  setToken(data.token);
  setUser(data.user);
  return data;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function logout() {
  removeToken();
  window.location.href = "/login";
}

// ─── Get current user ─────────────────────────────────────────────────────────
export async function getMe() {
  return api.get("/auth/me");
}

// ─── Change password ─────────────────────────────────────────────────────────
export async function changePassword(currentPassword, newPassword) {
  return api.put("/auth/change-password", { currentPassword, newPassword });
}

// ─── Request password reset ───────────────────────────────────────────────────
export async function requestPasswordReset(email) {
  return api.post("/auth/forgot-password", { email });
}

// ─── Reset password with token ───────────────────────────────────────────────
export async function resetPassword(token, newPassword) {
  return api.post("/auth/reset-password", { token, newPassword });
}
