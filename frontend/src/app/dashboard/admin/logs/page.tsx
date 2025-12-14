"use client";

import React from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function LogsPage() {
  const stats = [
    { label: "Total Logs", value: "1,248", trend: "up", change: "+3.2%" },
    { label: "Errors", value: "42", trend: "down", change: "-1.5%" },
    { label: "Warnings", value: "76", trend: "up", change: "+4.1%" },
    { label: "System Actions", value: "1,130", trend: "up", change: "+2.4%" },
  ];

  const logs = [
    {
      type: "info",
      icon: <Info size={16} color="#6C5CE7" />,
      message: "User John logged in successfully.",
      time: "2m ago",
    },
    {
      type: "success",
      icon: <CheckCircle size={16} color="#22C55E" />,
      message: "Database backup completed successfully.",
      time: "10m ago",
    },
    {
      type: "warning",
      icon: <AlertTriangle size={16} color="#FF8C42" />,
      message: "Unusual login attempt detected.",
      time: "15m ago",
    },
    {
      type: "error",
      icon: <XCircle size={16} color="#EF4444" />,
      message: "ETL job failed to complete due to timeout.",
      time: "1h ago",
    },
    {
      type: "info",
      icon: <FileText size={16} color="#6C5CE7" />,
      message: "Employee data export generated.",
      time: "2h ago",
    },
  ];

  return (
    <div className="logs-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* KPI Section */}
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

        {/* Logs Table */}
        <section className="table-section">
          <div className="table-header">
            <h3>System Activity Logs</h3>
            <div className="filters">
              <select>
                <option>All</option>
                <option>Info</option>
                <option>Warning</option>
                <option>Error</option>
                <option>Success</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className={log.type}>
                  <td>
                    <div className="log-type">
                      <span className="icon">{log.icon}</span>
                      <span className="badge">{log.type}</span>
                    </div>
                  </td>
                  <td>{log.message}</td>
                  <td>{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
