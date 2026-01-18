import React from "react";
import { useAuth } from "@/src/app/providers/AuthProvider";
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
  LogOut
} from "lucide-react";
import "./sidebar.scss";

const SidebarEmployee: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <User size={24} />
        <span className="logo-text">Employee</span>
      </div>

      {/* Navigation */}
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

export default SidebarEmployee;
