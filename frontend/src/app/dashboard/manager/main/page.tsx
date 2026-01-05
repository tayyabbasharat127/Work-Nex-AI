"use client";

import React from "react";
import SidebarManager from "@/src/app/components/sideBar/manager/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  Users,
  Activity,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from "lucide-react";
import "./page.css";

const ManagerDashboardPage: React.FC = () => {
  const kpis = [
    {
      label: "Team Attendance (This Month)",
      value: "89%",
      sub: "↑ 3% vs last month",
      icon: <Activity size={20} />,
    },
    {
      label: "Avg Performance Score",
      value: "8.3",
      sub: "Stable vs last week",
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Active Team Members",
      value: "12",
      sub: "of 14 total",
      icon: <Users size={20} />,
    },
    {
      label: "Pending Approvals",
      value: "5",
      sub: "3 leaves • 2 WFH",
      icon: <ClipboardList size={20} />,
    },
  ];

  const teamSummary = [
    { name: "Jane Cooper", status: "Present", checkIn: "09:05", hours: "8.1" },
    { name: "John Smith", status: "WFH", checkIn: "09:30", hours: "7.4" },
    { name: "Emily Davis", status: "Leave", checkIn: "-", hours: "-" },
    { name: "Michael Lee", status: "Present", checkIn: "08:55", hours: "8.6" },
  ];

  const pendingRequests = [
    {
      name: "Jane Cooper",
      type: "Annual Leave",
      dates: "Feb 18–20",
      status: "Pending",
    },
    {
      name: "John Smith",
      type: "WFH Request",
      dates: "Feb 22",
      status: "Pending",
    },
    {
      name: "Emily Davis",
      type: "Sick Leave",
      dates: "Feb 10–11",
      status: "Under Review",
    },
  ];

  return (
    <div className="manager-dashboard">
      <SidebarManager />

      <main className="main-content">
        {/* Top Search */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Heading */}
        <div className="page-heading">
          <h1>Manager Overview</h1>
          <p>
            Track your team’s attendance, performance, and pending actions at a
            glance.
          </p>
        </div>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div key={index} className="kpi-card">
              <div className="kpi-icon">{kpi.icon}</div>
              <div className="kpi-body">
                <h4>{kpi.label}</h4>
                <p className="kpi-value">{kpi.value}</p>
                <p className="kpi-sub">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* MAIN GRID */}
        <section className="manager-grid">
          {/* LEFT COLUMN */}
          <div className="column left-column">
            {/* Attendance Trend */}
            <div className="card-box chart-card">
              <div className="card-header">
                <h3>Team Attendance Trend</h3>
                <span className="subtext">Last 6 weeks</span>
              </div>
              <svg viewBox="0 0 400 170" className="line-chart">
                <polyline
                  points="20,130 70,110 120,115 170,95 220,100 270,85 320,90"
                  fill="none"
                  stroke="#6C5CE7"
                  strokeWidth="3"
                />
              </svg>
              <div className="chart-xlabels">
                {["W1", "W2", "W3", "W4", "W5", "W6"].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>
            </div>

            {/* Performance by Member */}
            <div className="card-box chart-card">
              <div className="card-header">
                <h3>Performance by Team Member</h3>
                <span className="subtext">Score out of 10</span>
              </div>
              <div className="horiz-bars">
                {[
                  { name: "Jane", score: 9.1 },
                  { name: "John", score: 8.4 },
                  { name: "Emily", score: 7.8 },
                  { name: "Michael", score: 8.9 },
                ].map((m, i) => (
                  <div key={i} className="bar-row">
                    <span className="label">{m.name}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${m.score * 10}%` }}
                      />
                    </div>
                    <span className="value">{m.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div className="column center-column">
            {/* Today's Team Summary */}
            <div className="card-box">
              <div className="card-header">
                <h3>Today’s Team Summary</h3>
                <span className="subtext">
                  Overall check-in, hours worked, and presence.
                </span>
              </div>

              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {teamSummary.map((row, i) => (
                    <tr key={i}>
                      <td>{row.name}</td>
                      <td>
                        <span
                          className={`status-badge ${row.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>{row.checkIn}</td>
                      <td>{row.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Workload Snapshot */}
            <div className="card-box chart-card">
              <div className="card-header">
                <h3>Workload Snapshot</h3>
                <span className="subtext">Tasks assigned per member</span>
              </div>
              <div className="horiz-bars compact">
                {[
                  { name: "Jane", tasks: 9 },
                  { name: "John", tasks: 7 },
                  { name: "Emily", tasks: 5 },
                  { name: "Michael", tasks: 8 },
                ].map((m, i) => (
                  <div key={i} className="bar-row">
                    <span className="label">{m.name}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill secondary"
                        style={{ width: `${m.tasks * 8}%` }}
                      />
                    </div>
                    <span className="value">{m.tasks}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="column right-column">
            {/* Pending Approvals */}
            <div className="card-box">
              <div className="card-header">
                <h3>Pending Approvals</h3>
                <span className="subtext">Leaves & WFH requests</span>
              </div>

              <ul className="pending-list">
                {pendingRequests.map((req, i) => (
                  <li key={i} className="pending-item">
                    <div className="left">
                      <p className="name">{req.name}</p>
                      <p className="meta">
                        {req.type} • <span>{req.dates}</span>
                      </p>
                    </div>
                    <span className="status-tag">{req.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Insight */}
            <div className="card-box insight-card">
              <div className="icon-circle">
                <Clock size={22} />
              </div>
              <h3>Manager Insight</h3>
              <p>
                Your team’s attendance is improving, but leave requests are
                clustering mid-month. Consider staggering approvals to balance
                workload.
              </p>
              <div className="insight-footer">
                <div className="pill positive">
                  <CheckCircle2 size={16} /> Stable performance
                </div>
                <div className="pill warning">
                  <XCircle size={16} /> Monitor mid-month leaves
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ManagerDashboardPage;
