"use client";

import React, { useState } from "react";
import SidebarManager from "@/src/app/components/sideBar/manager/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  CalendarDays,
  Users,
  TrendingUp,
  FileDown,
  Filter,
  Building2,
  UserCheck,
  UserX,
} from "lucide-react";
import "./page.css";

const ManagerAttendancePage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");

  // Fake Employee Attendance Data
  const attendance = [
    {
      name: "Jane Cooper",
      email: "jane.cooper@worknex.ai",
      department: "Engineering",
      status: "Present",
      checkIn: "09:12 AM",
      checkOut: "05:44 PM",
      hours: "8h 32m",
      avatar: "https://i.pravatar.cc/40?img=7",
    },
    {
      name: "John Smith",
      email: "john.smith@worknex.ai",
      department: "Engineering",
      status: "Late",
      checkIn: "10:04 AM",
      checkOut: "06:20 PM",
      hours: "7h 16m",
      avatar: "https://i.pravatar.cc/40?img=4",
    },
    {
      name: "Emily Davis",
      email: "emily.davis@worknex.ai",
      department: "HR",
      status: "Absent",
      checkIn: "-",
      checkOut: "-",
      hours: "-",
      avatar: "https://i.pravatar.cc/40?img=12",
    },
    {
      name: "Michael Lee",
      email: "michael.lee@worknex.ai",
      department: "Management",
      status: "Present",
      checkIn: "09:02 AM",
      checkOut: "05:50 PM",
      hours: "8h 48m",
      avatar: "https://i.pravatar.cc/40?img=3",
    },
  ];

  const filtered = attendance.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());

    const matchDept = dept === "All" || dept === emp.department;
    const matchStatus = status === "All" || status === emp.status;

    return matchSearch && matchDept && matchStatus;
  });

  const kpis = [
    {
      label: "Present Today",
      value: attendance.filter((e) => e.status === "Present").length,
      icon: <UserCheck size={20} />,
    },
    {
      label: "Absent",
      value: attendance.filter((e) => e.status === "Absent").length,
      icon: <UserX size={20} />,
    },
    {
      label: "Total Employees",
      value: attendance.length,
      icon: <Users size={20} />,
    },
  ];

  return (
    <div className="manager-attendance">
      <SidebarManager />

      <main className="main-content">
        {/* Search bar */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Heading */}
        <div className="page-heading">
          <h1>Attendance Overview</h1>
          <p>Track team daily attendance, hours worked, and monthly trends.</p>
        </div>

        {/* KPIs */}
        <section className="kpi-grid">
          {kpis.map((k, i) => (
            <div key={i} className="kpi-card">
              <div className="icon">{k.icon}</div>
              <div>
                <h4>{k.label}</h4>
                <p className="value">{k.value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Attendance Chart */}
        <section className="chart-box card-box">
          <div className="card-header">
            <h3>Monthly Attendance Trend</h3>
            <span className="subtext">Last 6 Months</span>
          </div>

          <svg viewBox="0 0 400 160" className="line-chart">
            <polyline
              points="30,120 90,80 150,100 210,70 270,90 330,60"
              fill="none"
              className="line-attendance"
              strokeWidth="3"
            />
          </svg>

          <div className="chart-xlabels">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className="filters card-box">
          <div className="filters-row">
            {/* Search */}
            <div className="filter-input">
              <CalendarDays size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Department Filter */}
            <div className="filter-select">
              <Building2 size={18} />
              <select value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Management">Management</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-select">
              <Filter size={18} />
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
              </select>
            </div>

            {/* Export Button */}
            <button className="export-btn">
              <FileDown size={18} /> Export CSV
            </button>
          </div>
        </section>

        {/* Attendance Table */}
        <section className="attendance-table card-box">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hours</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((emp, i) => (
                <tr key={i}>
                  <td>
                    <div className="user-info">
                      <img src={emp.avatar} alt={emp.name} />
                      <div>
                        <p className="name">{emp.name}</p>
                        <p className="email">{emp.email}</p>
                      </div>
                    </div>
                  </td>

                  <td>{emp.department}</td>

                  <td>
                    <span className={`status-badge ${emp.status.toLowerCase()}`}>
                      {emp.status}
                    </span>
                  </td>

                  <td>{emp.checkIn}</td>
                  <td>{emp.checkOut}</td>
                  <td>{emp.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default ManagerAttendancePage;
