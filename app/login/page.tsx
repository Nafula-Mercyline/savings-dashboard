/**
 * app/login/page.tsx
 * SACCO Member Portal - Login & Forgot Password Interface
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, forgotPassword } from "../../lib/api/authService";

type AuthMode = "login" | "forgot-password";

// Define response shape to fix the TypeScript "does not exist" errors
interface ApiResponse {
    success: boolean;
    message?: string;
    token?: string;
    user?: any;
}

export default function LoginPage() {
    const router = useRouter();

    // UI State management 
    const [mode, setMode] = useState<AuthMode>("login");

    // 🔄 Auto-filled credentials configured for easier local development testing
    const [email, setEmail] = useState("member@sacco-domain.com");
    const [password, setPassword] = useState("SaccoSecure2026!");

    // Status feedback states
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Core submit interceptor
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            if (mode === "login") {
                const response = await login(email, password) as ApiResponse;

                if (response && response.success) {
                    router.push("/dashboard");
                    router.refresh();
                } else {
                    setError(response?.message || "Invalid credentials. Please verify your member email and password.");
                }
            } else {
                // Correctly calling updated forgotPassword service function
                const response = await forgotPassword(email) as ApiResponse;

                if (response && response.success) {
                    setSuccessMessage(response.message || "Password recovery instructions have been sent to your registered email address.");
                    setEmail("");
                } else {
                    setError(response?.message || "Unable to process password recovery. Please contact SACCO support.");
                }
            }
        } catch (err: any) {
            console.error(`[SACCO Auth Error during ${mode.toUpperCase()}]:`, err);

            if (err.message?.includes("404") || err.message?.includes("Route not found")) {
                setError("Connection Error: The authentication service endpoint could not be reached. Please verify the backend API server is fully running.");
            } else {
                setError(err.message || "An unexpected network error occurred. Please try again or contact management.");
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode((prev) => (prev === "login" ? "forgot-password" : "login"));
        setError(null);
        setSuccessMessage(null);
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "linear-gradient(135deg, #090d16 0%, #111827 100%)", fontFamily: "system-ui, -apple-system, sans-serif", padding: "1rem" }}>
            <form onSubmit={handleSubmit} style={{ background: "#ffffff", padding: "3rem 2.5rem", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", width: "100%", maxWidth: "420px" }}>

                {/* SACCO Branding Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", background: "#e0f2fe", color: "#0369a1", fontWeight: "bold", fontSize: "1.25rem", marginBottom: "0.75rem" }}>
                        🏛️
                    </div>
                    <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.025em" }}>
                        {mode === "login" ? "SACCO Member Portal" : "Forgot Password"}
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0, lineHeight: "1.5" }}>
                        {mode === "login" ? "Securely sign in to manage your savings, dividends, and loans" : "Provide your registered email to locate your member account"}
                    </p>
                </div>

                {/* Error Feedback Panel */}
                {error && (
                    <div style={{ background: "#fef2f2", color: "#991b1b", padding: "0.875rem", borderRadius: "6px", marginBottom: "1.25rem", fontSize: "0.85rem", borderLeft: "4px solid #dc2626", lineHeight: "1.5" }}>
                        <strong>System Error:</strong> {error}
                    </div>
                )}

                {/* Success Feedback Panel */}
                {successMessage && (
                    <div style={{ background: "#f0fdf4", color: "#166534", padding: "0.875rem", borderRadius: "6px", marginBottom: "1.25rem", fontSize: "0.85rem", borderLeft: "4px solid #16a34a", lineHeight: "1.5" }}>
                        <strong>Success:</strong> {successMessage}
                    </div>
                )}

                {/* Registered Email Input */}
                <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", color: "#334155", fontSize: "0.875rem", fontWeight: 600 }}>Registered Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: "0.75rem 0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem", color: "#0f172a", outlineColor: "#0284c7", boxSizing: "border-box" }}
                        placeholder="member@sacco-domain.com"
                    />
                </div>

                {/* Password Input Block */}
                {mode === "login" && (
                    <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <label style={{ color: "#334155", fontSize: "0.875rem", fontWeight: 600 }}>Account Password</label>
                            <button type="button" onClick={toggleMode} style={{ background: "none", border: "none", color: "#0284c7", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", padding: 0 }}>
                                Forgot Password?
                            </button>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={mode === "login"}
                            style={{ width: "100%", padding: "0.75rem 0.875rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem", color: "#0f172a", outlineColor: "#0284c7", boxSizing: "border-box" }}
                            placeholder="••••••••"
                        />
                    </div>
                )}

                {/* Security Compliance Disclaimer Note */}
                {mode === "login" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", color: "#64748b", fontSize: "0.75rem" }}>
                        🔒 <span>Authorized access only. All operations are strictly audited.</span>
                    </div>
                )}

                {/* Form Submission Button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{ width: "100%", padding: "0.875rem", background: loading ? "#94a3b8" : "#0284c7", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", marginTop: "1.75rem", transition: "background 0.2s ease", boxShadow: "0 4px 6px -1px rgba(2, 132, 199, 0.2)" }}
                >
                    {loading ? "Verifying Credentials..." : mode === "login" ? "Secure Sign In" : "Request Reset Authorization"}
                </button>

                {/* Mode Toggle Footer Switch */}
                {mode === "forgot-password" && (
                    <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                        <button type="button" onClick={toggleMode} style={{ background: "none", border: "none", color: "#475569", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}>
                            Return to Member Sign In
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}