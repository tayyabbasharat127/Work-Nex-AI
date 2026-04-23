"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signupApi } from "@/src/api/api";

export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState({
    organizationName: "",
    organizationEmail: "",
    adminName: "",
    adminEmail: "",
    subscriptionPlan: "basic",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const {
      organizationName,
      organizationEmail,
      adminName,
      adminEmail,
      subscriptionPlan,
      password,
      confirmPassword,
    } = form;

    if (
      !organizationName ||
      !organizationEmail ||
      !adminName ||
      !adminEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // ✅ EXACT backend payload
      await signupApi({
        organization_name: organizationName,
        organization_email: organizationEmail,
        admin_name: adminName,
        admin_email: adminEmail,
        password,
        subscription_plan: subscriptionPlan,
      });

      router.push(
        `/verify-otp?email=${encodeURIComponent(adminEmail)}&next=login`
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string, error?: string } }, message?: string };
      setError(e.response?.data?.message || e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05080f] via-[#0a0f1a] to-[#05080f] px-4 py-12">
      <div className="w-full max-w-2xl">
        
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-black font-bold text-xl">
              W
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-white">WorkNex AI</h2>
              <p className="text-xs text-gray-400">Workforce Intelligence</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1627]/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#1a2438] p-8 md:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Create Organization
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Register your organization and admin account
            </p>
          </div>

          {/* Organization Section */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 text-xs">1</span>
              Organization Details
            </p>

            <Input
              name="organizationName"
              placeholder="Organization Name"
              value={form.organizationName}
              onChange={handleChange}
            />

            <Input
              name="organizationEmail"
              type="email"
              placeholder="Organization Email"
              value={form.organizationEmail}
              onChange={handleChange}
            />
          </div>

          {/* Admin Section */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 text-xs">2</span>
              Admin Account
            </p>

            <Input
              name="adminName"
              placeholder="Admin Full Name"
              value={form.adminName}
              onChange={handleChange}
            />

            <Input
              name="adminEmail"
              type="email"
              placeholder="Admin Email"
              value={form.adminEmail}
              onChange={handleChange}
            />
          </div>

          {/* Subscription */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 text-xs">3</span>
              Subscription Plan
            </p>
            <select
              name="subscriptionPlan"
              value={form.subscriptionPlan}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#1a2438] bg-[#0a0f1a] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
            >
              <option value="basic">Basic Plan - $49/month</option>
              <option value="pro">Pro Plan - $149/month</option>
              <option value="enterprise">Enterprise Plan - Custom</option>
            </select>
          </div>

          {/* Passwords */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 text-xs">4</span>
              Security
            </p>
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />

            <Input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-8 space-y-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account →"
              )}
            </button>

            <button
              onClick={() => router.push("/login")}
              className="w-full py-3.5 rounded-xl border border-[#1a2438] text-gray-300 font-semibold hover:bg-[#1a2438]/30 hover:border-cyan-400/50 transition-all"
            >
              ← Back to Login
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-cyan-400 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Input Component                                                   */
/* -------------------------------------------------------------------------- */

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full mb-4 rounded-xl border border-[#1a2438] bg-[#0a0f1a] px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
    />
  );
}
