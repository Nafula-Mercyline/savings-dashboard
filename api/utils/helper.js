/**
 * api/utils/helpers.js
 *
 * General-purpose helper functions used across the API:
 * ID generation, pagination, query building, data transforms,
 * async wrappers, and security utilities.
 *
 * No external dependencies except Node.js built-ins.
 */

const crypto = require("crypto");

// ─── ID & Reference Generators ───────────────────────────────────────────────

/**
 * Generates a unique reference number for a given entity prefix.
 * generateRef("SAV") → "SAV-2026-48392"
 * generateRef("LN")  → "LN-2026-91047"
 *
 * @param {string} prefix — e.g. "SAV", "LN", "TXN", "MBR", "INT"
 * @returns {string}
 */
function generateRef(prefix) {
  const year   = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${suffix}`;
}

/**
 * Generates a sequential member number from the current count.
 * generateMemberNumber(42) → "MBR-2026-00043"
 *
 * @param {number} currentCount — total existing members
 */
function generateMemberNumber(currentCount) {
  const year = new Date().getFullYear();
  const seq  = String((currentCount || 0) + 1).padStart(5, "0");
  return `MBR-${year}-${seq}`;
}

/**
 * Generates a cryptographically secure random token.
 * Useful for password resets, email verification, API keys.
 * generateToken() → "a3f9c1d7b2e8..."  (64-char hex)
 *
 * @param {number} bytes — default 32 (produces 64-char hex string)
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hashes a token with SHA-256 for safe storage.
 * Store the hash; compare against a fresh hash of the incoming token.
 *
 * @param {string} token — raw token string
 * @returns {string} — hex digest
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/**
 * Builds a pagination metadata object.
 * buildPagination(214, 2, 20) → { total, page, limit, totalPages, hasNext, hasPrev }
 *
 * @param {number} total  — total record count
 * @param {number} page   — current page (1-indexed)
 * @param {number} limit  — records per page
 */
function buildPagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Computes the Sequelize offset from page and limit.
 * pageOffset(3, 20) → 40
 *
 * @param {number} page
 * @param {number} limit
 */
function pageOffset(page, limit) {
  return (Math.max(1, page) - 1) * limit;
}

/**
 * Sanitises and clamps pagination query params.
 * parsePagination({ page: "2", limit: "200" }) → { page: 2, limit: 100 }
 *
 * @param {Object} query        — req.query object
 * @param {number} maxLimit     — maximum allowed limit (default: 100)
 * @param {number} defaultLimit — default limit (default: 20)
 */
function parsePagination(query, maxLimit = 100, defaultLimit = 20) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: pageOffset(page, limit) };
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

/**
 * Returns { start, end } Date objects for a named period.
 * Supports: "today", "this_week", "this_month", "last_month",
 *           "this_quarter", "last_quarter", "ytd", "custom"
 *
 * @param {string} period
 * @param {string} from   — YYYY-MM-DD (required for "custom")
 * @param {string} to     — YYYY-MM-DD (required for "custom")
 */
function getPeriodRange(period, from, to) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const d   = now.getDate();

  switch (period) {
    case "today":
      return { start: new Date(y, m, d, 0, 0, 0), end: now };

    case "this_week": {
      const dayOfWeek = now.getDay();
      return { start: new Date(y, m, d - dayOfWeek, 0, 0, 0), end: now };
    }

    case "last_month":
      return {
        start: new Date(y, m - 1, 1),
        end:   new Date(y, m, 0, 23, 59, 59),
      };

    case "this_quarter": {
      const q = Math.floor(m / 3);
      return { start: new Date(y, q * 3, 1), end: now };
    }

    case "last_quarter": {
      const q  = Math.floor(m / 3) - 1;
      const qy = q < 0 ? y - 1 : y;
      const qa = ((q + 4) % 4);
      return {
        start: new Date(qy, qa * 3, 1),
        end:   new Date(qy, qa * 3 + 3, 0, 23, 59, 59),
      };
    }

    case "ytd":
      return { start: new Date(y, 0, 1), end: now };

    case "custom":
      if (!from || !to) throw Object.assign(
        new Error("from and to are required for custom period"), { status: 400 }
      );
      return { start: new Date(from), end: new Date(`${to}T23:59:59`) };

    case "this_month":
    default:
      return { start: new Date(y, m, 1), end: now };
  }
}

/**
 * Builds a Sequelize createdAt range filter from { start, end }.
 * buildDateFilter(range) → { createdAt: { [Op.between]: [...] } }
 *
 * @param {Object} range — { start: Date, end: Date }
 */
function buildDateFilter(range) {
  const { Op } = require("sequelize");
  if (!range) return {};
  return { createdAt: { [Op.between]: [range.start, range.end] } };
}

// ─── Object Utilities ─────────────────────────────────────────────────────────

/**
 * Picks only the specified keys from an object.
 * pick({ a: 1, b: 2, c: 3 }, ["a", "c"]) → { a: 1, c: 3 }
 *
 * @param {Object}   obj
 * @param {string[]} keys
 */
function pick(obj, keys) {
  if (!obj || typeof obj !== "object") return {};
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) acc[key] = obj[key];
    return acc;
  }, {});
}

/**
 * Omits the specified keys from an object.
 * omit({ a: 1, b: 2, c: 3 }, ["b"]) → { a: 1, c: 3 }
 *
 * @param {Object}   obj
 * @param {string[]} keys
 */
function omit(obj, keys) {
  if (!obj || typeof obj !== "object") return {};
  return Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key)) acc[key] = obj[key];
    return acc;
  }, {});
}

/**
 * Returns true if a value is not null, undefined, or empty string.
 * isPresent(0) → true   isPresent("") → false   isPresent(null) → false
 *
 * @param {*} value
 */
function isPresent(value) {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Removes undefined and null values from an object (shallow).
 * compact({ a: 1, b: null, c: undefined, d: 0 }) → { a: 1, d: 0 }
 *
 * @param {Object} obj
 */
function compact(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  );
}

/**
 * Deep-clones a plain object (JSON-safe values only).
 * deepClone({ a: { b: 1 } }) → new object, no reference sharing
 *
 * @param {Object} obj
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Array Utilities ──────────────────────────────────────────────────────────

/**
 * Groups an array of objects by a key.
 * groupBy([{type:"dep",...},{type:"dep",...},{type:"with",...}], "type")
 * → { dep: [...], with: [...] }
 *
 * @param {Object[]} arr
 * @param {string}   key
 */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
}

/**
 * Sums the values of a key across an array of objects.
 * sumBy([{ amount: 100 }, { amount: 200 }], "amount") → 300
 *
 * @param {Object[]} arr
 * @param {string}   key
 */
function sumBy(arr, key) {
  return arr.reduce((total, item) => total + (parseFloat(item[key]) || 0), 0);
}

/**
 * Chunks an array into subarrays of a given size.
 * chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
 *
 * @param {Array}  arr
 * @param {number} size
 */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Async Utilities ──────────────────────────────────────────────────────────

/**
 * Wraps an async Express handler to automatically forward errors to next().
 * Removes the need for try/catch in every controller.
 *
 * Usage:
 *   router.get("/", asyncHandler(async (req, res) => {
 *     const data = await someService.getData();
 *     res.json({ success: true, data });
 *   }));
 *
 * @param {Function} fn — async Express handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Runs an array of async functions sequentially (not in parallel).
 * Useful when order matters or you need to avoid DB race conditions.
 *
 * @param {Function[]} tasks — array of () => Promise functions
 * @returns {Promise<Array>} — array of results in order
 */
async function sequential(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

/**
 * Retries an async function up to maxAttempts times with a delay.
 * Useful for flaky external calls (mailer, SMS gateway).
 *
 * @param {Function} fn          — async function to retry
 * @param {number}   maxAttempts — default 3
 * @param {number}   delayMs     — ms between retries (default: 500)
 */
async function retry(fn, maxAttempts = 3, delayMs = 500) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

// ─── Security Utilities ───────────────────────────────────────────────────────

/**
 * Sanitises a string for safe use in logs (strips control characters).
 *
 * @param {string} str
 */
function sanitizeLog(str) {
  if (typeof str !== "string") return String(str);
  return str.replace(/[\r\n\t]/g, " ").substring(0, 500);
}

/**
 * Validates that a given string is a safe positive integer ID.
 * isSafeId("42")    → true
 * isSafeId("abc")   → false
 * isSafeId("-1")    → false
 *
 * @param {*} value
 */
function isSafeId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/**
 * Creates a standardised API success response object.
 * success({ data, message, meta }) → { success: true, message, data, meta }
 *
 * @param {Object} payload
 */
function successResponse({ data, message = "Success", meta } = {}) {
  const res = { success: true, message };
  if (data  !== undefined) res.data = data;
  if (meta  !== undefined) res.meta = meta;
  return res;
}

/**
 * Creates a standardised API error object.
 * appError("Member not found", 404) → Error with .status = 404
 *
 * @param {string} message
 * @param {number} status  — HTTP status code (default: 500)
 */
function appError(message, status = 500) {
  return Object.assign(new Error(message), { status });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // ID & reference
  generateRef,
  generateMemberNumber,
  generateToken,
  hashToken,

  // Pagination
  buildPagination,
  pageOffset,
  parsePagination,

  // Dates
  getPeriodRange,
  buildDateFilter,

  // Objects
  pick,
  omit,
  isPresent,
  compact,
  deepClone,

  // Arrays
  groupBy,
  sumBy,
  chunk,

  // Async
  asyncHandler,
  sequential,
  retry,

  // Security / response
  sanitizeLog,
  isSafeId,
  successResponse,
  appError,
};


