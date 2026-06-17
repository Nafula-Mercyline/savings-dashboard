/**
 * lib/api/client.js
 *
 * Base API client for all requests to the Express backend.
 * Handles auth tokens, errors, and base URL automatically.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("savings_token");
}

export function setToken(token) {
  localStorage.setItem("savings_token", token);
}

export function removeToken() {
  localStorage.removeItem("savings_token");
  localStorage.removeItem("savings_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("savings_user"));
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem("savings_user", JSON.stringify(user));
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(method, endpoint, body = null, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Handle 401 — token expired or invalid
  if (response.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    error.errors = data.errors || [];
    throw error;
  }

  return data;
}

// ─── HTTP method shortcuts ────────────────────────────────────────────────────

export const api = {
  get:    (endpoint, options)       => request("GET",    endpoint, null, options),
  post:   (endpoint, body, options) => request("POST",   endpoint, body, options),
  put:    (endpoint, body, options) => request("PUT",    endpoint, body, options),
  delete: (endpoint, options)       => request("DELETE", endpoint, null, options),
};

export default api;
