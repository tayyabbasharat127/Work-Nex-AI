import React, { useState } from "react";
import {
  Bot,
  CalendarClock,
  Eye,
  FileCheck2,
  Home,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LogOut,
  Shield,
  User,
  Users,
  BarChart2,
  Database,
  Settings,
  ChevronLeft,
  TrendingUp,
  Bell,
  ListOrdered
} from "lucide-react";
import "./sidebar.scss";

const SidebarAdmin: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] =
    useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Function to toggle the dropdown visibility
  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  // Function to open the profile modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the profile modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Function to open the forgot password modal
  const openForgotPasswordModal = () => {
    setIsForgotPasswordModalOpen(true);
  };

  // Function to close the forgot password modal
  const closeForgotPasswordModal = () => {
    setIsForgotPasswordModalOpen(false);
  };

  // Handle form submission for forgot password
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // You can add logic to handle password reset here.
    console.log("Current Password:", currentPassword);
    console.log("New Password:", newPassword);
    console.log("Confirm New Password:", confirmNewPassword);
  };

  return (
    <aside className="sidebar">
      {/* Profile Section */}
      <div className="profile-wrap">
        <div className="profile-trigger" onClick={toggleDropdown}>
          {/* Profile Avatar */}
          <div className="profile-avatar">
            <User size={24} />
          </div>
          <div className="profile-name">Admin</div>
        </div>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="profile-dropdown">
            <div className="profile-meta">
              <div className="profile-name">Admin</div>
              <div className="profile-email">admin@responder.com</div>
            </div>
            <a
              href="#"
              className="dropdown-item"
              onClick={openModal} // Open profile modal
            >
              <Eye size={18} />
              <span>View Profile</span>
            </a>

            <a
              href="#"
              className="dropdown-item"
              onClick={openForgotPasswordModal} // Open forgot password modal
            >
              <KeyRound size={18} />
              <span>Forgot Password</span>
            </a>

            <a href="/logout" className="dropdown-item danger">
              <LogOut size={18} />
              <span>Logout</span>
            </a>
          </div>
        )}
      </div>
      {/* Sidebar Navigation Items */}
      <nav className="sidebar-nav">
        {" "}
        <a href="/" className="nav-item active">
          {" "}
          <Home size={20} /> <span>Dashboard</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/users" className="nav-item">
          {" "}
          <Users size={20} /> <span>Users</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/roles" className="nav-item">
          {" "}
          <Shield size={20} /> <span>Roles</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/attendance" className="nav-item">
          {" "}
          <CalendarClock size={20} /> <span>Attendance</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/leaves" className="nav-item">
          {" "}
          <FileCheck2 size={20} /> <span>Leaves</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/performance" className="nav-item">
          {" "}
          <LineChart size={20} /> <span>Performance</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/analytics" className="nav-item">
          {" "}
          <BarChart2 size={20} /> <span>Analytics</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/etl" className="nav-item">
          {" "}
          <Database size={20} /> <span>ETL</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/notification" className="nav-item">
          {" "}
          <Bell size={20} /> <span>Notifications</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/settings" className="nav-item">
          {" "}
          <Settings size={20} /> <span>Settings</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/logs" className="nav-item">
          {" "}
          <ListOrdered size={20} /> <span>Logs</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/assistant" className="nav-item">
          {" "}
          <Bot size={20} /> <span>Assistant</span>{" "}
        </a>{" "}
        <a href="/dashboard/admin/forecast" className="nav-item">
          {" "}
          <TrendingUp size={20} /> <span>Forecast</span>{" "}
        </a>{" "}
      </nav>{" "}
      {/* Footer */}{" "}
      <div className="sidebar-footer">
        {" "}
        <ChevronLeft size={20} /> <span>Collapse</span>{" "}
      </div>
      {/* Footer */}
      <div className="sidebar-footer">
        <span>Collapse</span>
      </div>
      {/* Modal for View Profile */}
      {isModalOpen && (
        <div className="profile-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="close-button" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-detail">
                <User size={24} className="modal-icon" />
                <div className="profile-name">Admin</div>
              </div>
              <div className="profile-detail">
                <LogOut size={24} className="modal-icon" />
                <div className="profile-email">admin@responder.com</div>
              </div>
              <div className="profile-detail">
                <Users size={24} className="modal-icon" />
                <div className="profile-role">Super Admin</div>
              </div>
              <button className="modal-button">Change Name</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Forgot Password */}
      {isForgotPasswordModalOpen && (
        <div className="forgot-password-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Forgot Password</h2>
              <button
                className="close-button"
                onClick={closeForgotPasswordModal}
              >
                &times;
              </button>
            </div>
            <form className="modal-body" onSubmit={handleForgotPasswordSubmit}>
              <div className="modal-input-group">
                <label htmlFor="current-password">Current Password</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
              </div>
              <div className="modal-input-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="modal-input-group">
                <label htmlFor="confirm-new-password">
                  Confirm New Password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <button className="modal-button" type="submit">
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default SidebarAdmin;
