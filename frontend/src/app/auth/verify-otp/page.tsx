"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ import router for navigation
import "./page.scss";

export default function VerifyOTP() {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const router = useRouter(); // ✅ initialize router

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

  const handleSubmit = () => {
    if (otp.join("").length < 6) return alert("Please enter full OTP.");

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      console.log("OTP Verified Successfully ✅");
      // ✅ Redirect to Reset Password page
      router.push("/auth/reset-password");
    }, 1500);
  };

  return (
    <div className="otp-container">
      <div className="otp-card">
        <div className="otp-header">
          <h1 className="title">Verify OTP</h1>
          <p className="subtitle">
            Enter the 6-digit code sent to your email address.
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

        <div className="resend-section">
          {timer > 0 ? (
            <p className="timer-text">
              Resend OTP in <strong>{timer}s</strong>
            </p>
          ) : (
            <button className="resend-btn" onClick={() => setTimer(60)}>
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
