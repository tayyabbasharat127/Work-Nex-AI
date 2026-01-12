"use client";

import React, { useState } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  User,
  Bell,
  Shield,
  Sliders,
  Moon,
  Sun,
  Key,
  Lock,
} from "lucide-react";
import "./page.css";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const settingsCards = [
    { label: "Profile Settings", icon: <User />, desc: "Manage personal info" },
    {
      label: "Notifications",
      icon: <Bell />,
      desc: "Email & alerts preferences",
    },
    { label: "Security", icon: <Shield />, desc: "Manage password & 2FA" },
    {
      label: "System Preferences",
      icon: <Sliders />,
      desc: "Theme & layout options",
    },
  ];

  return (
    <div className="settings-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* Overview Cards */}
        <section className="settings-grid">
          {settingsCards.map((s, i) => (
            <div key={i} className="setting-card">
              <div className="icon">{s.icon}</div>
              <div className="content">
                <h4>{s.label}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Preferences Section */}
        <section className="preferences-section">
          <h3>User Preferences</h3>

          <div className="preference">
            <span>Dark Mode</span>
            <button
              className={`toggle ${darkMode ? "on" : ""}`}
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          <div className="preference">
            <span>Email Notifications</span>
            <button
              className={`toggle ${notifications ? "on" : ""}`}
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? "On" : "Off"}
            </button>
          </div>

          <div className="preference">
            <span>Language</span>
            <select>
              <option>English</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
        </section>

        {/* Security Section */}
        <section className="security-section">
          <h3>Security Settings</h3>

          <div className="security-item">
            <div className="icon">
              <Key size={18} />
            </div>
            <div className="info">
              <h5>Change Password</h5>
              <p>
                Update your account password regularly for better protection.
              </p>
            </div>
            <button className="btn-primary">Update</button>
          </div>

          <div className="security-item">
            <div className="icon">
              <Lock size={18} />
            </div>
            <div className="info">
              <h5>Two-Factor Authentication</h5>
              <p>Enhance security by enabling 2FA verification.</p>
            </div>
            <button
              className={`btn-toggle ${twoFactorAuth ? "on" : ""}`}
              onClick={() => setTwoFactorAuth(!twoFactorAuth)}
            >
              {twoFactorAuth ? "Enabled" : "Enable"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
