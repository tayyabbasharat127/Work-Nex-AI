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
  TrendingUp
} from "lucide-react";
import "./sidebar.scss";

const SidebarAdmin: React.FC = () => {
  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <User size={24} />
        <span className="logo-text">Admin</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <a href="/" className="nav-item active">
          <Home size={20} />
          <span>Dashboard</span>
        </a>
        <a href="/dashboard/admin/users" className="nav-item">
          <Users size={20} />
          <span>Users</span>
        </a>
        <a href="/dashboard/admin/roles" className="nav-item">
          <Shield size={20} />
          <span>Roles</span>
        </a>
        <a href="/dashboard/admin/attendance" className="nav-item">
          <CalendarClock size={20} />
          <span>Attendance</span>
        </a>
        <a href="/dashboard/admin/leaves" className="nav-item">
          <FileCheck2 size={20} />
          <span>Leaves</span>
        </a>
        <a href="/dashboard/admin/performance" className="nav-item">
          <LineChart size={20} />
          <span>Performance</span>
        </a>
        <a href="/dashboard/admin/analytics" className="nav-item">
          <BarChart2 size={20} />
          <span>Analytics</span>
        </a>
        <a href="/dashboard/admin/etl" className="nav-item">
          <Database size={20} />
          <span>ETL</span>
        </a>
        <a href="/dashboard/admin/notification" className="nav-item">
          <Bell size={20} />
          <span>Notifications</span>
        </a>
        <a href="/dashboard/admin/settings" className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </a>
        <a href="/dashboard/admin/logs" className="nav-item">
          <ListOrdered size={20} />
          <span>Logs</span>
        </a>
        <a href="/dashboard/admin/assistant" className="nav-item">
  <Bot size={20} />
  <span>Assistant</span>
</a>

<a href="/dashboard/admin/forecast" className="nav-item">
  <TrendingUp size={20} />
  <span>Forecast</span>
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

export default SidebarAdmin;
