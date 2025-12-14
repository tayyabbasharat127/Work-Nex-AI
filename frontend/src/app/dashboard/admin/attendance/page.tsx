"use client";

import React, { useState } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

const monthMap = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
} as const;

type MonthKey = keyof typeof monthMap;

export default function AttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>("October");

  const attendanceStats = [
    { title: "Total Employees", value: 54, trend: "up", change: "+3.8%" },
    { title: "Average Attendance", value: "92%", trend: "up", change: "+1.4%" },
    { title: "Absent Today", value: 3, trend: "down", change: "-0.6%" },
  ];

  const employees = [
    { name: "Taha Junaid", department: "HR", status: "Present" },
    { name: "Usman Ghani", department: "Finance", status: "Absent" },
    { name: "Anas Mirza", department: "Engineering", status: "Present" },
    { name: "Tayyab Basharat", department: "Marketing", status: "Late" },
  ];

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // helper functions to change months safely
  const getPrevMonth = (month: MonthKey): MonthKey => {
    const months = Object.keys(monthMap) as MonthKey[];
    const index = months.indexOf(month);
    return months[(index - 1 + months.length) % months.length];
  };

  const getNextMonth = (month: MonthKey): MonthKey => {
    const months = Object.keys(monthMap) as MonthKey[];
    const index = months.indexOf(month);
    return months[(index + 1) % months.length];
  };

  return (
    <div className="attendance-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        {/* Header */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Stats */}
        <div className="stats-row">
          {attendanceStats.map((stat, i) => (
            <div key={i} className="stat-card">
              <h4>{stat.title}</h4>
              <p className="stat-value">{stat.value}</p>
              <p className={`stat-trend ${stat.trend}`}>
                {stat.trend === "up" ? "↑" : "↓"} {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Grid Layout */}
        <div className="attendance-grid">
          {/* Calendar Section */}
          <div className="calendar-section">
            <div className="calendar-header">
              <button
                onClick={() => setSelectedMonth(getPrevMonth(selectedMonth))}
              >
                ‹
              </button>
              <h3>{selectedMonth}</h3>
              <button
                onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
              >
                ›
              </button>
            </div>

            <div className="calendar-weekdays">
              {weekdays.map((day, idx) => (
                <span key={idx}>{day}</span>
              ))}
            </div>

            <div className="calendar-days">
              {[null, null, null, ...days].map((day, idx) => (
                <div
                  key={idx}
                  className={`calendar-day ${
                    day === 10
                      ? "present"
                      : day === 12
                      ? "absent"
                      : day === 15
                      ? "late"
                      : ""
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Table */}
          <div className="table-section">
            <h3>Employee Attendance</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={i}>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td className={emp.status.toLowerCase()}>{emp.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
