/**
 * lib/api/authService.js
 * Authentication Service Methods
 */

import api, { TOKEN_KEY, USER_KEY, clearSession } from "./client";

/**
 * Login — POST /api/auth/login
 * Saves token and user to localStorage on success.
 */
export async function login(email, password) {
  const data = await api.post("/auth/login", { email, password });

  // Store using the SAME keys as client.js reads
  if (data.success && data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
  }

  return data;
}

/**
 * Logout — clears session and redirects to login
 */
export function logout() {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Get current logged-in user from localStorage
 */
export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

/**
 * Check if user is currently logged in
 */
export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(TOKEN_KEY);
}

/**
 * Forgot password — POST /api/auth/forgot-password
 */
export async function forgotPassword(email) {
  return api.post("/auth/forgot-password", { email });
}

/**
 * Get current user from backend — GET /api/auth/me
 */
export async function getMe() {
  return api.get("/auth/me");
}
