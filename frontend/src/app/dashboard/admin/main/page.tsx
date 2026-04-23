"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./page.scss";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { StatsCard } from "@/src/app/components/card/statsCard";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { getAttendanceOverviewApi, getAllLeavesApi } from "@/src/api/api";

interface CalenderDays {
  day: string;
}

type MonthKeys = "October" | "November" | "December";

export default function AdminDashboard() {
  const [currentMonth] = useState<MonthKeys>("October");
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load attendance and leave data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [attendanceRes, leaveRes] = await Promise.all([
          getAttendanceOverviewApi(),
          getAllLeavesApi()
        ]);
        
        setAttendanceData(attendanceRes.data?.data || []);
        setLeaveData(leaveRes.data?.leaves || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate KPI stats
  const stats = useMemo(() => {
    const totalEmployees = attendanceData.length;
    const presentToday = attendanceData.filter(
      (emp) => emp.attendance_status === "Present" || emp.attendance_status === "Late"
    ).length;
    const absentToday = totalEmployees - presentToday;
    
    // Pending leaves
    const pendingLeaves = leaveData.filter(
      (leave) => leave.status === "Pending"
    ).length;

    return [
      {
        value: String(totalEmployees),
        label: "Total Employees",
        trend: "up" as const,
      },
      {
        value: String(presentToday),
        label: "Present Today",
        trend: "up" as const,
        change: totalEmployees > 0 ? `${Math.round((presentToday / totalEmployees) * 100)}%` : "0%",
      },
      {
        value: String(absentToday),
        label: "Absent Today",
        trend: "down" as const,
        change: totalEmployees > 0 ? `${Math.round((absentToday / totalEmployees) * 100)}%` : "0%",
      },
      {
        value: String(pendingLeaves),
        label: "Pending Leave Requests",
        trend: "down" as const,
      },
    ];
  }, [attendanceData, leaveData]);

  const calenderdays: CalenderDays[] = [
    { day: "Mon" },
    { day: "Tue" },
    { day: "Wed" },
    { day: "Thu" },
    { day: "Fri" },
    { day: "Sat" },
    { day: "Sun" },
  ];

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <SidebarAdmin />

      {/* Main Content */}
      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* Page Heading */}
        <div className="page-heading">
          <h1>Admin Dashboard</h1>
          <p className="subheading">
            Overview of analytics, attendance, and performance
          </p>
        </div>

        {loading && <div className="banner banner-loading">Loading dashboard data...</div>}

        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="column left-column">
            {/* Stats Cards */}
            <StatsCard stats={stats} />

            {/* Line Chart */}
            <div className="chart-card">
              <h3>Analytics</h3>
              <div className="chart-controls">
                <span className="control-label">All time</span>
              </div>
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
                  stroke="#FF6B6B"
                  strokeWidth="3"
                />
              </svg>
              <div className="chart-legend">
                <span className="legend-item">
                  <span
                    className="dot"
                    style={{ background: "#6C5CE7" }}
                  ></span>
                  Weekly
                </span>
                <span className="legend-item">
                  <span
                    className="dot"
                    style={{ background: "#FF6B6B" }}
                  ></span>
                  Monthly
                </span>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bar-chart-container">
              <div className="bar-item">
                <span className="bar-label">OCT</span>
                <div className="bar-group">
                  <div
                    className="bar"
                    style={{ width: "70%", background: "#E8EAFF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "85%", background: "#B8C1FF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "65%", background: "#6C5CE7" }}
                  ></div>
                </div>
              </div>
              <div className="bar-item">
                <span className="bar-label">NOV</span>
                <div className="bar-group">
                  <div
                    className="bar"
                    style={{ width: "75%", background: "#E8EAFF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "60%", background: "#B8C1FF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "55%", background: "#6C5CE7" }}
                  ></div>
                </div>
              </div>
              <div className="bar-item">
                <span className="bar-label">DEC</span>
                <div className="bar-group">
                  <div
                    className="bar"
                    style={{ width: "65%", background: "#E8EAFF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "75%", background: "#B8C1FF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "70%", background: "#6C5CE7" }}
                  ></div>
                </div>
              </div>
              <div className="bar-item">
                <span className="bar-label">JAN</span>
                <div className="bar-group">
                  <div
                    className="bar"
                    style={{ width: "60%", background: "#E8EAFF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "55%", background: "#B8C1FF" }}
                  ></div>
                  <div
                    className="bar"
                    style={{ width: "50%", background: "#6C5CE7" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column */}
          <div className="column center-column">
            {/* Calendar */}
            <div className="calendar-card">
              <div className="calendar-header">
                <ChevronLeft size={18} />
                <h3>{currentMonth}</h3>
                <ChevronRight size={18} />
              </div>
              <div className="calendar-weekdays">
                {calenderdays.map((week, idx) => (
                  <span key={idx}>{week.day}</span>
                ))}
              </div>
              <div className="calendar-days">
                {[null, null, null, null, ...calendarDays].map((day, idx) => (
                  <div
                    key={idx}
                    className={`calendar-day ${day === 14 ? "today" : day === 25 ? "selected" : ""
                      }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Card */}
            <div className="progress-card">
              <p className="progress-label">Total Attendance</p>
              <p className="progress-sublabel">Today's Overview</p>
              <div className="circular-progress">
                <svg viewBox="0 0 100 100" className="progress-circle">
                  <circle cx="50" cy="50" r="45" className="progress-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="progress-fill"
                    style={{ 
                      strokeDasharray: attendanceData.length > 0 
                        ? `${(attendanceData.filter(e => e.attendance_status === "Present" || e.attendance_status === "Late").length / attendanceData.length) * 283} 283`
                        : "0 283"
                    }}
                  />
                </svg>
                <span className="progress-text">
                  {attendanceData.length > 0 
                    ? `${Math.round((attendanceData.filter(e => e.attendance_status === "Present" || e.attendance_status === "Late").length / attendanceData.length) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <p className="progress-desc">Attendance Rate Today</p>
              <button className="btn-primary">View Details</button>
            </div>

            {/* Bar Chart Horizontal */}
            <div className="horiz-chart">
              <h4>Display</h4>
              <div className="bars">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <div key={idx} className="bar-row">
                    <span className="day-label">{day}</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${50 + (idx * 8) % 40}%`,
                          background: "#FF8C42",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="column right-column">
            {/* Info Cards */}
            <div className="info-card">
              <h4>Attendance Updates</h4>
              <p className="info-desc">
                {attendanceData.filter(e => e.attendance_status === "Present" || e.attendance_status === "Late").length} present out of {attendanceData.length} employees
              </p>
              <div className="sparklines">
                <svg viewBox="0 0 100 50" className="sparkline">
                  <polyline
                    points="5,35 15,25 25,30 35,15 45,20 55,10 65,18 75,12 85,22 95,15"
                    fill="none"
                    stroke="#6C5CE7"
                    strokeWidth="1.5"
                  />
                  <polygon
                    points="5,35 15,25 25,30 35,15 45,20 55,10 65,18 75,12 85,22 95,15 95,50 5,50"
                    fill="#E8EAFF"
                    opacity="0.5"
                  />
                </svg>
              </div>
            </div>

            <div className="info-card">
              <h4>Leave Requests</h4>
              <p className="info-desc">
                {leaveData.filter(l => l.status === "Pending").length} pending, {leaveData.filter(l => l.status === "Approved").length} approved
              </p>
              <div className="stacked-bars">
                <div className="stacked-bar">
                  <div
                    className="segment"
                    style={{ 
                      flex: leaveData.length > 0 ? String(leaveData.filter(l => l.status === "Approved").length / leaveData.length) : "0.33",
                      background: "#6C5CE7" 
                    }}
                  ></div>
                  <div
                    className="segment"
                    style={{ 
                      flex: leaveData.length > 0 ? String(leaveData.filter(l => l.status === "Pending").length / leaveData.length) : "0.33",
                      background: "#FF8C42" 
                    }}
                  ></div>
                  <div
                    className="segment"
                    style={{ 
                      flex: leaveData.length > 0 ? String(leaveData.filter(l => l.status === "Rejected").length / leaveData.length) : "0.33",
                      background: "#B8C1FF" 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <h4>Consectetuer</h4>
                <span className="period-select">Month</span>
              </div>
              <div className="pie-chart">
                <svg viewBox="0 0 100 100" className="pie">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#FF8C42"
                    strokeWidth="8"
                    strokeDasharray="75 251"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#6C5CE7"
                    strokeWidth="8"
                    strokeDasharray="75 251"
                    strokeDashoffset="-75"
                  />
                </svg>
                <div className="pie-labels">
                  <span>
                    30%
                    <br />
                    <small>Updates</small>
                  </span>
                  <span>
                    70%
                    <br />
                    <small>Updates 2</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
