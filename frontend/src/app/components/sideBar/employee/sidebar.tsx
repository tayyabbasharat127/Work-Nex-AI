import React, { useState } from "react";
import { useAuth } from "@/src/app/providers/AuthProvider";
import Link from "next/link";
import {
  Home,
  User,
  CalendarClock,
  FileCheck2,
  LineChart,
  BarChart2,
  Bot,
  TrendingUp,
  LogOut,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import "./sidebar.scss";

const SidebarEmployee: React.FC = () => {
  const { logout, user } = useAuth();
  const [showEmail, setShowEmail] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo" onClick={() => setShowEmail(!showEmail)}>
        <User size={24} />
        <span className="logo-text">Employee</span>
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
        {/* Dashboard */}
        <Link href="/dashboard/employee/main" className="nav-item active">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>

        {/* Attendance */}
        <Link href="/dashboard/employee/attendance" className="nav-item">
          <CalendarClock size={20} />
          <span>Attendance</span>
        </Link>

        {/* Leaves */}
        <Link href="/dashboard/employee/leaves" className="nav-item">
          <FileCheck2 size={20} />
          <span>Leaves</span>
        </Link>

        {/* Performance */}
        <Link href="/dashboard/employee/performance" className="nav-item">
          <LineChart size={20} />
          <span>Performance</span>
        </Link>

        {/* Analytics */}
        <Link href="/dashboard/employee/analytics" className="nav-item">
          <BarChart2 size={20} />
          <span>Analytics</span>
        </Link>
        {/* Assistant */}
        <Link href="/dashboard/employee/assistant" className="nav-item">
          <Bot size={20} />
          <span>Assistant</span>
        </Link>
        {/* Forecast */}
        <Link href="/dashboard/employee/forecast" className="nav-item">
          <TrendingUp size={20} />
          <span>Forecast</span>
        </Link>

        {/* Logout - Moved here after Forecast */}
        <button onClick={handleLogout} className="nav-item logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default SidebarEmployee;
