/**
 * lib/api/client.js
 * Core Fetch API Wrapper Client
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Single source of truth for key names ─────────────────────────────────────
// These MUST match authService.js exactly
export const TOKEN_KEY = "savings_token";
export const USER_KEY  = "savings_user";

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Core request function ────────────────────────────────────────────────────

async function request(endpoint, options = {}) {
  // 1. Read token using the shared key
  const token = getToken();

  // 2. Build headers
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  // 3. Make the request
  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (networkError) {
    throw new Error(
      "Cannot reach the server. Make sure your backend is running on port 5000."
    );
  }

  // 4. Handle 401 — session expired (skip on login endpoint itself)
  const isLoginEndpoint = endpoint === "/auth/login";
  if (response.status === 401 && !isLoginEndpoint) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  // 5. Handle 403 — wrong role
  if (response.status === 403) {
    throw new Error(
      "Access denied. You do not have permission to perform this action."
    );
  }

  // 6. Safe JSON parse (prevents crashes on HTML error pages)
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || `HTTP Error ${response.status}` };
  }

  // 7. Throw on HTTP errors
  if (!response.ok) {
    const error    = new Error(data.message || `HTTP error ${response.status}`);
    error.status   = response.status;
    error.errors   = data.errors || [];
    throw error;
  }

  return data;
}

// ─── HTTP method shortcuts ────────────────────────────────────────────────────

const api = {
  get:    (endpoint, options)       => request(endpoint, { ...options, method: "GET"    }),
  post:   (endpoint, body, options) => request(endpoint, { ...options, method: "POST",   body: JSON.stringify(body) }),
  put:    (endpoint, body, options) => request(endpoint, { ...options, method: "PUT",    body: JSON.stringify(body) }),
  delete: (endpoint, options)       => request(endpoint, { ...options, method: "DELETE" }),
};

export default api;
