/**
 * api/middleware/roles.js
 *
 * Role-Based Access Control (RBAC) Middleware
 * Must be used AFTER the auth middleware (requires req.user).
 *
 * Supported roles (in descending privilege order):
 *   admin      — full access to everything
 *   treasurer  — financial data: savings, loans, interest, reports
 *   secretary  — member management, read-only transactions
 *   member     — own data only (future use)
 *
 * Usage in routes:
 *   router.get("/", roles(["admin", "treasurer"]), handler);
 *   router.post("/", roles(["admin"]), handler);
 */

/**
 * Role hierarchy — higher index = more privilege.
 * Used to support "at least this level" checks if needed later.
 */
const ROLE_HIERARCHY = {
    member:    0,
    secretary: 1,
    treasurer: 2,
    admin:     3,
  };
  
  /**
   * roles(allowedRoles)
   * Returns a middleware that allows only the listed roles.
   *
   * @param {string[]} allowedRoles — array of role strings
   *
   * @example
   *   router.delete("/:id", roles(["admin"]), controller.delete);
   *   router.get("/",       roles(["admin", "treasurer", "secretary"]), controller.list);
   */
  const roles = (allowedRoles = []) => {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      throw new Error("roles() requires a non-empty array of allowed roles.");
    }
  
    // Validate at startup that all listed roles are known
    allowedRoles.forEach((role) => {
      if (ROLE_HIERARCHY[role] === undefined) {
        throw new Error(`Unknown role "${role}" in roles() middleware.`);
      }
    });
  
    return (req, res, next) => {
      // auth middleware must run first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please log in.",
        });
      }
  
      const { role } = req.user;
  
      // Unknown role in token payload
      if (ROLE_HIERARCHY[role] === undefined) {
        return res.status(403).json({
          success: false,
          message: "Your account has an unrecognised role. Please contact support.",
        });
      }
  
      // Check if the user's role is in the allowed list
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(", ")}.`,
          yourRole: role,
        });
      }
  
      next();
    };
  };
  
  /**
   * isAdmin helper — shorthand for roles(["admin"])
   * Usage: router.delete("/:id", isAdmin, handler);
   */
  const isAdmin = roles(["admin"]);
  
  /**
   * isTreasurer helper — shorthand for roles(["admin", "treasurer"])
   */
  const isTreasurer = roles(["admin", "treasurer"]);
  
  /**
   * isSecretary helper — shorthand for roles(["admin", "secretary"])
   */
  const isSecretary = roles(["admin", "secretary"]);
  
  /**
   * isStaff helper — all staff roles (admin, treasurer, secretary)
   */
  const isStaff = roles(["admin", "treasurer", "secretary"]);
  
  module.exports        = roles;
  module.exports.isAdmin     = isAdmin;
  module.exports.isTreasurer = isTreasurer;
  module.exports.isSecretary = isSecretary;
  module.exports.isStaff     = isStaff;
  module.exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
  


