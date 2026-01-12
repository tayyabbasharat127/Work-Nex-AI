"use client";

import React from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  TrendingUp,
  Award,
  Target,
  Activity,
  ChevronRight,
} from "lucide-react";
import "./page.css";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function PerformancePage() {
  const stats = [
    { label: "Productivity", value: "92%", trend: "up", change: "+4.2%" },
    { label: "Goals Achieved", value: "78%", trend: "up", change: "+6.1%" },
    { label: "Active Tasks", value: "16", trend: "down", change: "-3%" },
    { label: "Overall Rating", value: "4.6/5", trend: "up", change: "+0.3" },
  ];

  const employees = [
    { name: "Jane Cooper", department: "Design", rating: "4.8", progress: 90 },
    {
      name: "John Smith",
      department: "Engineering",
      rating: "4.5",
      progress: 85,
    },
    {
      name: "Emily Davis",
      department: "Marketing",
      rating: "4.2",
      progress: 72,
    },
    { name: "Michael Lee", department: "Sales", rating: "4.1", progress: 69 },
    { name: "Sarah Johnson", department: "HR", rating: "4.7", progress: 88 },
  ];

  return (
    <div className="performance-dashboard">
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

        {/* Charts Section */}
        <section className="charts-grid">
          <div className="chart-card">
            <h3>Performance Trend</h3>
            <svg viewBox="0 0 400 200" className="line-chart">
              <polyline
                points="20,150 60,130 100,110 140,100 180,80 220,70 260,65 300,75 340,95 380,120"
                fill="none"
                stroke="#6C5CE7"
                strokeWidth="3"
              />
              <polyline
                points="20,160 60,140 100,130 140,120 180,110 220,100 260,90 300,95 340,105 380,115"
                fill="none"
                stroke="#FF8C42"
                strokeWidth="3"
              />
            </svg>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="dot purple"></span> Weekly
              </span>
              <span className="legend-item">
                <span className="dot orange"></span> Monthly
              </span>
            </div>
          </div>

          <div className="chart-card bar-chart">
            <h3>Goals Progress</h3>
            <div className="bars">
              {["Design", "Dev", "Sales", "Marketing", "HR"].map((dept, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{dept}</span>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${60 + Math.random() * 40}%`,
                        background: "#6C5CE7",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance Table */}
        <section className="table-section">
          <h3>Employee Performance Overview</h3>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Rating</th>
                <th>Progress</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={i}>
                  <td>{emp.name}</td>
                  <td>{emp.department}</td>
                  <td>{emp.rating}</td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="fill"
                        style={{ width: `${emp.progress}%` }}
                      ></div>
                    </div>
                  </td>
                  <td>
                    <ChevronRight size={16} color="#8b92a9" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
