/**
 * api/routes/auth.js
 * Authentication Routes
 */

const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");

const { User } = require("../models/index");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "8h";

// ─── TEMP: Create test user ───────────────────────────────────────────────────
// Visit once: http://localhost:5000/api/auth/setup-test-user
// Then delete this route
router.get("/setup-test-user", async (req, res, next) => {
  try {
    await User.destroy({ where: { email: "admin@savings.com" } });

    const passwordHash = await bcrypt.hash("admin123", 12);

    const newUser = await User.create({
      firstName:    "Admin",
      lastName:     "User",
      email:        "admin@savings.com",
      passwordHash,
      role:         "admin",   // ← must be "admin" not roleId
      isActive:     true,
    });

    res.json({
      success: true,
      message: "Test user created! Login with admin@savings.com / admin123",
      user: {
        id:        newUser.id,
        firstName: newUser.firstName,
        lastName:  newUser.lastName,
        email:     newUser.email,
        role:      newUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both an email and a password.",
      });
    }

    // 2. Find user
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 3. Check account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Contact your administrator.",
      });
    }

    // 4. Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 5. Sign JWT — role must be in the payload for middleware to read it
    const token = jwt.sign(
      {
        id:    user.id,
        email: user.email,
        role:  user.role,   // ← "role" not "roleId"
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // 6. Update last login
    user.lastLoginAt = new Date();
    user.loginAttempts = 0;
    await user.save();

    // 7. Return token + safe user object
    return res.status(200).json({
      success: true,
      token,
      user: {
        id:        user.id,
        firstName: user.firstName,  // ← firstName not name
        lastName:  user.lastName,
        email:     user.email,
        role:      user.role,       // ← role not roleId
        avatarUrl: user.avatarUrl || null,
      },
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    // Always return success to avoid user enumeration
    return res.status(200).json({
      success: true,
      message: "If that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findByPk(decoded.id, {
      attributes: ["id", "firstName", "lastName", "email", "role", "avatarUrl"],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
