"use client";

import React from "react";

import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Bell, Mail, AlertTriangle, CheckCircle, Info } from "lucide-react";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function NotificationsPage() {
  const stats = [
    { label: "Total Notifications", value: "248", trend: "up", change: "+5%" },
    { label: "Unread", value: "23", trend: "up", change: "+3%" },
    { label: "Read", value: "225", trend: "down", change: "-1%" },
    { label: "System Alerts", value: "8", trend: "up", change: "+2%" },
  ];

  const notifications = [
    {
      icon: <Bell size={18} color="#6c5ce7" />,
      title: "Attendance Updated",
      desc: "Weekly attendance data has been synced successfully.",
      time: "2m ago",
      type: "success",
    },
    {
      icon: <Mail size={18} color="#ff8c42" />,
      title: "New Message",
      desc: "You have received a message from HR.",
      time: "10m ago",
      type: "info",
    },
    {
      icon: <AlertTriangle size={18} color="#ef4444" />,
      title: "System Alert",
      desc: "Database latency detected. Please review ETL pipeline.",
      time: "25m ago",
      type: "warning",
    },
    {
      icon: <Info size={18} color="#6c5ce7" />,
      title: "Policy Update",
      desc: "Leave policy has been updated. Please review the document.",
      time: "1h ago",
      type: "info",
    },
    {
      icon: <CheckCircle size={18} color="#22c55e" />,
      title: "Backup Completed",
      desc: "Daily system backup completed successfully.",
      time: "2h ago",
      type: "success",
    },
  ];

  return (
    <div className="notifications-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* Stats Section */}
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

        {/* Notifications List */}
        <section className="notifications-list">
          <h3>Recent Notifications</h3>
          {notifications.map((n, i) => (
            <div key={i} className={`notification-item ${n.type}`}>
              <div className="icon">{n.icon}</div>
              <div className="content">
                <h5>{n.title}</h5>
                <p>{n.desc}</p>
                <span className="time">{n.time}</span>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
