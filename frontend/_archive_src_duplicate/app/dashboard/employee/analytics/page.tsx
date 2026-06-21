"use client";

import React, { useState } from "react";

import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Activity, BarChart3, Cpu, Send } from "lucide-react";
import "./page.scss";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";

const EmployeeAnalyticsPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([{ role: "assistant", text: "Hi! I’m the WorkNex Assistant. Ask me about your attendance, leaves, or performance.", },]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: query.trim() },
      {
        role: "assistant",
        text: "Sample insight: Your attendance this quarter is 93% and your leave usage is within policy limits.",
      },
    ]);
    setQuery("");
  };

  const kpis = [
    { label: "Attendance %", value: "93%", icon: <Activity size={18} /> },
    { label: "Leave %", value: "7%", icon: <BarChart3 size={18} /> },
    { label: "Productivity Index", value: "8.4", icon: <Cpu size={18} /> },
  ];

  return (
    <div className="employee-analytics">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Analytics</h1>
          <p>
            Power BI & AI insights for your attendance, leaves, and
            productivity.
          </p>
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

        {/* MAIN GRID */}
        <section className="analytics-grid">
          {/* LEFT SIDE – Power BI + Charts */}
          <div className="left-column">
            {/* Power BI Embed */}
            <div className="card-box powerbi-card">
              <div className="card-header">
                <h3>Personal Analytics Dashboard</h3>
                <span className="badge">Power BI</span>
              </div>
              {/* Replace iframe src with real embed URL later */}
              <div className="powerbi-embed">
                <iframe
                  title="Employee Analytics"
                  src="about:blank"
                  aria-label="Power BI Embed Placeholder"
                />
                <p className="powerbi-placeholder">
                  Power BI embed will appear here using{" "}
                  <code>/api/analytics/embed-url</code>.
                </p>
              </div>
            </div>

            {/* Attendance vs Performance */}
            <div className="card-box chart-card">
              <div className="card-header">
                <h3>Attendance vs Performance</h3>
              </div>
              <div className="chart-legend">
                <span>
                  <span className="dot dot-attendance" /> Attendance
                </span>
                <span>
                  <span className="dot dot-performance" /> Performance
                </span>
              </div>
              <svg viewBox="0 0 400 200" className="combo-chart">
                {/* X-axis bars – Attendance */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const x = 40 + i * 60;
                  const height = 60 + i * 10;
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={170 - height}
                      width={28}
                      height={height}
                      rx={4}
                      className="bar-attendance"
                    />
                  );
                })}
                {/* Line – Performance */}
                <polyline
                  points="54,130 114,110 174,105 234,95 294,90"
                  fill="none"
                  className="line-performance"
                  strokeWidth="3"
                />
              </svg>
              <div className="chart-xlabels">
                {["Q1", "Q2", "Q3", "Q4", "Q5"].map((q, i) => (
                  <span key={i}>{q}</span>
                ))}
              </div>
            </div>

            {/* Leave Trend */}
            <div className="card-box chart-card">
              <div className="card-header">
                <h3>Leave Trend</h3>
                <span className="subtext">Last 6 months</span>
              </div>
              <svg viewBox="0 0 400 160" className="line-chart">
                <polyline
                  points="30,120 90,80 150,100 210,70 270,90 330,60"
                  fill="none"
                  className="line-leave"
                  strokeWidth="3"
                />
              </svg>
              <div className="chart-xlabels">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE – AI Assistant */}
          <div className="right-column">
            <div className="card-box ai-card">
              <div className="card-header">
                <h3>Ask WorkNex Assistant</h3>
                <span className="subtext">
                  Example: “How many leaves did I take this quarter?”
                </span>
              </div>

              <div className="ai-messages">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`ai-message ${m.role === "user" ? "user" : "assistant"
                      }`}
                  >
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              <form className="ai-input-row" onSubmit={handleAsk}>
                <input
                  type="text"
                  placeholder='Ask a question like "What is my attendance trend?"'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit">
                  <Send size={16} /> Ask
                </button>
              </form>

              <div className="api-hint">
                Uses <code>/api/ai/query</code> with your personal analytics
                data.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EmployeeAnalyticsPage;
