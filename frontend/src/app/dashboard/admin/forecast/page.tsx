"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  TrendingUp,
  Activity,
  BarChart3,
  Brain,
} from "lucide-react";
import "./page.scss";

const AdminForecastPage: React.FC = () => {
  // const [loading] = useState(true);

  const [forecast] = useState({
    attendance: "91%",
    leaves: "12%",
    performance: "8.2",
    summary:
      "The company’s attendance is projected to increase by 3%, leave usage will remain stable, and performance scores will improve slightly over the next quarter.",
  });

  useEffect(() => {
    // Later: Fetch real forecast from /api/ai/forecast
  }, []);

  const kpis = [
    {
      label: "Predicted Company Attendance",
      value: forecast.attendance,
      icon: <Activity size={20} />,
    },
    {
      label: "Predicted Leave Usage",
      value: forecast.leaves,
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Performance Index Forecast",
      value: forecast.performance,
      icon: <TrendingUp size={20} />,
    },
  ];

  return (
    <div className="forecast-admin">
      <Sidebar />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>AI Forecast</h1>
          <p>Company-level predictions for attendance, leaves, and performance.</p>
        </div>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          {kpis.map((k, i) => (
            <div className="kpi-card" key={i}>
              <div className="kpi-icon">{k.icon}</div>
              <h4>{k.label}</h4>
              <p className="kpi-value">{k.value}</p>
            </div>
          ))}
        </section>

        {/* GRID */}
        <section className="forecast-grid">
          {/* Attendance Forecast */}
          <div className="card-box chart-card">
            <div className="card-header">
              <h3>Company Attendance Forecast</h3>
              <span className="subtext">Next 3 months</span>
            </div>

            <svg viewBox="0 0 400 160">
              <polyline
                points="20,130 80,110 140,100 200,85 260,90 320,75"
                fill="none"
                stroke="#6C5CE7"
                strokeWidth="3"
              />
            </svg>

            <div className="chart-xlabels">
              {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          </div>

          {/* Leave Forecast */}
          <div className="card-box chart-card">
            <div className="card-header">
              <h3>Leave Demand Forecast</h3>
              <span className="subtext">Quarterly</span>
            </div>

            <svg viewBox="0 0 400 160">
              {[45, 60, 50, 70].map((h, i) => (
                <rect
                  key={i}
                  x={50 + i * 80}
                  y={140 - h}
                  width={50}
                  height={h}
                  rx={6}
                  fill="#FF8C42"
                />
              ))}
            </svg>

            <div className="chart-xlabels">
              {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
                <span key={i}>{q}</span>
              ))}
            </div>
          </div>

          {/* Performance Forecast */}
          <div className="card-box chart-card">
            <div className="card-header">
              <h3>Performance Forecast</h3>
              <span className="subtext">AI Predicted</span>
            </div>

            <svg viewBox="0 0 400 160">
              <polyline
                points="20,130 90,100 160,110 230,90 300,80"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3"
              />
            </svg>

            <div className="chart-xlabels">
              {["W1", "W2", "W3", "W4", "W5"].map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
          </div>

          {/* AI summary */}
          <div className="card-box ai-summary">
            <Brain size={28} className="ai-icon" />
            <h3>AI Summary</h3>
            <p>{forecast.summary}</p>

            <button className="btn-primary">Download Full Forecast</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminForecastPage;
