"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import { changePasswordApi } from "@/src/api/api";

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

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!oldPassword || !newPassword || !confirm)
      return setError("Please fill all password fields.");

    if (newPassword !== confirm) return setError("Passwords do not match!");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);

    try {
      const res = await changePasswordApi({
        oldPassword,
        newPassword,
      });

      setMessage(res.data?.message || "Password updated successfully.");
      setSuccess(true);

      // Optional auto-redirect after success
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
              : "Enter your current and new password below."}
          </p>
        </div>

        {!success ? (
          <div className="reset-form">
            {/* Old Password */}
            <div className="input-group">
              <label htmlFor="oldPassword" className="input-label">
                Current Password
              </label>
              <div className="input-wrapper">
                <input
                  id="oldPassword"
                  type={showOldPass ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="input-field"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowOldPass(!showOldPass)}
                >
                  <EyeIcon open={showOldPass} />
                </button>
              </div>
            </div>

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
