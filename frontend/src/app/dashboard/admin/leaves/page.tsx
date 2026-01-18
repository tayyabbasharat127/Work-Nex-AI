"use client";

import React, { useEffect, useMemo, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";

import {
  getAllLeavesApi,
  updateLeaveStatusApi,
  deleteLeaveApi, // ✅ included now
} from "@/src/api/api";

type LeaveRow = {
  id: string;
  employee: string;
  type: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  status: "Approved" | "Pending" | "Rejected" | string;
  createdAt?: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar: current month
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const monthLabel = today.toLocaleString("en-US", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // -----------------------------
  // Normalize backend response
  // -----------------------------
  const normalizeLeaves = (list: any[]): LeaveRow[] => {
    return (list || [])
      .map((l: any) => {
        const id = l.leave_id || l.id || l._id;
        if (!id) return null;

        const start = l.start_date || l.from || l.startDate;
        const end = l.end_date || l.to || l.endDate;

        return {
          id: String(id),
          employee: l.user_name || l.employee_name || l.employee || l.name || "—",
          type: l.leave_type || l.type || "—",
          startDate: start,
          endDate: end,
          status: l.status || "Pending",
          createdAt: l.created_at || l.createdAt,
        } as LeaveRow;
      })
      .filter(Boolean) as LeaveRow[];
  };

  // -----------------------------
  // Fetch Admin leaves
  // -----------------------------
  const loadLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getAllLeavesApi();
      const rawList = Array.isArray(res.data?.leaves) ? res.data.leaves : res.data?.data || [];
      setLeaves(normalizeLeaves(rawList));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load leaves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // KPI stats computed from data
  // -----------------------------
  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l) => String(l.status).toLowerCase() === "approved").length;
    const pending = leaves.filter((l) => String(l.status).toLowerCase() === "pending").length;
    const rejected = leaves.filter((l) => String(l.status).toLowerCase() === "rejected").length;

    return [
      { label: "Total Requests", value: String(total), trend: "up", change: "" },
      { label: "Approved", value: String(approved), trend: "up", change: "" },
      { label: "Pending", value: String(pending), trend: "down", change: "" },
      { label: "Rejected", value: String(rejected), trend: "down", change: "" },
    ];
  }, [leaves]);

  // -----------------------------
  // Calendar day coloring map
  // -----------------------------
  const dayStatusMap = useMemo(() => {
    const map = new Map<number, "approved" | "pending" | "rejected">();

    const statusToClass = (s: string) => {
      const v = s.toLowerCase();
      if (v === "approved") return "approved";
      if (v === "pending") return "pending";
      if (v === "rejected") return "rejected";
      return null;
    };

    const priority = (s: string) => {
      const v = s.toLowerCase();
      if (v === "approved") return 3;
      if (v === "pending") return 2;
      if (v === "rejected") return 1;
      return 0;
    };

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);

    for (const l of leaves) {
      if (!l.startDate || !l.endDate) continue;

      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      const cls = statusToClass(l.status);
      if (!cls) continue;

      // clamp to current month
      const s = start < monthStart ? monthStart : start;
      const e = end > monthEnd ? monthEnd : end;

      const cursor = new Date(s);
      while (cursor <= e) {
        const d = cursor.getDate();
        const existing = map.get(d);

        if (!existing) {
          map.set(d, cls);
        } else {
          if (priority(l.status) > priority(existing)) map.set(d, cls);
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return map;
  }, [leaves, year, month, daysInMonth]);

  // -----------------------------
  // Admin actions
  // -----------------------------
  const handleStatusChange = async (leaveId: string, status: "Approved" | "Rejected") => {
    try {
      setLoading(true);
      setError(null);

      await updateLeaveStatusApi(leaveId, { status });

      setLeaves((prev) =>
        prev.map((l) => (l.id === leaveId ? { ...l, status } : l))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (leaveId: string) => {
    const ok = window.confirm("Delete this leave request?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);

      await deleteLeaveApi(leaveId);
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete leave.");
    } finally {
      setLoading(false);
    }
  };

  // Recent table (top 8)
  const recentLeaves = useMemo(() => {
    return [...leaves]
      .sort((a, b) => {
        const da = new Date(a.createdAt || a.startDate).getTime();
        const db = new Date(b.createdAt || b.startDate).getTime();
        return db - da;
      })
      .slice(0, 8);
  }, [leaves]);

  const formatShort = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="leave-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Working...</div>}

        {/* Summary Cards */}
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

        {/* Leave Calendar + Table */}
        <section className="leave-grid">
          <div className="calendar-card">
            <div className="calendar-header">
              <h3>
                Leave Calendar — {monthLabel} {year}
              </h3>
            </div>

            <div className="calendar-weekdays">
              {weekdays.map((day, i) => (
                <span key={i}>{day}</span>
              ))}
            </div>

            <div className="calendar-days">
              {days.map((d) => {
                const statusClass = dayStatusMap.get(d) || "";
                return (
                  <div key={d} className={`calendar-day ${statusClass}`}>
                    {d}
                  </div>
                );
              })}
            </div>

            <div className="legend">
              <span className="approved-dot"></span> Approved
              <span className="pending-dot"></span> Pending
              <span className="rejected-dot"></span> Rejected
            </div>
          </div>

          <div className="table-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>Recent Leave Requests</h3>
              <button className="btn-refresh" onClick={loadLeaves} disabled={loading}>
                Refresh
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th style={{ width: 260 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {!loading && recentLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 20, textAlign: "center" }}>
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  recentLeaves.map((l) => {
                    const statusLower = String(l.status).toLowerCase();
                    return (
                      <tr key={l.id}>
                        <td>{l.employee}</td>
                        <td>{l.type}</td>
                        <td>{formatShort(l.startDate)}</td>
                        <td>{formatShort(l.endDate)}</td>
                        <td className={statusLower}>{l.status}</td>

                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {statusLower === "pending" ? (
                              <>
                                <button
                                  className="btn-approve"
                                  disabled={loading}
                                  onClick={() => handleStatusChange(l.id, "Approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-reject"
                                  disabled={loading}
                                  onClick={() => handleStatusChange(l.id, "Rejected")}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span style={{ opacity: 0.7, padding: "6px 0" }}>—</span>
                            )}

                            <button
                              className="btn-delete"
                              disabled={loading}
                              onClick={() => handleDelete(l.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
