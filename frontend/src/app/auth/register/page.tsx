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
        `/auth/verify-otp?email=${encodeURIComponent(adminEmail)}`
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string, error?: string } }, message?: string };
      setError(e.response?.data?.message || e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200 px-4">
      <div className="w-full max-w-xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-8 md:p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Organization
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Register your organization and admin account
          </p>
        </div>

        {/* Organization Section */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
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
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-200 focus:border-cyan-400"
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
          <p className="mt-4 text-sm text-red-600 text-center font-medium">
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <button
            onClick={() => router.push("/auth/login")}
            className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition"
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
      className="w-full mb-4 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-200 focus:border-cyan-400"
    />
  );
}
