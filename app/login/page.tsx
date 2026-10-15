/**
 * app/login/page.tsx
 * SACCO Member Portal - Login & Forgot Password Interface
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, forgotPassword } from "../../lib/api/authService";
import {
  Landmark,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type AuthMode = "login" | "forgot-password";

interface ApiResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: any;
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");

  // Both fields start empty on purpose: this page is public, so it must not
  // show an account email or password to visitors.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const response = (await login(email.trim().toLowerCase(), password)) as ApiResponse;

        if (response && response.success) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(
            response?.message ||
            "Invalid credentials. Please verify your member email and password."
          );
        }
      } else {
        const response = (await forgotPassword(email.trim().toLowerCase())) as ApiResponse;

        if (response && response.success) {
          setSuccessMessage(
            response.message ||
            "Password recovery instructions have been sent to your registered email address."
          );
          setEmail("");
        } else {
          setError(
            response?.message ||
            "Unable to process password recovery. Please contact SACCO support."
          );
        }
      }
    } catch (err: any) {
      console.error(`[SACCO Auth Error during ${mode.toUpperCase()}]:`, err);

      if (err.message?.includes("404") || err.message?.includes("Route not found")) {
        setError(
          "Connection error: the authentication service endpoint could not be reached. Please verify the backend API server is running."
        );
      } else {
        setError(err.message || "An unexpected network error occurred. Please try again.");
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

  const inputCls =
    "w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition placeholder-gray-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10 relative overflow-hidden">
      {/* Ambient background accent */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-amber-400/5 blur-3xl" />

      <div className="w-full max-w-md relative">
        {/* Brand mark, outside the card */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Landmark size={22} className="text-white" />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-300 tracking-wide">
            Nurses Quatres Savings &amp; Credit Co-op
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-2xl shadow-black/40 border border-gray-100 p-8"
        >
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {mode === "login" ? "Member Portal Sign In" : "Reset Your Password"}
            </h1>
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
              {mode === "login"
                ? "Sign in to manage your savings, dividends, and loans"
                : "Enter your registered email and we'll send reset instructions"}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3.5 py-3 mb-5 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3.5 py-3 mb-5 text-sm">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Registered Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputCls}
                placeholder="Enter your registered email"
              />
            </div>
          </div>

          {mode === "login" && (
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={mode === "login"}
                  autoComplete="current-password"
                  className={`${inputCls} pr-10`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold text-sm transition-colors shadow-sm shadow-amber-500/20"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? mode === "login"
                ? "Signing in…"
                : "Sending instructions…"
              : mode === "login"
                ? "Sign In"
                : "Send Reset Instructions"}
          </button>

          {mode === "forgot-password" && (
            <button
              type="button"
              onClick={toggleMode}
              className="w-full mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={14} /> Back to sign in
            </button>
          )}

          {mode === "login" && (
            <div className="flex items-center justify-center gap-1.5 mt-6 pt-5 border-t border-gray-100 text-gray-400 text-xs">
              <ShieldCheck size={13} />
              <span>Authorized access only. All activity is audited.</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

