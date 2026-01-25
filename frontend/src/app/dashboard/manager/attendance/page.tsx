"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { getAttendanceOverviewApi } from "@/src/api/api";
import "./page.css";

type AttendanceRecord = {
  user_id: string;
  name: string;
  email: string;
  department_name: string;
  attendance_status: string;
  check_in: string | null;
  check_out: string | null;
};

const statusBadgeClass = (status: string) => {
  const value = status?.toLowerCase();
  if (value === "present") return "present";
  if (value === "late") return "late";
  if (value === "early_leave") return "early_leave";
  if (value === "absent") return "absent";
  return "unknown";
};

const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString() : "—";

const ManagerAttendancePage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.department_name) {
        set.add(r.department_name);
      }
    });
    return Array.from(set).sort();
  }, [records]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getAttendanceOverviewApi();
        const list: AttendanceRecord[] = (res.data?.data ?? res.data ?? []).map(
          (row: any) => ({
            user_id: String(row.user_id),
            name: row.name ?? "—",
            email: row.email ?? "",
            department_name: row.department_name ?? "Unassigned",
            attendance_status: (row.attendance_status ?? "absent").toString(),
            check_in: row.check_in ?? null,
            check_out: row.check_out ?? null,
          })
        );
        setRecords(list);
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase());

      const matchDept =
        dept === "All" || dept === emp.department_name || (!emp.department_name && dept === "Unassigned");
      const matchStatus =
        status === "All" || status.toLowerCase() === emp.attendance_status.toLowerCase();

      return matchSearch && matchDept && matchStatus;
    });
  }, [records, search, dept, status]);

  const kpis = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.attendance_status.toLowerCase() === "present").length;
    const absent = records.filter((r) => r.attendance_status.toLowerCase() === "absent").length;
    return [
      {
        label: "Present Today",
        value: present,
        icon: <UserCheck size={20} />,
      },
      {
        label: "Absent",
        value: absent,
        icon: <UserX size={20} />,
      },
      {
        label: "Total Employees",
        value: total,
        icon: <Users size={20} />,
      },
    ];
  }, [records]);

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
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-select">
              <Filter size={18} />
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="early_leave">Early Leave</option>
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
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                    Loading attendance...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#e11d48" }}>
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.user_id}>
                    <td>
                      <div className="user-info">
                        <div className="avatar-fallback">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="name">{emp.name}</p>
                          <p className="email">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td>{emp.department_name}</td>

                    <td>
                      <span
                        className={`status-badge ${statusBadgeClass(emp.attendance_status)}`}
                      >
                        {emp.attendance_status.replace("_", " ")}
                      </span>
                    </td>

                    <td>{formatTime(emp.check_in)}</td>
                    <td>{formatTime(emp.check_out)}</td>
                    <td>
                      {emp.check_in && emp.check_out
                        ? `${(
                            (new Date(emp.check_out).getTime() - new Date(emp.check_in).getTime()) /
                            (1000 * 60 * 60)
                          ).toFixed(1)}h`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default ManagerAttendancePage;
