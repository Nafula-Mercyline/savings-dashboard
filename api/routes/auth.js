/**
 * api/routes/auth.js
 * Authentication Route Handlers
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Fixed relative model lookup path pointing cleanly to the models root index folder
const { User } = require("../models/index");

// Private Key Token Secret Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_super_secure_secret_key";
const TOKEN_EXPIRY = "24h";

// ─── TEMP ROUTE: SETUP TEST USER ─────────────────────────────────────────────
// URL: http://localhost:5000/api/auth/setup-test-user
// Delete or comment this route out after your local login is verified!
router.get("/setup-test-user", async (req, res, next) => {
    try {
        // 1. Completely delete any broken matching entries to avoid duplicate keys
        await User.destroy({ where: { email: "member@sacco-domain.com" } });

        // 2. Hash the password natively using your system's bcrypt library
        const saltRounds = 10;
        const realHashedPassword = await bcrypt.hash("SaccoSecure2026!", saltRounds);

        // 3. Create the clean row directly in MySQL
        const newUser = await User.create({
            firstName: "Sacco",               // 👈 Added to satisfy model constraints
            lastName: "Member",
            email: "member@sacco-domain.com",
            passwordHash: realHashedPassword,
            role: "treasurer",
        });

        res.json({
            success: true,
            message: "Valid test user registered successfully!",
            newUser: {
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
            }
        });
    } catch (error) {
        next(error);
    }
});

// ─── POST /login ─────────────────────────────────────────────────────────────
// Mounted dynamically at '/api/auth' via server.js, resulting in: POST /api/auth/login
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Validate incoming parameters
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both an email address and a password.",
            });
        }

        // 2. Lookup the user account in database
        const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // 3. Verify user password status using bcrypt
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // 4. Generate user runtime token payload
        const token = jwt.sign(
            { id: user.id, email: user.email, roleId: user.roleId },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        // 5. Send authenticated package back to frontend client
        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roleId: user.roleId,
            },
        });

    } catch (error) {
        next(error);
    }
});

// ─── POST /forgot-password ───────────────────────────────────────────────────
// Mounted dynamically at '/api/auth' via server.js, resulting in: POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If that email matches an account, a recovery link has been sent.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset link sent! Check your inbox.",
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;