"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { Upload } from "lucide-react";
import "./page.scss";

import {
  createLeaveApi,
  getMyLeavesApi,
  deleteLeaveApi,
} from "@/src/api/api";

type LeaveRow = {
  id: string;
  type: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  status: "Approved" | "Rejected" | "Pending" | string;
  comments?: string;
  reason?: string;
  createdAt?: string;
};

type ApplyFormState = {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const EMPTY_FORM: ApplyFormState = {
  type: "Casual",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function EmployeeLeavesPage() {
  const [activeTab, setActiveTab] = useState<"apply" | "history">("apply");

  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load my leaves
  const loadMyLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getMyLeavesApi();

      // support response shapes:
      // 1) { leaves: [...] }
      // 2) [...]
      const rawList = Array.isArray(res.data) ? res.data : res.data?.leaves || [];
      setLeaves(normalizeLeaves(rawList));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load your leaves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KPI from real data (balance fields are not in your backend routes, so keep those as placeholders unless you add balances API)
  const kpi = useMemo(() => {
    const total = leaves.length;

    const approved = leaves.filter((l) => l.status.toLowerCase() === "approved").length;
    const pending = leaves.filter((l) => l.status.toLowerCase() === "pending").length;

    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Total leaves this year
    const thisYear = new Date().getFullYear();
    const totalThisYear = leaves.filter((l) => {
      const d = new Date(l.startDate);
      return !isNaN(d.getTime()) && d.getFullYear() === thisYear;
    }).length;

    return [
      { label: "Total Leaves (All Time)", value: String(total) },
      { label: "Leaves This Year", value: String(totalThisYear) },
      { label: "Pending Requests", value: String(pending) },
      { label: "Approved Requests", value: String(approved) },
      { label: "Approval Rate", value: `${approvedPct}%` },
    ];
  }, [leaves]);

  // Recent-first history
  const history = useMemo(() => {
    return [...leaves].sort((a, b) => {
      const da = new Date(a.createdAt || a.startDate).getTime();
      const db = new Date(b.createdAt || b.startDate).getTime();
      return db - da;
    });
  }, [leaves]);

  return (
    <div className="employee-leaves">
      <SidebarEmployee />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Leaves</h1>
          <p>Apply for leave and track your requests.</p>
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Working...</div>}

        <div className="kpi-grid">
          {kpi.map((k, i) => (
            <div className="kpi-card" key={i}>
              <h4>{k.label}</h4>
              <p className="value">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="tabs">
          <button
            className={activeTab === "apply" ? "active" : ""}
            onClick={() => setActiveTab("apply")}
          >
            Apply Leave
          </button>
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            Leave History
          </button>

          <button
            className="refresh-btn"
            onClick={loadMyLeaves}
            disabled={loading}
            style={{ marginLeft: "auto" }}
          >
            Refresh
          </button>
        </div>

        {activeTab === "apply" ? (
          <ApplyLeaveForm
            loading={loading}
            onCreate={async (payload) => {
              try {
                setLoading(true);
                setError(null);

                const res = await createLeaveApi(payload);
                const created = res.data?.leave || res.data;

                // Insert optimistically then refresh for truth
                setLeaves((prev) => [normalizeLeaves([created])[0], ...prev].filter(Boolean) as LeaveRow[]);
                setActiveTab("history");
                await loadMyLeaves();
              } catch (e: any) {
                setError(
                  e?.response?.data?.message || e?.message || "Failed to submit leave request."
                );
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (
          <LeaveHistory
            loading={loading}
            history={history}
            onCancel={async (leaveId) => {
              const ok = window.confirm("Cancel this leave request?");
              if (!ok) return;

              try {
                setLoading(true);
                setError(null);

                await deleteLeaveApi(leaveId);
                setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
              } catch (e: any) {
                setError(
                  e?.response?.data?.message || e?.message || "Failed to cancel leave."
                );
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

// -----------------------------
// Helpers
// -----------------------------
function normalizeLeaves(list: any[]): LeaveRow[] {
  return (list || [])
    .map((l: any) => {
      const id = l.leave_id || l.id || l._id;
      if (!id) return null;

      const start = l.start_date || l.from || l.startDate;
      const end = l.end_date || l.to || l.endDate;

      return {
        id: String(id),
        type: l.type || l.leave_type || "—",
        startDate: start,
        endDate: end,
        status: l.status || "Pending",
        comments: l.comments || l.admin_comment || "",
        reason: l.reason || "",
        createdAt: l.createdAt,
      } as LeaveRow;
    })
    .filter(Boolean) as LeaveRow[];
}

function formatShort(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------- APPLY LEAVE COMPONENT ----------------
function ApplyLeaveForm({
  loading,
  onCreate,
}: {
  loading: boolean;
  onCreate: (payload: any) => Promise<void>;
}) {
  const [form, setForm] = useState<ApplyFormState>(EMPTY_FORM);
  const [fileName, setFileName] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
    if (!form.startDate) return alert("Start date is required.");
    if (!form.endDate) return alert("End date is required.");
    if (new Date(form.endDate) < new Date(form.startDate))
      return alert("End date cannot be before start date.");
    if (!form.reason.trim()) return alert("Reason is required.");

    // Backend currently shows JSON routes (no file upload). So we submit JSON only.
    await onCreate({
      type: form.type,
      start_date: form.startDate,
      end_date: form.endDate,
      reason: form.reason,
      // file: not supported unless you add multer in backend
    });

    setForm(EMPTY_FORM);
    setFileName("");
  };

  return (
    <div className="apply-leave card-box">
      <h3>Apply for Leave</h3>

      <form className="leave-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label>Leave Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            disabled={loading}
          >
            <option value="Casual">Casual Leave</option>
            <option value="Sick">Sick Leave</option>
            <option value="Annual">Annual Leave</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <textarea
            placeholder="Explain your leave reason..."
            value={form.reason}
            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Attach File (optional)</label>

          <div className="file-upload">
            <Upload size={18} />
            <span>{fileName || "Upload document"}</span>
            <input
              type="file"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
              disabled={loading}
            />
          </div>

          <small className="hint">
            File upload will work only if backend supports multipart upload (multer).
          </small>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>
    </div>
  );
}

// ---------------- LEAVE HISTORY COMPONENT ----------------
function LeaveHistory({
  history,
  loading,
  onCancel,
}: {
  history: LeaveRow[];
  loading: boolean;
  onCancel: (leaveId: string) => Promise<void>;
}) {
  return (
    <div className="leave-history card-box">
      <div className="history-header">
        <h3>Leave History</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Status</th>
            <th>Comments</th>
            <th style={{ width: 140 }}>Action</th>
          </tr>
        </thead>

        <tbody>
          {!loading && history.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 20, textAlign: "center" }}>
                No leave requests found.
              </td>
            </tr>
          ) : (
            history.map((h) => {
              const status = h.status.toLowerCase();
              const canCancel = status === "pending";

              return (
                <tr key={h.id}>
                  <td>{h.type}</td>
                  <td>{formatShort(h.startDate)}</td>
                  <td>{formatShort(h.endDate)}</td>
                  <td>
                    <span className={`status ${status}`}>{h.status}</span>
                  </td>
                  <td>{h.comments || "—"}</td>
                  <td>
                    {canCancel ? (
                      <button
                        className="btn-cancel"
                        onClick={() => onCancel(h.id)}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    ) : (
                      <span style={{ opacity: 0.7 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
