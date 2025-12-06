"use client";

import React, { useState } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { UserPlus, Edit2, Trash2, Download, X } from "lucide-react";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  const stats = [
    { label: "Total Users", value: "156", trend: "up", change: "+12" },
    { label: "Active Users", value: "124", trend: "up", change: "+6" },
    { label: "Inactive Users", value: "32", trend: "down", change: "-3" },
    { label: "New This Month", value: "18", trend: "up", change: "+4" },
  ];

  const users = [
    {
      name: "Jane Cooper",
      email: "jane.cooper@worknext.ai",
      role: "Admin",
      department: "HR",
      status: "Active",
      avatar: "https://i.pravatar.cc/40?img=1",
    },
    {
      name: "John Smith",
      email: "john.smith@worknext.ai",
      role: "Manager",
      department: "IT",
      status: "Active",
      avatar: "https://i.pravatar.cc/40?img=2",
    },
    {
      name: "Emily Davis",
      email: "emily.davis@worknext.ai",
      role: "Employee",
      department: "Marketing",
      status: "Inactive",
      avatar: "https://i.pravatar.cc/40?img=3",
    },
    {
      name: "Michael Lee",
      email: "michael.lee@worknext.ai",
      role: "Employee",
      department: "Finance",
      status: "Active",
      avatar: "https://i.pravatar.cc/40?img=4",
    },
  ];

  // 📁 Export CSV Function
  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Department", "Status"];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...users.map(
          (u) => `${u.name},${u.email},${u.role},${u.department},${u.status}`
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="users-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* KPI Cards */}
        <section className="kpi-grid">
          {stats.map((s, i) => (
            <div key={i} className="kpi-card">
              <h4>{s.label}</h4>
              <div className="kpi-value">{s.value}</div>
              <div className={`kpi-trend ${s.trend}`}>
                {s.trend === "up" ? "↑" : "↓"} {s.change}
              </div>
            </div>
          ))}
        </section>

        {/* Users Table */}
        <section className="table-section">
          <div className="table-header">
            <h3>Users Overview</h3>
            <div className="table-actions">
              <button className="btn-export" onClick={exportCSV}>
                <Download size={16} /> Export CSV
              </button>
              <button className="btn-add" onClick={() => setShowModal(true)}>
                <UserPlus size={16} /> Add User
              </button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user, i) => (
                <tr key={i}>
                  <td>
                    <div className="user-cell">
                      <img src={user.avatar} alt={user.name} />
                      <p className="name">{user.name}</p>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.department}</td>
                  <td>
                    <span className={`status ${user.status.toLowerCase()}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="edit-btn" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="delete-btn" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ADD USER MODAL */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()} // prevent backdrop close
            >
              <div className="modal-header">
                <h3>Add New User</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <form className="user-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" placeholder="Enter full name" />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Enter email address" />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Role</label>
                      <select>
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Employee</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Department</label>
                      <select>
                        <option>HR</option>
                        <option>IT</option>
                        <option>Marketing</option>
                        <option>Finance</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-save">
                    Save User
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
