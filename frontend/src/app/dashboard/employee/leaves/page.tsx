"use client";

import React, { useState } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Calendar, FileText, Upload, CheckCircle, XCircle } from "lucide-react";
import "./page.scss";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";

export default function EmployeeLeavesPage() {
  // TAB HANDLER
  const [activeTab, setActiveTab] = useState<"apply" | "history">("apply");

  // KPI DATA
  const kpi = [
    { label: "Casual Leaves Remaining", value: "4" },
    { label: "Sick Leaves Remaining", value: "2" },
    { label: "Annual Leaves Remaining", value: "10" },
    { label: "Total Leaves This Year", value: "14" },
    { label: "Leaves Approved %", value: "86%" },
  ];

  // LEAVE HISTORY SAMPLE
  const history = [
    {
      type: "Casual",
      from: "Jan 08, 2025",
      to: "Jan 09, 2025",
      status: "Approved",
      comments: "Enjoy your leave.",
    },
    {
      type: "Sick",
      from: "Dec 22, 2024",
      to: "Dec 23, 2024",
      status: "Rejected",
      comments: "Insufficient balance.",
    },
    {
      type: "Annual",
      from: "Nov 02, 2024",
      to: "Nov 05, 2024",
      status: "Pending",
      comments: "Awaiting manager approval.",
    },
  ];

  return (
    <div className="employee-leaves">
      <SidebarEmployee />

      <main className="main-content">
        {/* HEADER */}
        <div className="header">
          <SearchBox />
        </div>

        {/* PAGE HEADING */}
        <div className="page-heading">
          <h1>Leaves</h1>
          <p>Manage leaves and view your leave activity.</p>
        </div>

        {/* KPI CARDS */}
        <div className="kpi-grid">
          {kpi.map((k, i) => (
            <div className="kpi-card" key={i}>
              <h4>{k.label}</h4>
              <p className="value">{k.value}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="tabs">
          <button
            className={activeTab === "apply" ? "active" : ""}
            onClick={() => setActiveTab("apply")}
          >
            Apply Leave
          </button>
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            Leave History
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "apply" ? (
          <ApplyLeaveForm />
        ) : (
          <LeaveHistory history={history} />
        )}
      </main>
    </div>
  );
}

/* ---------------- APPLY LEAVE COMPONENT ---------------- */

function ApplyLeaveForm() {
  const [fileName, setFileName] = useState("");

  return (
    <div className="apply-leave card-box">
      <h3>Apply for Leave</h3>

      <form className="leave-form">
        {/* Leave Type */}
        <div className="form-group">
          <label>Leave Type</label>
          <select>
            <option>Casual Leave</option>
            <option>Sick Leave</option>
            <option>Annual Leave</option>
          </select>
        </div>

        {/* Dates */}
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" />
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input type="date" />
          </div>
        </div>

        {/* Reason */}
        <div className="form-group">
          <label>Reason</label>
          <textarea placeholder="Explain your leave reason..." />
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label>Attach File (optional)</label>

          <div className="file-upload">
            <Upload size={18} />
            <span>{fileName || "Upload document"}</span>
            <input
              type="file"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="submit-btn">
          Submit Leave Request
        </button>
      </form>
    </div>
  );
}

/* ---------------- LEAVE HISTORY COMPONENT ---------------- */

function LeaveHistory({ history }: any) {
  return (
    <div className="leave-history card-box">
      <div className="history-header">
        <h3>Leave History</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Status</th>
            <th>Comments</th>
          </tr>
        </thead>

        <tbody>
          {history.map((h: any, i: number) => (
            <tr key={i}>
              <td>{h.type}</td>
              <td>{h.from}</td>
              <td>{h.to}</td>
              <td>
                <span className={`status ${h.status.toLowerCase()}`}>
                  {h.status}
                </span>
              </td>
              <td>{h.comments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
