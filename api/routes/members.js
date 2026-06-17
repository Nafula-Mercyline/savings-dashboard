/**
 * api/routes/members.js
 * Members Routes
 *
 * Base URL: /api/members
 *
 *   GET    /api/members                        — list all members
 *   GET    /api/members/:id                    — get a single member
 *   POST   /api/members                        — register a new member
 *   PUT    /api/members/:id                    — update member details
 *   DELETE /api/members/:id                    — deactivate a member
 *
 *   GET    /api/members/:id/profile            — full member profile (savings, loans, interest)
 *   GET    /api/members/:id/savings            — member saving accounts
 *   GET    /api/members/:id/loans              — member loans
 *   GET    /api/members/:id/transactions       — member transaction history
 *   GET    /api/members/:id/interest           — member interest records
 *   GET    /api/members/:id/statement          — member full financial statement
 *
 *   PUT    /api/members/:id/activate           — activate a member
 *   PUT    /api/members/:id/deactivate         — deactivate a member
 *   PUT    /api/members/:id/avatar             — update member avatar
 *
 *   GET    /api/members/search                 — search members
 *   GET    /api/members/stats                  — membership statistics
 */

const express = require("express");
const router  = express.Router();

const membersController = require("../controllers/membersController");
const auth              = require("../middleware/auth");
const roles             = require("../middleware/roles");
const validate          = require("../middleware/validate");
const {
  createMemberSchema,
  updateMemberSchema,
} = require("../validators/membersValidator");

// Apply auth to all member routes
router.use(auth);

// NOTE: static paths must come before /:id

// Search
router.get(
  "/search",
  roles(["admin", "treasurer", "secretary"]),
  membersController.searchMembers
);

// Stats
router.get(
  "/stats",
  roles(["admin", "treasurer"]),
  membersController.getMemberStats
);

// CRUD
router.get(
  "/",
  roles(["admin", "treasurer", "secretary"]),
  membersController.getAllMembers
);

router.get(
  "/:id",
  roles(["admin", "treasurer", "secretary"]),
  membersController.getMemberById
);

router.post(
  "/",
  roles(["admin", "secretary"]),
  validate(createMemberSchema),
  membersController.createMember
);

router.put(
  "/:id",
  roles(["admin", "secretary"]),
  validate(updateMemberSchema),
  membersController.updateMember
);

router.delete(
  "/:id",
  roles(["admin"]),
  membersController.deleteMember
);

// Profile and sub-resources
router.get("/:id/profile",      roles(["admin", "treasurer", "secretary"]), membersController.getMemberProfile);
router.get("/:id/savings",      roles(["admin", "treasurer", "secretary"]), membersController.getMemberSavings);
router.get("/:id/loans",        roles(["admin", "treasurer", "secretary"]), membersController.getMemberLoans);
router.get("/:id/transactions", roles(["admin", "treasurer", "secretary"]), membersController.getMemberTransactions);
router.get("/:id/interest",     roles(["admin", "treasurer"]),              membersController.getMemberInterest);
router.get("/:id/statement",    roles(["admin", "treasurer"]),              membersController.getMemberStatement);

// Status management
router.put("/:id/activate",   roles(["admin"]),              membersController.activateMember);
router.put("/:id/deactivate", roles(["admin"]),              membersController.deactivateMember);
router.put("/:id/avatar",     roles(["admin", "secretary"]), membersController.updateAvatar);

module.exports = router;



