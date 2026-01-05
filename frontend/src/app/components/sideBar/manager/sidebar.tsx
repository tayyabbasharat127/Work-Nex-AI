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
  LayoutDashboard,
} from "lucide-react";
import "./sidebar.css";

const SidebarManager: React.FC = () => {
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
        <a href="/dashboard/manager/main" className="nav-item">
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </a>

        {/* Team */}
        <a href="/dashboard/manager/team" className="nav-item">
          <Users size={20} />
          <span>Team</span>
        </a>

        {/* Attendance */}
        <a href="/dashboard/manager/attendance" className="nav-item">
          <CalendarClock size={20} />
          <span>Attendance</span>
        </a>

        {/* Leaves */}
        <a href="/dashboard/manager/leaves" className="nav-item">
          <FileCheck2 size={20} />
          <span>Leaves</span>
        </a>

        {/* Performance */}
        <a href="/dashboard/manager/performance" className="nav-item">
          <LineChart size={20} />
          <span>Performance</span>
        </a>

        {/* AI Assistant */}
        <a href="/dashboard/manager/assistant" className="nav-item">
          <Bot size={20} />
          <span>Assistant</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <ChevronLeft size={20} />
        <span>Collapse</span>
      </div>
    </aside>
  );
};

export default SidebarManager;
