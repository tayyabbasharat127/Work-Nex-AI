"use client";

import React, { useState } from "react";
import { useAuth } from "@/src/app/providers/AuthProvider";
import Link from "next/link";
import {
  User,
  BarChart2,
  Building,
  CreditCard,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "./sidebar.scss";

const SidebarSuperAdmin: React.FC = () => {
  const { logout, user } = useAuth();
  const [showEmail, setShowEmail] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo" onClick={() => setShowEmail((v) => !v)}>
        <User size={24} />
       <Link href="/dashboard/superAdmin" className="logo-text">
  Super Admin
</Link>
        {showEmail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Email Display */}
      {showEmail && user?.email && (
        <div className="sidebar-email">
          <span className="email-text">{user.email}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <Link href="/dashboard/superAdmin/analyticsReporting" className="nav-item">
          <BarChart2 size={20} />
          <span>Analytics Reporting</span>
        </Link>

        <Link
          href="/dashboard/superAdmin/organizationManagement"
          className="nav-item"
        >
          <Building size={20} />
          <span>Organization Management</span>
        </Link>

        <Link
          href="/dashboard/superAdmin/subscriptionManagement"
          className="nav-item"
        >
          <CreditCard size={20} />
          <span>Subscription Management</span>
        </Link>
        <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
      </nav>

      {/* Footer */}
      
    </aside>
  );
};

export default SidebarSuperAdmin;