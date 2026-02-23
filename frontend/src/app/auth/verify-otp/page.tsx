"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./page.scss";
import { verifyOtpApi, forgotPasswordApi } from "@/src/api/api";

export default function VerifyOTP() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Expect URL like: /auth/verify-otp?email=someone@gmail.com&next=reset-password
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const nextFromQuery = useMemo(() => searchParams.get("next") || "reset-password", [searchParams]);

  const [email] = useState(emailFromQuery); // keep fixed; you can make editable if you want
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    const countdown =
      timer > 0 && setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(countdown as NodeJS.Timeout);
  }, [timer]);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]*$/.test(value)) return; // allow only digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    const otpValue = otp.join("");

    if (!email) {
      setError("Missing email. Please go back and enter your email again.");
      return;
    }
    if (otpValue.length < 6) {
      setError("Please enter the full 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await verifyOtpApi({ email, otp: otpValue });
      setMessage(res.data?.message || "OTP Verified Successfully ✅");

      // ✅ Decide where to go next
      // - If next=reset-password => go to reset page with email and OTP
      // - If next=login => go to login page
      if (nextFromQuery === "login") {
        setTimeout(() => router.push("/auth/login"), 1000);
      } else if (nextFromQuery === "reset-password") {
        setTimeout(() => router.push(`/auth/reset-password?email=${encodeURIComponent(email)}&otp=${otpValue}`), 1000);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string, error?: string } }, message?: string };
      setError(e.response?.data?.message || e.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Missing email. Please go back and enter your email again.");
      return;
    }

    setLoading(true);
    try {
      // Resend OTP via forgot-password endpoint (common approach)
      await forgotPasswordApi({ email });
      setTimer(60);
      setMessage("OTP resent successfully.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string, error?: string } }, message?: string };
      setError(e.response?.data?.message || e.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-card">
        <div className="otp-header">
          <h1 className="title">Verify OTP</h1>
          <p className="subtitle">
            Enter the 6-digit code sent to <strong>{email || "your email"}</strong>.
          </p>
        </div>

        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => {
                if (el) inputRefs.current[index] = el;
              }}
              className="otp-box"
              inputMode="numeric"
            />
          ))}
        </div>

        <button
          className={`submit-button ${loading ? "loading" : ""}`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
          <span className="button-glow"></span>
        </button>

        {/* Messages */}
        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <div className="resend-section">
          {timer > 0 ? (
            <p className="timer-text">
              Resend OTP in <strong>{timer}s</strong>
            </p>
          ) : (
            <button className="resend-btn" onClick={handleResend} disabled={loading}>
              Resend OTP
            </button>
          )}
        </div>

        <a href="/auth/login" className="back-link">
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
