"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import "./page.scss";

// ✅ import from your existing api.js (adjust path if needed)
import { getAttendanceOverviewApi } from "@/src/api/api";

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

type EmployeeRow = {
  name: string;
  department: string;
  status: "Present" | "Absent" | "Late" | string;
};

export default function AttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>("October");

  // ✅ API-driven state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [todayData, setTodayData] = useState<Record<string, unknown> | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, unknown> | null>(null);

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

  // ✅ Load data from backend
  const loadAttendance = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAttendanceOverviewApi();
      
      // Backend returns: { success: true, data: [{ user_id, name, email, department, attendance_status, check_in_time, check_out_time }] }
      const employees = res.data?.data || [];
      
      // Calculate stats
      const total = employees.length;
      const present = employees.filter((e: { attendance_status: string }) => 
        e.attendance_status === 'Present' || e.attendance_status === 'Late'
      ).length;
      const absent = total - present;
      const avgAttendance = total > 0 ? Math.round((present / total) * 100) : 0;
      
      setTodayData({
        totalEmployees: total,
        averageAttendance: `${avgAttendance}%`,
        absentToday: absent,
        employees: employees
      });
      
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  // load on first render
  useEffect(() => {
    const init = async () => {
      await loadAttendance();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload when month changes (only if you want month-based history)
  useEffect(() => {
    const init = async () => {
      await loadAttendance();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  /**
   * ✅ Map backend response -> UI
   * Because I don’t know your exact controller response shape,
   * I’m providing safe fallbacks.
   */

  // Example ways your API might respond:
  // todayData = { totalEmployees, averageAttendance, absentToday, calendarDays: [{day:10,status:"present"}], employees: [...] }
  // historyData = { employees: [...], calendar: [...] } or historyData = [...]
  const totalEmployees = todayData?.totalEmployees ?? todayData?.total ?? 0;
  const averageAttendance = todayData?.averageAttendance ?? todayData?.avg ?? "—";
  const absentToday = todayData?.absentToday ?? todayData?.absent ?? 0;

  const employees: EmployeeRow[] = useMemo(() => {
    const list = todayData?.employees || [];
    
    return Array.isArray(list)
      ? list.map((item: { name?: string; department?: string; attendance_status?: string }) => ({
          name: item?.name || "—",
          department: item?.department || "—",
          status: item?.attendance_status || "Absent",
        }))
      : [];
  }, [todayData]);

  // Calendar status map (day -> className)
  const calendarStatusByDay: Record<number, string> = useMemo(() => {
    // If backend sends calendar info like: [{ day: 10, status: "present" }]
    const calendar = todayData?.calendarDays || historyData?.calendarDays || [];
    const map: Record<number, string> = {};

    if (Array.isArray(calendar)) {
      for (const item of calendar) {
        const d = Number(item?.day);
        const s = String(item?.status || "").toLowerCase();
        if (!Number.isNaN(d) && d > 0) {
          if (s.includes("present")) map[d] = "present";
          else if (s.includes("absent")) map[d] = "absent";
          else if (s.includes("late")) map[d] = "late";
        }
      }
    }

    return map;
  }, [todayData, historyData]);

  const attendanceStats = [
    { title: "Total Employees", value: totalEmployees, trend: "up", change: "" },
    { title: "Average Attendance", value: averageAttendance, trend: "up", change: "" },
    { title: "Absent Today", value: absentToday, trend: "down", change: "" },
  ];

  return (
    <div className="attendance-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        {/* Header */}
        <div className="header">
          <SearchBox />
        </div>

        {/* ✅ Loading / Error */}
        {loading ? <div style={{ marginBottom: 12 }}>Loading...</div> : null}
        {error ? (
          <div style={{ marginBottom: 12, color: "red" }}>
            {error}
          </div>
        ) : null}

        {/* Stats */}
        <div className="stats-row">
          {attendanceStats.map((stat, i) => (
            <div key={i} className="stat-card">
              <h4>{stat.title}</h4>
              <p className="stat-value">{String(stat.value)}</p>

              {/* optional trend UI if you want */}
              {stat.change ? (
                <p className={`stat-trend ${stat.trend}`}>
                  {stat.trend === "up" ? "↑" : "↓"} {stat.change}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {/* Grid Layout */}
        <div className="attendance-grid">
          {/* Calendar Section */}
          <div className="calendar-section">
            <div className="calendar-header">
              <button onClick={() => setSelectedMonth(getPrevMonth(selectedMonth))}>
                ‹
              </button>
              <h3>{selectedMonth}</h3>
              <button onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}>
                ›
              </button>
            </div>

            <div className="calendar-weekdays">
              {weekdays.map((day, idx) => (
                <span key={idx}>{day}</span>
              ))}
            </div>

            <div className="calendar-days">
              {[null, null, null, ...days].map((day, idx) => {
                const statusClass = day ? calendarStatusByDay[day] || "" : "";
                return (
                  <div
                    key={idx}
                    className={`calendar-day ${statusClass}`}
                  >
                    {day}
                  </div>
                );
              })}
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
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 12 }}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, i) => (
                    <tr key={i}>
                      <td>{emp.name}</td>
                      <td>{emp.department}</td>
                      <td className={String(emp.status).toLowerCase()}>
                        {emp.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
