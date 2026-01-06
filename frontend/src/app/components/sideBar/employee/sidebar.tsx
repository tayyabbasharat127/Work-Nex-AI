import React from "react";
import {
  Home,
  User,
  MessageCircle,
  Star,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Shield,
  CalendarClock,
  FileCheck2,
  LineChart,
  BarChart2,
  Database,
  Bell,
  ListOrdered,
  Users,
  Bot,
  TrendingUp,
  Eye,
  KeyRound,
  LogOut,
} from "lucide-react";
import "./sidebar.scss";

const SidebarEmployee: React.FC = () => {
  return (
    <aside className="sidebar">
      {/* ✅ TOP PROFILE (Hover Dropdown) */}
      <div className="profile-wrap">
        <div className="profile-trigger">
          <div className="profile-avatar">
            <User size={22} />
          </div>

          <div className="profile-meta">
            <div className="profile-name">Employee</div>
            <div className="profile-email">employee@responder.com</div>
          </div>
        </div>

        {/* ✅ Dropdown items */}
        <div className="profile-dropdown">
          <a href="/dashboard/employee/profile" className="dropdown-item">
            <Eye size={18} />
            <span>View Profile</span>
          </a>

          <a
            href="/dashboard/employee/change-password"
            className="dropdown-item"
          >
            <KeyRound size={18} />
            <span>Change Password</span>
          </a>

          <a href="/logout" className="dropdown-item danger">
            <LogOut size={18} />
            <span>Logout</span>
          </a>
        </div>
      </div>

      {/* Logo Section (kept exactly same) */}
      <div className="sidebar-logo">
        <User size={24} />
        <span className="logo-text">Employee</span>
      </div>

      {/* Navigation (kept exactly same) */}
      <nav className="sidebar-nav">
        {/* Dashboard */}
        <a href="/dashboard/employee/main" className="nav-item active">
          <Home size={20} />
          <span>Dashboard</span>
        </a>

        {/* Attendance */}
        <a href="/dashboard/employee/attendance" className="nav-item">
          <CalendarClock size={20} />
          <span>Attendance</span>
        </a>

        {/* Leaves */}
        <a href="/dashboard/employee/leaves" className="nav-item">
          <FileCheck2 size={20} />
          <span>Leaves</span>
        </a>

        {/* Performance */}
        <a href="/dashboard/employee/performance" className="nav-item">
          <LineChart size={20} />
          <span>Performance</span>
        </a>

        {/* Analytics */}
        <a href="/dashboard/employee/analytics" className="nav-item">
          <BarChart2 size={20} />
          <span>Analytics</span>
        </a>

        {/* Assistant */}
        <a href="/dashboard/employee/assistant" className="nav-item">
          <Bot size={20} />
          <span>Assistant</span>
        </a>

        {/* Forecast */}
        <a href="/dashboard/employee/forecast" className="nav-item">
          <TrendingUp size={20} />
          <span>Forecast</span>
        </a>
      </nav>

      {/* Footer (kept exactly same) */}
      <div className="sidebar-footer">
        <ChevronLeft size={20} />
        <span>Collapse</span>
      </div>
    </aside>
  );
};

export default SidebarEmployee;
