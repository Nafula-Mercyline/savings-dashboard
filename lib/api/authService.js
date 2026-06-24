/**
 * lib/api/authService.js
 * Authentication Service Methods
 */

import api from "./client";

/**
 * Submits user login credentials to the backend application
 * Targets: POST http://localhost:5000/api/auth/login
 */
export async function login(email, password) {
  const data = await api.post("/auth/login", { email, password });

  // Save token context safely inside the browser window context
  if (data.success && data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
}

/**
 * Requests a forgot password recovery link
 * Targets: POST http://localhost:5000/api/routes/auth/forgot-password
 */
export async function forgotPassword(email) {
  return await api.post("/auth/forgot-password", { email });
}

/**
 * Purges active token sessions gracefully from client storage
 */
export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}