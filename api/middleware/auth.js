/**
 * api/middleware/auth.js
 *
 * JWT Authentication Middleware
 * Verifies the Bearer token on every protected route.
 * Attaches the decoded user payload to req.user.
 *
 * Usage in routes:
 *   router.use(auth);              — protect all routes in file
 *   router.get("/", auth, handler) — protect a single route
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. Check your .env file.");
}

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if the header is missing or malformed.
 */
function extractToken(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;

  return parts[1];
}

/**
 * auth middleware
 * Rejects requests without a valid JWT with 401.
 */
const auth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach decoded payload to request for downstream use
    req.user = {
      id:           decoded.id,
      email:        decoded.email,
      role:         decoded.role,
      memberNumber: decoded.memberNumber || null,
    };

    next();
  } catch (err) {
    // Distinguish between expired and invalid tokens
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        code:    "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token. Please log in again.",
      code:    "TOKEN_INVALID",
    });
  }
};

module.exports = auth;


