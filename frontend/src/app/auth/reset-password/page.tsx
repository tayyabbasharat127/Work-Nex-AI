"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  
  // Get email and OTP from URL params (passed from verify-otp page)
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const otpFromQuery = useMemo(() => searchParams.get("otp") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!emailFromQuery || !otpFromQuery) {
      return setError("Missing email or OTP. Please restart the password reset process.");
    }

    if (!newPassword || !confirm)
      return setError("Please fill all password fields.");

    if (newPassword !== confirm) return setError("Passwords do not match!");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);

    try {
      const res = await resetPasswordApi({
        email: emailFromQuery,
        otp: otpFromQuery,
        new_password: newPassword,
      });

      setMessage(res.data?.message || "Password reset successfully.");
      setSuccess(true);

      // Auto-redirect to login after success
      setTimeout(() => window.location.href = "/auth/login", 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string, error?: string } }, message?: string };
      setError(e.response?.data?.message || e.message || "Failed to reset password");
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
              : "Enter your current and new password below."}
          </p>
        </div>

        {!success ? (
          <div className="reset-form">
            {/* New Password */}
            <div className="input-group">
              <label htmlFor="newPassword" className="input-label">
                New Password
              </label>
              <div className="input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input-field"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowNewPass(!showNewPass)}
                >
                  <EyeIcon open={showNewPass} />
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
                  placeholder="Confirm your new password"
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
