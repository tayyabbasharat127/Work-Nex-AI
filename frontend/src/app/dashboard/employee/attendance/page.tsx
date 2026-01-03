"use client";

import React, { useEffect, useState } from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { LogIn, LogOut, Download } from "lucide-react";

import {
  checkInApi,
  checkOutApi,
  todayStatusApi,
  historyApi,
  pingApi,
} from "@/src/api/api";

import "./page.scss";

export default function EmployeeAttendancePage() {
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ------------------ FETCH TODAY STATUS ------------------ */
  const fetchTodayStatus = async () => {
    try {
      const res = await todayStatusApi();
      setToday(res.data.attendance || { status: "absent" });
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------ FETCH HISTORY ------------------ */
  const fetchHistory = async () => {
    try {
      const res = await historyApi();
      setHistory(res.data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------ CHECK IN ------------------ */
  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await checkInApi();
      await fetchTodayStatus();
      await fetchHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ CHECK OUT ------------------ */
  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await checkOutApi();
      await fetchTodayStatus();
      await fetchHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Check-out failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ AUTO PING (OPTIONAL) ------------------ */
  useEffect(() => {
    const interval = setInterval(() => {
      pingApi().catch(() => {});
    }, 5 * 60 * 1000); // every 5 mins

    return () => clearInterval(interval);
  }, []);

  /* ------------------ INIT LOAD ------------------ */
  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
  }, []);

  const isCheckedIn = today?.check_in && !today?.check_out;
  const isCheckedOut = today?.check_in && today?.check_out;

  return (
    <div className="employee-attendance">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Attendance</h1>
          <p>View and manage your attendance activity.</p>
        </div>

        {/* CHECK IN / CHECK OUT */}
        <div className="attendance-grid">
          <div className="column">
            <div className="card-box checkin-card">
              <h3>Check In / Check Out</h3>

              <div className="datetime">
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status ${today?.status}`}>
                    {today?.status || "absent"}
                  </span>
                </p>
                <p>
                  <strong>Check In:</strong>{" "}
                  {today?.check_in
                    ? new Date(today.check_in).toLocaleTimeString()
                    : "—"}
                </p>
                <p>
                  <strong>Check Out:</strong>{" "}
                  {today?.check_out
                    ? new Date(today.check_out).toLocaleTimeString()
                    : "—"}
                </p>
              </div>

              <div className="check-buttons">
                <button
                  className="btn checkin"
                  onClick={handleCheckIn}
                  disabled={loading || isCheckedIn || isCheckedOut}
                >
                  <LogIn size={18} />
                  Check In
                </button>

                <button
                  className="btn checkout"
                  onClick={handleCheckOut}
                  disabled={loading || !isCheckedIn}
                >
                  <LogOut size={18} />
                  Check Out
                </button>
              </div>
            </div>
          </div>

          {/* ATTENDANCE HISTORY */}
          <div className="column">
            <div className="card-box table-card">
              <div className="table-header">
                <h3>Attendance History</h3>
                <button className="export-btn">
                  <Download size={16} />
                  Export
                </button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((row, i) => (
                    <tr key={i}>
                      <td>
                        {new Date(row.check_in).toLocaleDateString()}
                      </td>
                      <td>
                        {row.check_in
                          ? new Date(row.check_in).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td>
                        {row.check_out
                          ? new Date(row.check_out).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td>
                        <span className={`status ${row.status}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        No attendance records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
