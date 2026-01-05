"use client";

import React from "react";
import { useRouter } from "next/navigation";
import "./page.css";
import {
  ArrowRight,
  Brain,
  BarChart3,
  ShieldCheck,
  Users,
  Sparkles,
} from "lucide-react";

const modules = [
  {
    icon: ShieldCheck,
    title: "Identity & Access Governance",
    desc: "Centralized access, roles & identity control.",
  },
  {
    icon: Users,
    title: "Attendance Intelligence",
    desc: "Real-time syncing, anomaly detection, multi-device.",
  },
  {
    icon: Brain,
    title: "AI Insights Engine",
    desc: "Predict absenteeism, productivity & workforce risks.",
  },
  {
    icon: BarChart3,
    title: "Enterprise Data Pipeline",
    desc: "ETL for HR, attendance, payroll & BI tools.",
  },
  {
    icon: Sparkles,
    title: "Leave Management Engine",
    desc: "Policy-based automations & real-time balances.",
  },
  {
    icon: ArrowRight,
    title: "Power BI Dashboards",
    desc: "Live workforce analytics for HR & leadership.",
  },
];

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="wnx-landing">
      {/* ---------- NAVBAR ---------- */}
      <header className="wnx-nav">
        <div className="nav-left">
          <div className="logo">W</div>
          <div className="brand">
            <h4>WorkNex AI</h4>
            <span>Workforce Intelligence</span>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#">Platform</a>
          <a href="#">Features</a>
          <a href="#">Integrations</a>
          <a href="#">Pricing</a>
        </nav>

        <div className="nav-actions">
          <button
            className="btn-outline"
            onClick={() => router.push("/auth/register")}
          >
            Sign In
          </button>
          <button className="btn-primary">
            Book Demo <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="wnx-hero">
        <div className="hero-content">
          <span className="badge">AI-powered Workforce OS</span>

          <h1>
            Transform workforce chaos into
            <span> actionable intelligence.</span>
          </h1>

          <p>
            WorkNex AI unifies attendance, leave, identity access, HR data and
            analytics into one intelligent platform for modern organizations.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary big">
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button className="btn-outline big">Live Dashboard</button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="floating-card card1">
            <h4>Attendance Health</h4>
            <p>96.4%</p>
          </div>
          <div className="floating-card card2">
            <h4>Policy Compliance</h4>
            <p>99.1%</p>
          </div>
          <div className="floating-ring"></div>
        </div>
      </section>

      {/* ---------- MODULE GRID ---------- */}
      <section className="wnx-modules">
        <h2>Everything your workforce runs on — in one platform</h2>
        <p className="sub">
          WorkNex AI merges data from devices, HR, attendance, payroll & BI
          tools.
        </p>

        <div className="module-grid">
          {modules.map((m) => (
            <div key={m.title} className="module-card">
              <div className="icon">
                <m.icon size={22} />
              </div>
              <h4>{m.title}</h4>
              <p>{m.desc}</p>
              <span className="learn">
                Explore <ArrowRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- INTEGRATIONS ---------- */}
      <section className="wnx-integrations">
        <h2>Integrates with your entire ecosystem</h2>

        <div className="integ-grid">
          {[
            "HRMS",
            "Payroll",
            "Face ID Devices",
            "ERP",
            "Power BI",
            "Teams",
            "Slack",
            "Google",
          ].map((x) => (
            <span key={x} className="integ-item">
              {x}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="wnx-cta">
        <h2>Ready to upgrade your attendance & HR efficiency?</h2>
        <p>Book a 30-minute tailored demo for your organization.</p>

        <button className="btn-primary big">
          Book Demo <ArrowRight size={18} />
        </button>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="wnx-footer">
        <p>© 2025 WorkNex AI — All Rights Reserved.</p>

        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Security</a>
          <a href="#">Docs</a>
          <a href="#">Careers</a>
        </div>
      </footer>
    </div>
  );
}
