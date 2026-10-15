/**
 * api/middleware/errorHandler.js
 *
 * Global Error Handler Middleware
 * Must be registered LAST in app.js after all routes:
 *   app.use(errorHandler);
 *
 * Catches every error passed via next(err) from controllers/services,
 * normalises it, and returns a consistent JSON error response.
 *
 * Never leaks stack traces to clients in production.
 */

const IS_PROD = process.env.NODE_ENV === "production";

// ─── Known error type handlers ────────────────────────────────────────────────

/**
 * Sequelize Validation Error
 * Thrown when a model constraint fails (e.g. unique, not null).
 */
function handleSequelizeValidationError(err) {
  const errors = err.errors.map((e) => ({
    field:   e.path,
    message: e.message,
  }));
  return {
    status:  422,
    message: "Database validation failed.",
    errors,
  };
}

/**
 * Sequelize Unique Constraint Error
 * Thrown when a unique index is violated (e.g. duplicate email).
 */
function handleSequelizeUniqueError(err) {
  const fields = err.errors.map((e) => e.path).join(", ");
  return {
    status:  409,
    message: `A record with the same ${fields} already exists.`,
    errors:  err.errors.map((e) => ({ field: e.path, message: e.message })),
  };
}

/**
 * Sequelize Foreign Key Constraint Error
 * Thrown when a referenced record doesn't exist.
 */
function handleSequelizeForeignKeyError() {
  return {
    status:  400,
    message: "A referenced record does not exist. Please check your input.",
  };
}

/**
 * JSON Parse Error
 * Thrown when the client sends malformed JSON in the request body.
 */
function handleSyntaxError() {
  return {
    status:  400,
    message: "Invalid JSON in request body. Please check your payload.",
  };
}

// ─── Error classifier ─────────────────────────────────────────────────────────

function classifyError(err) {
  // Manual errors thrown with Object.assign(new Error(...), { status: 4xx })
  if (err.status && err.status >= 400 && err.status < 600) {
    return { status: err.status, message: err.message };
  }

  // Sequelize error types
  if (err.name === "SequelizeValidationError") {
    return handleSequelizeValidationError(err);
  }
  if (err.name === "SequelizeUniqueConstraintError") {
    return handleSequelizeUniqueError(err);
  }
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return handleSequelizeForeignKeyError();
  }
  if (err.name === "SequelizeDatabaseError") {
    return { status: 500, message: "A database error occurred." };
  }
  if (err.name === "SequelizeConnectionError" ||
      err.name === "SequelizeConnectionRefusedError") {
    return { status: 503, message: "Database connection failed. Please try again shortly." };
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return handleSyntaxError();
  }

  // JWT errors (in case auth middleware passes them through)
  if (err.name === "JsonWebTokenError") {
    return { status: 401, message: "Invalid token." };
  }
  if (err.name === "TokenExpiredError") {
    return { status: 401, message: "Session expired. Please log in again." };
  }

  // Unknown — treat as 500
  return {
    status:  500,
    message: "An unexpected error occurred. Please try again or contact support.",
  };
}

// ─── The middleware ───────────────────────────────────────────────────────────

/**
 * errorHandler(err, req, res, next)
 * Express requires all 4 parameters to recognise this as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log the full error server-side
  console.error({
    timestamp: new Date().toISOString(),
    method:    req.method,
    url:       req.originalUrl,
    error:     err.message,
    stack:     IS_PROD ? undefined : err.stack,
  });

  const { status, message, errors } = classifyError(err);

  const body = {
    success: false,
    message,
  };

  // Include field-level errors when available (validation errors)
  if (errors && errors.length) {
    body.errors = errors;
  }

  // Include stack trace in development for easier debugging
  if (!IS_PROD && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};

module.exports = errorHandler;


// ─── 404 Handler ──────────────────────────────────────────────────────────────
// Register this just BEFORE errorHandler in app.js for unknown routes.
//   app.use(notFound);
//   app.use(errorHandler);

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports.notFound = notFound;


