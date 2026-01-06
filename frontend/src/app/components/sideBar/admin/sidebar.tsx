import React from "react";
import {
  Home,
  Settings,
  ChevronLeft,
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
  UserCircle2,
  KeyRound,
  LogOut,
  Eye,
} from "lucide-react";
import "./sidebar.scss";

const SidebarAdmin: React.FC = () => {
  return (
    <aside className="sidebar">
      {/* Top Profile Section (Hover Dropdown) */}
      <div className="profile-wrap">
        <button className="profile-trigger" type="button" aria-haspopup="menu">
          <div className="profile-avatar">
            {/* If you have an image, replace with <img /> */}
            <UserCircle2 size={22} />
          </div>

          <div className="profile-meta">
            <p className="profile-name">Admin</p>
            <p className="profile-email">admin@responder.com</p>
          </div>
        </button>

        {/* Dropdown */}
        <div className="profile-dropdown" role="menu" aria-label="Profile menu">
          <a
            className="dropdown-item"
            href="/dashboard/admin/profile"
            role="menuitem"
          >
            <Eye size={16} />
            <span>View Profile</span>
          </a>

          <a
            className="dropdown-item"
            href="/dashboard/admin/change-password"
            role="menuitem"
          >
            <KeyRound size={16} />
            <span>Change Password</span>
          </a>

          <a className="dropdown-item danger" href="/logout" role="menuitem">
            <LogOut size={16} />
            <span>Logout</span>
          </a>
        </div>
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
