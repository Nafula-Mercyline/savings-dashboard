/**
 * api/controllers/membersController.js
 *
 * Thin HTTP layer — reads req, calls membersService, sends JSON.
 * No business logic lives here.
 */

const membersService = require("../services/membersService");

// ─── GET /api/members ─────────────────────────────────────────────────────────
exports.getAllMembers = async (req, res, next) => {
  try {
    const {
      status = "active",
      page   = 1,
      limit  = 20,
      search = "",
      sortBy = "createdAt",
      order  = "DESC",
    } = req.query;
    const data = await membersService.getAllMembers({
      status,
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      search,
      sortBy,
      order: order.toUpperCase() === "ASC" ? "ASC" : "DESC",
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id ─────────────────────────────────────────────────────
exports.getMemberById = async (req, res, next) => {
  try {
    const data = await membersService.getMemberById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── POST /api/members ────────────────────────────────────────────────────────
exports.createMember = async (req, res, next) => {
  try {
    const data = await membersService.createMember(req.body);
    res.status(201).json({ success: true, message: "Member registered successfully", data });
  } catch (err) { next(err); }
};

// ─── PUT /api/members/:id ─────────────────────────────────────────────────────
exports.updateMember = async (req, res, next) => {
  try {
    const data = await membersService.updateMember(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, message: "Member updated successfully", data });
  } catch (err) { next(err); }
};

// ─── DELETE /api/members/:id ──────────────────────────────────────────────────
exports.deleteMember = async (req, res, next) => {
  try {
    await membersService.deleteMember(req.params.id);
    res.json({ success: true, message: "Member deactivated successfully" });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id/profile ────────────────────────────────────────────
exports.getMemberProfile = async (req, res, next) => {
  try {
    const data = await membersService.getMemberProfile(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id/savings ─────────────────────────────────────────────
exports.getMemberSavings = async (req, res, next) => {
  try {
    const data = await membersService.getMemberSavings(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id/loans ───────────────────────────────────────────────
exports.getMemberLoans = async (req, res, next) => {
  try {
    const { status = "all" } = req.query;
    const data = await membersService.getMemberLoans(req.params.id, { status });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id/transactions ───────────────────────────────────────
exports.getMemberTransactions = async (req, res, next) => {
  try {
    const { type = "all", from, to, page = 1, limit = 20 } = req.query;
    const data = await membersService.getMemberTransactions(req.params.id, {
      type, from, to,
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id/interest ───────────────────────────────────────────
exports.getMemberInterest = async (req, res, next) => {
  try {
    const { type = "all", page = 1, limit = 20 } = req.query;
    const data = await membersService.getMemberInterest(req.params.id, {
      type,
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/:id/statement ──────────────────────────────────────────
exports.getMemberStatement = async (req, res, next) => {
  try {
    const now = new Date();
    const {
      from   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
      to     = now.toISOString().split("T")[0],
      format = "json",
    } = req.query;
    const data = await membersService.getMemberStatement(req.params.id, { from, to });
    if (format === "pdf") return res.json({ success: true, message: "PDF generation coming soon", data });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── PUT /api/members/:id/activate ───────────────────────────────────────────
exports.activateMember = async (req, res, next) => {
  try {
    const data = await membersService.activateMember(req.params.id, req.body);
    res.json({ success: true, message: "Member activated successfully", data });
  } catch (err) { next(err); }
};

// ─── PUT /api/members/:id/deactivate ─────────────────────────────────────────
exports.deactivateMember = async (req, res, next) => {
  try {
    const data = await membersService.deactivateMember(req.params.id, req.body);
    res.json({ success: true, message: "Member deactivated successfully", data });
  } catch (err) { next(err); }
};

// ─── PUT /api/members/:id/avatar ─────────────────────────────────────────────
exports.updateAvatar = async (req, res, next) => {
  try {
    const data = await membersService.updateAvatar(req.params.id, req.body.avatarUrl);
    res.json({ success: true, message: "Avatar updated successfully", data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/search ──────────────────────────────────────────────────
exports.searchMembers = async (req, res, next) => {
  try {
    const { q, status = "all", limit = 10 } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Search query (q) is required" });
    const data = await membersService.searchMembers({
      q, status, limit: Math.min(parseInt(limit), 50),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET /api/members/stats ───────────────────────────────────────────────────
exports.getMemberStats = async (req, res, next) => {
  try {
    const data = await membersService.getMemberStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};



