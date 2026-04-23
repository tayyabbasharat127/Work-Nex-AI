"use client";

import React from "react";
import { useRouter } from "next/navigation";
import "./page.scss";
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          <button onClick={() => scrollToSection('solutions')}>
            Solutions
          </button>
          <button onClick={() => scrollToSection('features')}>
            Features
          </button>
          <button onClick={() => scrollToSection('about')}>
            About
          </button>
          <button onClick={() => scrollToSection('pricing')}>
            Pricing
          </button>
        </nav>

        <div className="nav-actions">
          <button
            className="btn-outline"
            onClick={() => router.push("/register")}
          >
            Sign Up
          </button>
          <button 
            className="btn-primary"
            onClick={() => router.push("/login")}
          >
            Sign In <ArrowRight size={16} />
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
            <button 
              className="btn-primary big"
              onClick={() => router.push("/register")}
            >
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button 
              className="btn-outline big"
              onClick={() => router.push("/login")}
            >
              Live Dashboard
            </button>
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

      {/* ---------- MODULE GRID / SOLUTIONS ---------- */}
      <section id="solutions" className="wnx-modules">
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

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="wnx-features">
        <h2>Powerful Features Built for Modern Workforces</h2>
        <p className="sub">Automate, analyze, and optimize every aspect of workforce management</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Role-Based Access Control</h3>
            <p>Secure multi-level access with JWT tokens and 2FA. Every action is logged for compliance.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Real-Time Analytics</h3>
            <p>Live dashboards for managers and admins. Track attendance health, leave patterns, and productivity metrics.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Insights</h3>
            <p>Predictive models identify trends, optimize scheduling, and forecast workforce needs.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Automated Workflows</h3>
            <p>Leave requests, approvals, and notifications happen automatically with rule-based engines.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Location Verification</h3>
            <p>WiFi-based attendance with IP verification ensures employees are on-site.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Advanced Reporting & ETL</h3>
            <p>Enterprise data pipeline consolidates operational data into analytics-ready formats for BI and insights.</p>
          </div>
        </div>
      </section>

      {/* ---------- ABOUT ---------- */}
      <section id="about" className="wnx-about">
        <div className="about-content">
          <div className="about-text">
            <span className="badge">About WorkNex AI</span>
            <h2>Intelligent Workforce Management for Modern Organizations</h2>
            <p>
              WorkNex AI is an intelligent workforce management and analytics platform designed to streamline 
              attendance, leave tracking, and employee insights within organizations. It securely integrates 
              multiple data sources, automates approvals, and provides real-time dashboards for managers, 
              employees, and administrators.
            </p>
            <p>
              The system leverages data-driven rules and optional predictive models to identify trends and 
              optimize workforce efficiency. With built-in role-based access and embedded analytics, WorkNex AI 
              ensures transparency and accountability across all operations.
            </p>
            <div className="about-stats">
              <div className="stat">
                <h3>99.1%</h3>
                <p>Policy Compliance</p>
              </div>
              <div className="stat">
                <h3>96.4%</h3>
                <p>Attendance Health</p>
              </div>
              <div className="stat">
                <h3>50%</h3>
                <p>Time Saved on HR Tasks</p>
              </div>
            </div>
          </div>
          
          <div className="about-visual">
            <div className="about-card">
              <h4>🎯 Our Mission</h4>
              <p>Deliver a reliable, scalable foundation for smart workforce decision-making in modern institutions.</p>
            </div>
            <div className="about-card">
              <h4>🚀 Our Vision</h4>
              <p>Transform workforce management through AI-powered intelligence and automation.</p>
            </div>
            <div className="about-card">
              <h4>💡 Our Values</h4>
              <p>Transparency, accountability, and data-driven insights for every organization.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="wnx-pricing">
        <h2>Simple, Transparent Pricing</h2>
        <p className="sub">Choose the plan that fits your organization's needs</p>
        
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Starter</h3>
            <div className="price">
              <span className="amount">$49</span>
              <span className="period">/month</span>
            </div>
            <p className="desc">Perfect for small teams</p>
            <ul className="features-list">
              <li>✓ Up to 50 employees</li>
              <li>✓ Basic attendance tracking</li>
              <li>✓ Leave management</li>
              <li>✓ Email support</li>
              <li>✓ Mobile app access</li>
            </ul>
            <button 
              className="btn-outline"
              onClick={() => router.push("/register")}
            >
              Start Free Trial
            </button>
          </div>
          
          <div className="pricing-card featured">
            <div className="popular-badge">Most Popular</div>
            <h3>Professional</h3>
            <div className="price">
              <span className="amount">$149</span>
              <span className="period">/month</span>
            </div>
            <p className="desc">For growing organizations</p>
            <ul className="features-list">
              <li>✓ Up to 200 employees</li>
              <li>✓ Advanced analytics</li>
              <li>✓ AI-powered insights</li>
              <li>✓ Priority support</li>
              <li>✓ Custom integrations</li>
              <li>✓ Role-based access</li>
            </ul>
            <button 
              className="btn-primary"
              onClick={() => router.push("/register")}
            >
              Get Started
            </button>
          </div>
          
          <div className="pricing-card">
            <h3>Enterprise</h3>
            <div className="price">
              <span className="amount">Custom</span>
            </div>
            <p className="desc">For large enterprises</p>
            <ul className="features-list">
              <li>✓ Unlimited employees</li>
              <li>✓ Full platform access</li>
              <li>✓ Dedicated support</li>
              <li>✓ Custom workflows</li>
              <li>✓ On-premise deployment</li>
              <li>✓ SLA guarantee</li>
            </ul>
            <button 
              className="btn-outline"
              onClick={() => router.push("/register")}
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ---------- CORE CAPABILITIES ---------- */}
      <section className="wnx-integrations">
        <h2>Enterprise-Grade Workforce Management</h2>

        <div className="integ-grid">
          {[
            "Identity & Access Governance (IAG)",
            "Leave Management Engine",
            "Attendance Intelligence & Sync (AISE)",
            "Enterprise Data Pipeline & ETL",
            "Power BI Analytics & DAX",
            "AI & Predictive Analytics",
            "Notification & Communication",
            "Performance & Productivity Analytics",
          ].map((x) => (
            <span key={x} className="integ-item">
              {x}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="wnx-cta">
        <h2>Transform Your Workforce Management Today</h2>
        <p>Experience enterprise-grade attendance tracking, intelligent leave management, and real-time analytics in one unified platform.</p>

        <button 
          className="btn-primary big"
          onClick={() => router.push("/register")}
        >
          Get Started <ArrowRight size={18} />
        </button>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="wnx-footer">
        <p>© 2025 WorkNex AI — All Rights Reserved.</p>

        <div className="footer-links">
          <button onClick={() => router.push("/register")}>Get Started</button>
          <button onClick={() => router.push("/login")}>Sign In</button>
          <button onClick={() => scrollToSection('about')}>
            About
          </button>
          <button onClick={() => scrollToSection('pricing')}>
            Pricing
          </button>
        </div>
      </footer>
    </div>
  );
}
