"use client";

import React from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  CalendarCheck,
  Bell,
  LogIn,
  LogOut,
} from "lucide-react";

import "./page.scss";

export default function EmployeeDashboard() {
  const kpis = [
    { label: "Attendance % (This Month)", value: "92%" },
    { label: "Leaves Remaining", value: "07" },
    { label: "Performance Score", value: "4.6" },
    { label: "Hours Worked This Week", value: "38h" },
    { label: "Next Leave Date", value: "Jan 22" },
  ];

  const notifications = [
    { text: "Your leave request is approved.", time: "2h ago" },
    { text: "You checked in at 9:03 AM.", time: "5h ago" },
    { text: "Performance report updated.", time: "1d ago" },
  ];

  const today = {
    checkIn: "09:03 AM",
    checkOut: "—",
    totalHours: "—",
  };

  return (
    <div className="employee-dashboard">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <h1 className="page-title">Employee Dashboard</h1>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          {kpis.map((k, i) => (
            <div className="kpi-card" key={i}>
              <h4>{k.label}</h4>
              <p className="kpi-value">{k.value}</p>
            </div>
          ))}
        </section>

        {/* MAIN GRID */}
        <div className="dashboard-grid">
          {/* LEFT COLUMN */}
          <div className="column">
            <div className="card-box">
              <h3>Attendance Trend</h3>
              <svg viewBox="0 0 400 200" className="line-chart">
                <polyline
                  points="20,150 60,120 100,130 140,100 180,110 220,90 260,100 300,80 340,90 380,120"
                  fill="none"
                  stroke="#6C5CE7"
                  strokeWidth="4"
                />
              </svg>
            </div>

            <div className="card-box">
              <h3>Leave History</h3>
              <div className="bars">
                {["W1", "W2", "W3", "W4", "W5", "W6", "W7"].map((w, i) => (
                  <div key={i} className="bar-row">
                    <span>{w}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${20 + i * 10}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div className="column">
            <div className="card-box">
              <h3>Performance Growth</h3>
              <svg viewBox="0 0 100 50" className="sparkline">
                <polyline
                  points="5,40 20,25 35,30 50,15 65,20 80,10 95,18"
                  fill="none"
                  stroke="#FF8C42"
                  strokeWidth="3"
                />
              </svg>
            </div>

            <div className="card-box summary-card">
              <h3>Today&apos;s Summary</h3>
              <div className="summary-grid">
                <div>
                  <h4>Check In</h4>
                  <p>{today.checkIn}</p>
                </div>
                <div>
                  <h4>Check Out</h4>
                  <p>{today.checkOut}</p>
                </div>
                <div>
                  <h4>Total Hours</h4>
                  <p>{today.totalHours}</p>
                </div>
              </div>
            </div>

            <div className="card-box actions-card">
              <h3>Quick Actions</h3>
              <button className="action-btn">
                <CalendarCheck size={18} />
                Apply Leave
              </button>
              <button className="action-btn">
                <LogIn size={18} />
                Check In
              </button>
              <button className="action-btn">
                <LogOut size={18} />
                Check Out
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="column">
            <div className="card-box notif-card">
              <h3>Recent Notifications</h3>

              {notifications.map((n, i) => (
                <div key={i} className="notif-item">
                  <Bell size={18} className="notif-icon" />
                  <div>
                    <p className="notif-text">{n.text}</p>
                    <span className="notif-time">{n.time}</span>
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
