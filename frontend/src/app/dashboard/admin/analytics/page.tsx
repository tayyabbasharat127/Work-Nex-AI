"use client";

import React from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.css";
import { StatsCard } from "@/src/app/components/card/statsCard";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function AnalyticsPage() {
  // sample data
  const kpis = [
    { title: "Total Attendance", value: "92%", trend: "up", change: "+4.2%" },
    { title: "Average Points", value: "84", trend: "down", change: "-1.8%" },
    { title: "Active Users", value: "1,245", trend: "up", change: "+3.5%" },
  ];

  const months = ["Jan", "Feb", "Mar", "Apr", "May"];

  return (
    <div className="analytics-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        {/* Header */}
        <div className="header">
          <SearchBox />
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpis.map((kpi, i) => (
            <div key={i} className="kpi-card">
              <h4>{kpi.title}</h4>
              <p className="kpi-value">{kpi.value}</p>
              <p className={`kpi-trend ${kpi.trend}`}>
                {kpi.trend === "up" ? "↑" : "↓"} {kpi.change}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="charts-row">
          <div className="chart-card">
            <h3>Monthly Attendance Trend</h3>
            <svg viewBox="0 0 400 200" className="line-chart">
              <polyline
                points="20,150 60,120 100,140 140,80 180,100 220,60 260,90 300,50 340,80 380,120"
                fill="none"
                stroke="#6C5CE7"
                strokeWidth="3"
              />
              <polyline
                points="20,160 60,140 100,155 140,110 180,130 220,100 260,120 300,90 340,110 380,145"
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
            <h3>Performance Breakdown</h3>
            <div className="bars">
              {months.map((month, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{month}</span>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${60 + Math.random() * 30}%`,
                        background: "#6C5CE7",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
