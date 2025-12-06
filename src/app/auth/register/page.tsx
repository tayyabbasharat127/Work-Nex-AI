"use client";

import React, { useState } from "react";
import "./page.scss";

// Icons initialization
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.67 0 8 1.34 8 4v4H4v-4c0-2.66 5.33-4 8-4zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  </svg>
);

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

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 17a2 2 0 1 0 0-4 2 
    2 0 0 0 0 4zm6-9h-1V6a5 5 0 0 
    0-10 0v2H6a2 2 0 0 0-2 
    2v10a2 2 0 0 0 2 2h12a2 
    2 0 0 0 2-2V10a2 2 0 0 
    0-2-2zm-3 0H9V6a3 3 0 0 
    1 6 0v2z"
    />
  </svg>
);

const VisibilityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 
    12c1.73 4.39 6 7.5 11 
    7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 
    12.5a5 5 0 1 1 0-10 5 5 
    0 0 1 0 10z"
    />
  </svg>
);

const VisibilityOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M2 4.27L3.28 3l17.46 
    17.46L20.73 22l-2.5-2.5A10.939 
    10.939 0 0 1 12 19.5C7 19.5 
    2.73 16.39 1 12a10.94 10.94 0 
    0 1 4.27-5.73L2 4.27zM12 
    7a5 5 0 0 1 5 5c0 .82-.2 
    1.58-.54 2.25l-6.71-6.71C10.42 
    7.2 11.18 7 12 7z"
    />
  </svg>
);

export default function Register() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [showPass, setShowPass] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      console.log("Registered:", form);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1 className="title">Create Account</h1>
          <p className="subtitle">Join us and start your journey today</p>
        </div>

        <div className="register-form">
          {/* Full Name */}
          <div className="input-group">
            <label htmlFor="fullName" className="input-label">
              Full Name
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <UserIcon />
              </span>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Email */}
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
                name="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <LockIcon />
              </span>
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">
              Confirm Password
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <LockIcon />
              </span>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input-field"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </button>
            </div>
          </div>

          {/* Role Dropdown */}
          <div className="input-group">
            <label htmlFor="role" className="input-label">
              Role
            </label>
            <div className="input-wrapper">
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="input-field select-field"
                required
              >
                <option value="">Select your role</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="button-group">
            <button
              type="button"
              className={`submit-button ${loading ? "loading" : ""}`}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Registering...
                </>
              ) : (
                "Register"
              )}
              <span className="button-glow"></span>
            </button>

            <button
              type="button"
              className="back-button"
              onClick={() => (window.location.href = "/auth/login")}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
