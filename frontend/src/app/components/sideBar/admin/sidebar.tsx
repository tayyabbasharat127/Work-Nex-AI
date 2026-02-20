import React, { useState } from "react";
import { useAuth } from "@/src/app/providers/AuthProvider";
import Link from "next/link";
import {
  Home,
  User,
  Settings,
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
  Building,
  LogOut,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import "./sidebar.scss";

const SidebarAdmin: React.FC = () => {
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
        <span className="logo-text">Admin</span>
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
        <Link href="/dashboard/admin/main" className="nav-item active">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/dashboard/admin/users" className="nav-item">
          <Users size={20} />
          <span>Users</span>
        </Link>
        <Link href="/dashboard/admin/departments" className="nav-item">
          <Building size={20} />
          <span>Departments</span>
        </Link>
        <Link href="/dashboard/admin/roles" className="nav-item">
          <Shield size={20} />
          <span>Roles</span>
        </Link>
        <Link href="/dashboard/admin/attendance" className="nav-item">
          <CalendarClock size={20} />
          <span>Attendance</span>
        </Link>
        <Link href="/dashboard/admin/leaves" className="nav-item">
          <FileCheck2 size={20} />
          <span>Leaves</span>
        </Link>
        <Link href="/dashboard/admin/performance" className="nav-item">
          <LineChart size={20} />
          <span>Performance</span>
        </Link>
        <Link href="/dashboard/admin/analytics" className="nav-item">
          <BarChart2 size={20} />
          <span>Analytics</span>
        </Link>
        <Link href="/dashboard/admin/etl" className="nav-item">
          <Database size={20} />
          <span>ETL</span>
        </Link>
        <Link href="/dashboard/admin/notification" className="nav-item">
          <Bell size={20} />
          <span>Notifications</span>
        </Link>
        <Link href="/dashboard/admin/settings" className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
        <Link href="/dashboard/admin/logs" className="nav-item">
          <ListOrdered size={20} />
          <span>Logs</span>
        </Link>
        <Link href="/dashboard/admin/assistant" className="nav-item">
          <Bot size={20} />
          <span>Assistant</span>
        </Link>

        <Link href="/dashboard/admin/forecast" className="nav-item">
          <TrendingUp size={20} />
          <span>Forecast</span>
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

export default SidebarAdmin;
