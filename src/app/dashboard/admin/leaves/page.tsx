"use client";

import React from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function LeavePage() {
  const stats = [
    { label: "Total Requests", value: "56", trend: "up", change: "+8%" },
    { label: "Approved", value: "42", trend: "up", change: "+5%" },
    { label: "Pending", value: "10", trend: "down", change: "-2%" },
    { label: "Rejected", value: "4", trend: "down", change: "-1%" },
  ];

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="leave-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* Summary Cards */}
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

        {/* Leave Calendar + Table */}
        <section className="leave-grid">
          <div className="calendar-card">
            <div className="calendar-header">
              <h3>Leave Calendar - November</h3>
            </div>
            <div className="calendar-weekdays">
              {weekdays.map((day, i) => (
                <span key={i}>{day}</span>
              ))}
            </div>
            <div className="calendar-days">
              {days.map((d) => (
                <div
                  key={d}
                  className={`calendar-day ${
                    [5, 14, 22].includes(d)
                      ? "approved"
                      : [10, 18].includes(d)
                      ? "pending"
                      : ""
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="legend">
              <span className="approved-dot"></span> Approved
              <span className="pending-dot"></span> Pending
            </div>
          </div>

          <div className="table-section">
            <h3>Recent Leave Requests</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Jane Cooper</td>
                  <td>Annual</td>
                  <td>Nov 5</td>
                  <td>Nov 8</td>
                  <td className="approved">Approved</td>
                </tr>
                <tr>
                  <td>John Smith</td>
                  <td>Sick</td>
                  <td>Nov 10</td>
                  <td>Nov 11</td>
                  <td className="pending">Pending</td>
                </tr>
                <tr>
                  <td>Emily Davis</td>
                  <td>Casual</td>
                  <td>Nov 14</td>
                  <td>Nov 15</td>
                  <td className="approved">Approved</td>
                </tr>
                <tr>
                  <td>Mark Johnson</td>
                  <td>Emergency</td>
                  <td>Nov 18</td>
                  <td>Nov 19</td>
                  <td className="rejected">Rejected</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
