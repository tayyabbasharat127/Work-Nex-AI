"use client";

import React, { useState, useEffect } from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  TrendingUp,
  BarChart3,
  Activity,
  Brain,
} from "lucide-react";
import "./page.scss";

const EmployeeForecastPage: React.FC = () => {
  const [forecast] = useState({
    attendance: "94%",
    leaves: "2 days",
    performance: "8.7",
    summary:
      "Your predicted attendance next month is 94% with a significant improvement in consistency and work hours.",
  });

  useEffect(() => {
    // Later: Fetch real forecast from /api/ai/forecast
  }, []);

  const kpis = [
    {
      label: "Predicted Attendance",
      value: forecast.attendance,
      icon: <Activity size={20} />,
    },
    {
      label: "Expected Leave Usage",
      value: forecast.leaves,
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Performance Score Forecast",
      value: forecast.performance,
      icon: <TrendingUp size={20} />,
    },
  ];

  return (
    <div className="forecast-page">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>AI Forecast</h1>
          <p>Predictions for your attendance, leaves, and performance.</p>
        </div>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          {kpis.map((k, idx) => (
            <div key={idx} className="kpi-card">
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
              <h3>Attendance Forecast</h3>
              <span className="subtext">Next 30 days</span>
            </div>

            <svg viewBox="0 0 400 160" className="line-chart">
              <polyline
                points="20,120 70,100 120,90 170,85 220,70 270,65 320,55"
                fill="none"
                stroke="#6C5CE7"
                strokeWidth="3"
              />
            </svg>

            <div className="chart-xlabels">
              {["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
          </div>

          {/* Leave Trend */}
          <div className="card-box chart-card">
            <div className="card-header">
              <h3>Predicted Leave Trend</h3>
              <span className="subtext">Next 3 months</span>
            </div>

            <svg viewBox="0 0 400 160" className="bar-chart">
              {[40, 55, 45].map((h, i) => (
                <rect
                  key={i}
                  x={60 + i * 100}
                  y={140 - h}
                  width={50}
                  height={h}
                  rx={6}
                  fill="#FF8C42"
                />
              ))}
            </svg>

            <div className="chart-xlabels">
              {["Feb", "Mar", "Apr"].map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          </div>

          {/* Performance Forecast */}
          <div className="card-box chart-card">
            <div className="card-header">
              <h3>Performance Growth Forecast</h3>
              <span className="subtext">AI Predicted</span>
            </div>

            <svg viewBox="0 0 400 160" className="mini-line">
              <polyline
                points="20,130 70,100 120,110 170,90 220,95 270,70 320,60"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3"
              />
            </svg>

            <div className="chart-xlabels">
              {["W1", "W2", "W3", "W4"].map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
          </div>

          {/* AI Insight Box */}
          <div className="card-box ai-summary">
            <Brain size={26} className="ai-icon" />
            <h3>AI Insight Summary</h3>
            <p>{forecast.summary}</p>

            <button className="btn-primary">View Full Forecast</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EmployeeForecastPage;
