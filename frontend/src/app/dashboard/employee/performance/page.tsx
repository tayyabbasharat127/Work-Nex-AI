"use client";

import React from "react";
import Sidebar from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { TrendingUp, BarChart2, LineChart, Brain } from "lucide-react";
import "./page.css";

export default function EmployeePerformancePage() {
  const kpis = [
    { label: "Efficiency %", value: "87%" },
    { label: "Consistency %", value: "82%" },
    { label: "Quality Score", value: "4.5 / 5" },
    { label: "Attendance %", value: "92%" },
    { label: "Final Score", value: "89%" },
  ];

  const performanceTable = [
    {
      week: "Week 1",
      efficiency: "85%",
      consistency: "80%",
      quality: "4.3",
      attendance: "90%",
      score: "86%",
    },
    {
      week: "Week 2",
      efficiency: "88%",
      consistency: "83%",
      quality: "4.6",
      attendance: "94%",
      score: "89%",
    },
    {
      week: "Week 3",
      efficiency: "90%",
      consistency: "82%",
      quality: "4.5",
      attendance: "91%",
      score: "88%",
    },
  ];

  return (
    <div className="employee-performance">
      <Sidebar />

      <main className="main-content">
        {/* HEADER */}
        <div className="header">
          <SearchBox />
        </div>

        {/* PAGE TITLE */}
        <div className="page-heading">
          <h1>Performance</h1>
          <p>Your performance insights and weekly progress.</p>
        </div>

        {/* KPI GRID */}
        <div className="kpi-grid">
          {kpis.map((k, i) => (
            <div className="kpi-card" key={i}>
              <h4>{k.label}</h4>
              <p className="value">{k.value}</p>
            </div>
          ))}
        </div>

        {/* GRID LAYOUT */}
        <div className="perf-grid">
          {/* LEFT COL */}
          <div className="column">
            {/* Radar Chart */}
            <div className="card-box radar-card">
              <h3>KPI Radar Chart</h3>

              <div className="radar-wrapper">
                <svg viewBox="0 0 300 300" className="radar-chart">
                  {/* Background Polygon */}
                  <polygon
                    points="150,40 260,110 220,240 80,240 40,110"
                    fill="#E8EAFF"
                    opacity="0.6"
                  />

                  {/* Performance Polygon */}
                  <polygon
                    points="150,70 240,130 200,220 100,220 60,130"
                    fill="#6C5CE7"
                    opacity="0.7"
                  />
                </svg>
              </div>

              <div className="radar-labels">
                <span>Efficiency</span>
                <span>Quality</span>
                <span>Attendance</span>
                <span>Consistency</span>
                <span>Final Score</span>
              </div>
            </div>

            {/* Weekly Consistency Trend */}
            <div className="card-box chart-card">
              <h3>Weekly Consistency Trend</h3>

              <svg viewBox="0 0 400 200" className="line-chart">
                <polyline
                  points="20,150 80,110 140,130 200,90 260,120 320,80 380,100"
                  fill="none"
                  stroke="#FF8C42"
                  strokeWidth="4"
                />
              </svg>

              <div className="chart-xlabels">
                {["W1", "W2", "W3", "W4", "W5"].map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COL */}
          <div className="column">
            {/* Department Comparison */}
            <div className="card-box bar-card">
              <h3>Department Comparison</h3>

              <div className="bar-container">
                {[
                  { dept: "HR", score: 78 },
                  { dept: "IT", score: 92 },
                  { dept: "Sales", score: 85 },
                  { dept: "Marketing", score: 88 },
                ].map((d, i) => (
                  <div className="bar-row" key={i}>
                    <span>{d.dept}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${d.score}%` }}
                      ></div>
                    </div>
                    <p className="score">{d.score}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="card-box ai-card">
              <div className="ai-header">
                <Brain size={20} />
                <h3>AI Recommendation</h3>
              </div>

              <p className="ai-text">
                Based on your last 4 weeks of performance, the AI suggests:
              </p>

              <div className="ai-box">
                <p>
                  <strong>“Focus on improving Consistency.”</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="card-box perf-table">
          <h3>Weekly Performance Breakdown</h3>

          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Efficiency</th>
                <th>Consistency</th>
                <th>Quality</th>
                <th>Attendance</th>
                <th>Total Score</th>
              </tr>
            </thead>

            <tbody>
              {performanceTable.map((p, i) => (
                <tr key={i}>
                  <td>{p.week}</td>
                  <td>{p.efficiency}</td>
                  <td>{p.consistency}</td>
                  <td>{p.quality}</td>
                  <td>{p.attendance}</td>
                  <td className="score">{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
