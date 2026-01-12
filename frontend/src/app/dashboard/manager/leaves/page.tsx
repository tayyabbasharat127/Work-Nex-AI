"use client";

import React, { useState } from "react";
import SidebarManager from "@/src/app/components/sideBar/manager/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  FileCheck2,
  FileX,
  Users,
  Building2,
  Search,
  X,
  Check,
} from "lucide-react";
import "./page.css";

const ManagerLeavesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("Pending");
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);

  // FAKE DATA
  const leaves = [
    {
      id: 1,
      name: "Jane Cooper",
      email: "jane.cooper@worknex.ai",
      department: "HR",
      type: "Sick Leave",
      from: "2025-02-12",
      to: "2025-02-14",
      days: 3,
      status: "Pending",
      reason: "Severe flu & doctor's recommendation.",
      avatar: "https://i.pravatar.cc/40?img=7",
    },
    {
      id: 2,
      name: "John Smith",
      email: "john.smith@worknex.ai",
      department: "Engineering",
      type: "Annual Leave",
      from: "2025-02-20",
      to: "2025-02-22",
      days: 3,
      status: "Approved",
      reason: "Family wedding event.",
      avatar: "https://i.pravatar.cc/40?img=5",
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "emily.davis@worknex.ai",
      department: "Engineering",
      type: "Casual Leave",
      from: "2025-02-05",
      to: "2025-02-05",
      days: 1,
      status: "Rejected",
      reason: "Insufficient leave balance.",
      avatar: "https://i.pravatar.cc/40?img=1",
    },
  ];

  // FILTERING
  const filtered = leaves.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());

    const matchDept = dept === "All" || l.department === dept;
    const matchStatus = status === "All" || l.status === status;

    return matchSearch && matchDept && matchStatus;
  });

  // APPROVE / REJECT FUNCTIONS
  const updateLeaveStatus = (id: number, newStatus: "Approved" | "Rejected") => {
    const item = leaves.find((l) => l.id === id);
    if (!item) return;

    item.status = newStatus;
    setSelectedLeave(null);
  };

  return (
    <div className="manager-leaves">
      <SidebarManager />

      <main className="main-content">
        {/* SEARCH */}
        <div className="header">
          <SearchBox />
        </div>

        {/* PAGE TITLE */}
        <div className="page-heading">
          <h1>Manage Leaves</h1>
          <p>Approve or reject leave requests submitted by your team.</p>
        </div>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="icon">
              <FileCheck2 size={18} />
            </div>
            <h4>Pending Requests</h4>
            <p className="value">{leaves.filter((l) => l.status === "Pending").length}</p>
          </div>

          <div className="kpi-card">
            <div className="icon">
              <Check size={18} />
            </div>
            <h4>Approved</h4>
            <p className="value">{leaves.filter((l) => l.status === "Approved").length}</p>
          </div>

          <div className="kpi-card">
            <div className="icon">
              <X size={18} />
            </div>
            <h4>Rejected</h4>
            <p className="value">{leaves.filter((l) => l.status === "Rejected").length}</p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="filters card-box">
          <div className="filters-row">
            {/* SEARCH */}
            <div className="filter-input">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* DEPARTMENT */}
            <div className="filter-select">
              <Building2 size={18} />
              <select value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Management">Management</option>
              </select>
            </div>

            {/* STATUS */}
            <div className="filter-select">
              <Users size={18} />
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </section>

        {/* LEAVE TABLE */}
        <section className="leave-table card-box">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="user-info">
                      <img src={l.avatar} alt={l.name} />
                      <div>
                        <p className="name">{l.name}</p>
                        <p className="email">{l.email}</p>
                      </div>
                    </div>
                  </td>

                  <td>{l.type}</td>

                  <td>
                    {l.from} → {l.to}
                  </td>

                  <td>{l.days}</td>

                  <td>
                    <span className={`status-badge ${l.status.toLowerCase()}`}>
                      {l.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedLeave(l)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* MODAL */}
        {selectedLeave && (
          <div className="modal-overlay" onClick={() => setSelectedLeave(null)}>
            <div className="modal card-box" onClick={(e) => e.stopPropagation()}>
              <h2>Leave Details</h2>

              <div className="modal-section">
                <strong>Employee:</strong> {selectedLeave.name} <br />
                <strong>Email:</strong> {selectedLeave.email} <br />
                <strong>Department:</strong> {selectedLeave.department} <br />
              </div>

              <div className="modal-section">
                <strong>Type:</strong> {selectedLeave.type} <br />
                <strong>Dates:</strong> {selectedLeave.from} →{" "}
                {selectedLeave.to} <br />
                <strong>Total Days:</strong> {selectedLeave.days}
              </div>

              <div className="modal-section">
                <strong>Reason:</strong>
                <p>{selectedLeave.reason}</p>
              </div>

              <div className="modal-actions">
                <button
                  className="approve-btn"
                  onClick={() => updateLeaveStatus(selectedLeave.id, "Approved")}
                >
                  Approve
                </button>

                <button
                  className="reject-btn"
                  onClick={() => updateLeaveStatus(selectedLeave.id, "Rejected")}
                >
                  Reject
                </button>
              </div>

              <button className="close-btn" onClick={() => setSelectedLeave(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagerLeavesPage;
