/**
 * lib/api/client.js
 * Core Fetch API Wrapper Client
 */
/**
 * Submits user login credentials to the backend application
 * Targets: POST http://localhost:5000/api/routes/auth/login
 */
const BASE_URL = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  // 1. Retrieve the saved token from localStorage safely
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token");
  }

  // 2. Setup standard request headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 3. Append Authorization Bearer token if present
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // 4. Handle global 401 Unauthorized errors (Skip on initial login attempts)
  // Accommodates variations of endpoints routed via /api/auth
  const isLoginEndpoint = endpoint === "/auth/login" || endpoint === "/login";

  if (response.status === 401 && !isLoginEndpoint) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized session expired.");
  }

  // 5. Safe Body Parsing Block (Prevents HTML 404/500 pages from crashing JSON.parse)
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    console.warn("[API Client] Response body was not valid JSON:", parseError);
    // If it's plain text or HTML, capture it as the message fallback
    data = { message: text || `HTTP Error Status: ${response.status}` };
  }

  // 6. HTTP Error Status Check
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data;
}

const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: "DELETE" }),
};

export default api;