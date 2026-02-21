import React from "react";
import { useAuth } from "@/src/app/providers/AuthProvider";
import Link from "next/link";
import {
  User,
  CalendarClock,
  FileCheck2,
  LineChart,
  Users,
  Bot,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import "./sidebar.scss";

const SidebarManager: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <User size={24} />
        <span className="logo-text">Manager</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Dashboard */}
        {/* Overview */}
        <Link href="/dashboard/manager/main" className="nav-item">
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </Link>

        {/* Team */}
        <Link href="/dashboard/manager/team" className="nav-item">
          <Users size={20} />
          <span>Team</span>
        </Link>

        {/* Attendance */}
        <Link href="/dashboard/manager/attendance" className="nav-item">
          <CalendarClock size={20} />
          <span>Attendance</span>
        </Link>

        {/* Leaves */}
        <Link href="/dashboard/manager/leaves" className="nav-item">
          <FileCheck2 size={20} />
          <span>Leaves</span>
        </Link>

        {/* Performance */}
        <Link href="/dashboard/manager/performance" className="nav-item">
          <LineChart size={20} />
          <span>Performance</span>
        </Link>

        {/* AI Assistant */}
        <Link href="/dashboard/manager/assistant" className="nav-item">
          <Bot size={20} />
          <span>Assistant</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarManager;
