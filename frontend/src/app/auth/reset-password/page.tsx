"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./page.scss";
import { resetPasswordApi } from "@/src/api/api";

// Eye icon toggle
const EyeIcon = ({ open }: { open: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.29 21.29 0 0 1 5.08-6.64" />
        <path d="M1 1l22 22" />
      </>
    )}
  </svg>
);

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If you redirected like: /auth/reset-password?email=...
  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!email) return setError("Email is required.");
    if (!otp) return setError("OTP is required.");
    if (!password || !confirm) return setError("Please fill both password fields.");
    if (password !== confirm) return setError("Passwords do not match!");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);

    try {
      // Backend endpoint: POST /api/auth/reset-password
      // Typical payload: { email, otp, newPassword }
      const res = await resetPasswordApi({
        email,
        otp,
        newPassword: password,
      });

      setMessage(res.data?.message || "Password updated successfully.");
      setSuccess(true);

      // Optional: auto-redirect after success
      // setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Reset password failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-card">
        <div className="reset-header">
          <h1 className="title">
            {success ? "Password Reset Successful" : "Reset Password"}
          </h1>
          <p className="subtitle">
            {success
              ? "Your password has been successfully updated."
              : "Enter the OTP and your new password below."}
          </p>
        </div>

        {!success ? (
          <div className="reset-form">
            {/* Email (optional editable) */}
            <div className="input-group">
              <label htmlFor="email" className="input-label">
                Email
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-field"
                />
              </div>
            </div>

            {/* OTP */}
            <div className="input-group">
              <label htmlFor="otp" className="input-label">
                OTP
              </label>
              <div className="input-wrapper">
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="input-field"
                />
              </div>
            </div>

            {/* New Password */}
            <div className="input-group">
              <label htmlFor="password" className="input-label">
                New Password
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input-field"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPass(!showPass)}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group">
              <label htmlFor="confirm" className="input-label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  className="input-field"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              className={`submit-button ${loading ? "loading" : ""}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Updating...
                </>
              ) : (
                "Reset Password"
              )}
              <span className="button-glow"></span>
            </button>

            {/* Messages */}
            {error && <p className="error-text">{error}</p>}
            {message && !error && <p className="success-text">{message}</p>}

            <a href="/auth/login" className="back-link">
              ← Back to Login
            </a>
          </div>
        ) : (
          <div className="success-message">
            <p>You can now log in with your new password.</p>
            <a
              href="/auth/login"
              className="submit-button"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
