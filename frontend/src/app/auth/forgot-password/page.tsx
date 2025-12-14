"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "./page.scss";

// Simple Mail Icon
const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M20 4H4a2 2 0 0 0-2 2v12a2 
      2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 
      2 0 0 0-2-2zm0 4l-8 5-8-5V6l8 5 
      8-5v2z"
    />
  </svg>
);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (!email) return alert("Please enter your email address.");
    setLoading(true);

    // simulate sending email, then redirect to OTP
    setTimeout(() => {
      console.log("Password reset link (OTP) sent to:", email);
      setLoading(false);

      // ✅ Redirect to OTP page
      router.push("/auth/verify-otp");
    }, 1500);
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <div className="forgot-header">
          <h1 className="title">Forgot Password</h1>
          <p className="subtitle">
            Enter your email and we’ll send you a password reset link.
          </p>
        </div>

        <div className="forgot-form">
          <div className="input-group">
            <label htmlFor="email" className="input-label">
              Email
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <EmailIcon />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input-field"
                required
              />
            </div>
          </div>

          <button
            type="button"
            className={`submit-button ${loading ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Sending OTP...
              </>
            ) : (
              "Send Reset Link"
            )}
            <span className="button-glow"></span>
          </button>

          <a href="/auth/login" className="back-link">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
