"use client";

import React, { useState } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Clock, CalendarCheck, LogIn, LogOut, Download } from "lucide-react";

import "./page.scss";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";

export default function EmployeeAttendancePage() {
  // KPI DATA
  const kpis = [
    { label: "Working Days (This Month)", value: "22" },
    { label: "Days Present", value: "19" },
    { label: "Days Absent", value: "3" },
    { label: "Avg Daily Hours", value: "7.4h" },
  ];

  // sample attendance records
  const attendance = [
    {
      date: "Jan 18, 2025",
      checkIn: "09:02 AM",
      checkOut: "05:46 PM",
      hours: "8h 44m",
      status: "Present",
    },
    {
      date: "Jan 17, 2025",
      checkIn: "—",
      checkOut: "—",
      hours: "—",
      status: "Absent",
    },
    {
      date: "Jan 16, 2025",
      checkIn: "09:10 AM",
      checkOut: "05:30 PM",
      hours: "8h 20m",
      status: "Present",
    },
  ];

  return (
    <div className="employee-attendance">
      <SidebarEmployee />

      <main className="main-content">
        {/* Header */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Page Title */}
        <div className="page-heading">
          <h1>Attendance</h1>
          <p>View and manage your attendance activity.</p>
        </div>

        {/* KPI GRID */}
        <div className="kpi-grid">
          {kpis.map((k, i) => (
            <div className="kpi-card" key={i}>
              <h4>{k.label}</h4>
              <p className="kpi-value">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="attendance-grid">
          {/* LEFT COLUMN */}
          <div className="column">
            {/* Check-in / Check-out */}
            <div className="card-box checkin-card">
              <h3>Check In / Check Out</h3>

              <div className="datetime">
                <p>
                  <strong>Date:</strong> Jan 18, 2025
                </p>
                <p>
                  <strong>Time:</strong> 09:02 AM
                </p>
              </div>

              <div className="geo">
                <p>
                  <strong>IP:</strong> 192.168.1.10
                </p>
                <p>
                  <strong>Location:</strong> Karachi, PK
                </p>
              </div>

              <div className="check-buttons">
                <button className="btn checkin">
                  <LogIn size={18} />
                  Check In
                </button>
                <button className="btn checkout">
                  <LogOut size={18} />
                  Check Out
                </button>
              </div>
            </div>

            {/* Monthly Attendance Trend */}
            <div className="card-box chart-card">
              <h3>Monthly Attendance Trend</h3>
              <svg viewBox="0 0 400 200" className="line-chart">
                <polyline
                  points="20,150 60,100 100,120 140,80 180,110 220,60 260,100 300,70 340,90 380,80"
                  fill="none"
                  stroke="#6C5CE7"
                  strokeWidth="4"
                />
              </svg>
              <div className="chart-xlabels">
                {["W1", "W2", "W3", "W4", "W5"].map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
            </div>

            {/* Weekly Attendance % */}
            <div className="card-box chart-card">
              <h3>Weekly Attendance %</h3>

              <div className="bar-container">
                {[75, 92, 88, 96, 81].map((val, idx) => (
                  <div key={idx} className="bar-row">
                    <span>W{idx + 1}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${val}%` }}
                      ></div>
                    </div>
                    <p className="bar-value">{val}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ATTENDANCE TABLE */}
          <div className="column">
            <div className="card-box table-card">
              <div className="table-header">
                <h3>Attendance History</h3>
                <button className="export-btn">
                  <Download size={16} />
                  Export Report
                </button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {attendance.map((a, i) => (
                    <tr key={i}>
                      <td>{a.date}</td>
                      <td>{a.checkIn}</td>
                      <td>{a.checkOut}</td>
                      <td>{a.hours}</td>
                      <td>
                        <span className={`status ${a.status.toLowerCase()}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
