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
        `/auth/verify-otp?email=${encodeURIComponent(adminEmail)}&next=login`
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string, error?: string } }, message?: string };
      setError(e.response?.data?.message || e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05080f] via-[#0a0f1a] to-[#0f1419] px-4">
      <div className="w-full max-w-xl bg-[rgba(15,20,30,0.95)] backdrop-blur-xl rounded-2xl shadow-2xl border border-[rgba(0,255,255,0.15)] p-8 md:p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-cyan-500/30">
              W
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              WorkNex AI
            </h2>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Create Organization
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Register your organization and admin account
          </p>
        </div>

        {/* Organization Section */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
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
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
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
          <select
            name="subscriptionPlan"
            value={form.subscriptionPlan}
            onChange={handleChange}
            className="w-full rounded-lg border border-[rgba(0,255,255,0.2)] bg-[rgba(20,25,35,0.8)] text-white px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400"
          >
            <option value="basic">Basic Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>
        </div>

        {/* Passwords */}
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

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-400 text-center font-medium bg-red-500/10 border border-red-500/20 rounded-lg py-2">
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <button
            onClick={() => router.push("/auth/login")}
            className="w-full py-3 rounded-xl border border-[rgba(0,255,255,0.2)] text-gray-300 font-semibold hover:bg-[rgba(0,255,255,0.1)] hover:border-cyan-400 transition"
          >
            ← Back to Login
          </button>
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
      className="w-full mb-4 rounded-lg border border-[rgba(0,255,255,0.2)] bg-[rgba(20,25,35,0.8)] text-white placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-400"
    />
  );
}
