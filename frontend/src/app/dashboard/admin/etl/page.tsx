"use client";

import React from "react";

import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function ETLPage() {
  const stats = [
    { label: "Jobs Processed", value: "1,230", trend: "up", change: "+8.5%" },
    {
      label: "Avg. Duration",
      value: "12m 34s",
      trend: "down",
      change: "-2.1%",
    },
    { label: "Errors Detected", value: "5", trend: "down", change: "-16.7%" },
    { label: "Data Synced", value: "98.4%", trend: "up", change: "+1.2%" },
  ];

  return (
    <div className="etl-dashboard">
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

        {/* ETL Workflow Charts */}
        <section className="etl-grid">
          <div className="chart-card">
            <h3>Job Execution Timeline</h3>
            <svg viewBox="0 0 400 200" className="line-chart">
              <polyline
                points="20,150 80,130 140,140 200,100 260,120 320,80 380,110"
                fill="none"
                stroke="#6C5CE7"
                strokeWidth="3"
              />
            </svg>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="dot purple"></span> Duration (min)
              </span>
            </div>
          </div>

          <div className="chart-card bar-chart">
            <h3>Data Load by Source</h3>
            <div className="bars">
              {["MySQL", "MongoDB", "BigQuery", "S3", "Postgres"].map(
                (source, i) => (
                  <div key={i} className="bar-row">
                    <span className="bar-label">{source}</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${60 + (i * 7) % 30}%`,
                          background: "#6C5CE7",
                        }}
                      ></div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Job Logs Table */}
        <section className="table-section">
          <h3>Recent ETL Jobs</h3>
          <table>
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Records</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Load_Customers</td>
                <td className="success">Success</td>
                <td>10m 24s</td>
                <td>42,341</td>
                <td>2h ago</td>
              </tr>
              <tr>
                <td>Sync_Inventory</td>
                <td className="warning">Running</td>
                <td>8m 12s</td>
                <td>11,552</td>
                <td>Just now</td>
              </tr>
              <tr>
                <td>Aggregate_Sales</td>
                <td className="error">Failed</td>
                <td>3m 40s</td>
                <td>3,221</td>
                <td>Yesterday</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
