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
  getLeaveBalanceApi,
} from "@/src/api/api";

type LeaveRow = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
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

type LeaveBalance = {
  remaining_annual?: number;
  used_annual?: number;
  annual_balance?: number;
  remaining_sick?: number;
  used_sick?: number;
  sick_balance?: number;
  remaining_casual?: number;
  used_casual?: number;
  casual_balance?: number;
  [key: string]: unknown;
};

type CreateLeavePayload = {
  leave_type: string;
  start_date: string;
  end_date: string;
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  // Load leave balance
  const loadLeaveBalance = async () => {
    try {
      const res = await getLeaveBalanceApi();
      setLeaveBalance(res.data?.data || res.data);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("Error loading leave balance:", err.message || e);
    }
  };

  // Load my leaves
  const loadMyLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getMyLeavesApi();
      console.log("Leaves API response:", res.data);

      // Support various response shapes
      const rawList = Array.isArray(res.data)
        ? res.data
        : res.data?.leaves || res.data?.data || [];

      setLeaves(normalizeLeaves(rawList));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      console.error("Error loading leaves:", err.message || e);
      setError(err.response?.data?.message || err.message || "Failed to load your leaves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyLeaves();
    loadLeaveBalance();
  }, []);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // KPI calculations
  const kpi = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l) => l.status.toLowerCase() === "approved").length;

    const pending = leaves.filter((l) => l.status.toLowerCase() === "pending").length;
    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0;

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

  const handleCreateLeave = async (payload: CreateLeavePayload) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      console.log("Submitting leave request:", payload);
      const res = await createLeaveApi(payload);
      console.log("Create leave response:", res.data);

      const created = res.data?.leave || res.data?.data || res.data;

      // Add to state optimistically
      if (created) {
        const normalized = normalizeLeaves([created]);
        if (normalized.length > 0) {
          setLeaves((prev) => [normalized[0], ...prev]);
        }
      }

      // Switch to history tab and refresh
      setActiveTab("history");
      setSuccessMsg("Leave request submitted successfully!");

      // Refresh data from server
      await loadMyLeaves();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } }; message?: string };
      console.error("Error creating leave:", err.message || e);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to submit leave request."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    const ok = window.confirm("Are you sure you want to cancel this leave request?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      console.log("Canceling leave:", leaveId);
      await deleteLeaveApi(leaveId);

      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      setSuccessMsg("Leave request cancelled successfully!");

      // Refresh to ensure sync with server
      await loadMyLeaves();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } }; message?: string };
      console.error("Error canceling leave:", err.message || e);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to cancel leave."
      );
    } finally {
      setLoading(false);
    }
  };

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

        {error && (
          <div className="banner banner-error">
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 10 }}>×</button>
          </div>
        )}

        {successMsg && (
          <div className="banner banner-success">
            {successMsg}
            <button onClick={() => setSuccessMsg(null)} style={{ marginLeft: 10 }}>×</button>
          </div>
        )}

        {loading && <div className="banner banner-loading">Working...</div>}

        {/* Leave Balance Cards */}
        {leaveBalance && (
          <div className="balance-grid">
            <div className="balance-card">
              <h4>Annual Leave</h4>
              <p className="remaining">{leaveBalance.remaining_annual || 0} days</p>
              <small>Used: {leaveBalance.used_annual || 0} / Total: {leaveBalance.annual_balance || 20}</small>
            </div>
            <div className="balance-card">
              <h4>Sick Leave</h4>
              <p className="remaining">{leaveBalance.remaining_sick || 0} days</p>
              <small>Used: {leaveBalance.used_sick || 0} / Total: {leaveBalance.sick_balance || 10}</small>
            </div>
            <div className="balance-card">
              <h4>Casual Leave</h4>
              <p className="remaining">{leaveBalance.remaining_casual || 0} days</p>
              <small>Used: {leaveBalance.used_casual || 0} / Total: {leaveBalance.casual_balance || 7}</small>
            </div>
          </div>
        )}

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
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {activeTab === "apply" ? (
          <ApplyLeaveForm loading={loading} onCreate={handleCreateLeave} />
        ) : (
          <LeaveHistory
            loading={loading}
            history={history}
            onCancel={handleCancelLeave}
          />
        )}
      </main>
    </div>
  );
}

// -----------------------------
// Helpers
// -----------------------------
function normalizeLeaves(list: unknown[]): LeaveRow[] {
  if (!Array.isArray(list)) {
    console.warn("normalizeLeaves received non-array:", list);
    return [];
  }

  return list
    .map((l: unknown) => {
      const item = l as Record<string, unknown>;
      const id = item.leave_id || item.id || item._id;
      if (!id) {
        console.warn("Leave item missing ID:", l);
        return null;
      }

      const start = item.start_date || item.from || item.startDate;
      const end = item.end_date || item.to || item.endDate;

      const type = item.type || item.leave_type || "Casual";

      return {
        id: String(id),
        type: type as string,
        startDate: start as string,
        endDate: end as string,
        status: (item.status || "Pending") as string,
        comments: (item.comments || item.admin_comment || "") as string,
        reason: (item.reason || "") as string,
        createdAt: (item.createdAt || item.created_at) as string,
      } as LeaveRow;
    })
    .filter(Boolean) as LeaveRow[];
}

function formatShort(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// ---------------- APPLY LEAVE COMPONENT ----------------
function ApplyLeaveForm({
  loading,
  onCreate,
}: {
  loading: boolean;
  onCreate: (payload: CreateLeavePayload) => Promise<void>;
}) {
  const [form, setForm] = useState<ApplyFormState>(EMPTY_FORM);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.startDate) {
      alert("Start date is required.");
      return;
    }
    if (!form.endDate) {
      alert("End date is required.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      alert("End date cannot be before start date.");
      return;
    }
    if (!form.reason.trim()) {
      alert("Reason is required.");
      return;
    }

    try {
      setSubmitting(true);

      // Submit to backend
      await onCreate({
        leave_type: form.type,
        start_date: form.startDate,
        end_date: form.endDate,
        reason: form.reason.trim(),
      });

      // Reset form on success
      setForm(EMPTY_FORM);
      setFileName("");
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
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
            disabled={loading || submitting}
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
              disabled={loading || submitting}
              required
            />
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              disabled={loading || submitting}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <textarea
            placeholder="Explain your leave reason..."
            value={form.reason}
            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            disabled={loading || submitting}
            required
            rows={4}
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
              disabled={loading || submitting}
            />
          </div>
          <small className="hint">
            File upload requires backend multipart support (multer).
          </small>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || submitting}
        >
          {submitting ? "Submitting..." : "Submit Leave Request"}
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
        <p style={{ fontSize: 14, opacity: 0.7, marginTop: 5 }}>
          {history.length} total request{history.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Comments</th>
              <th style={{ width: 140 }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {!loading && history.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ opacity: 0.6 }}>No leave requests found.</p>
                  <small>Click &quot;Apply Leave&quot; to create your first request.</small>
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
                      <span className={`status ${status}`}>
                        {h.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      {h.reason ? (
                        <span title={h.reason}>
                          {h.reason.length > 50
                            ? h.reason.substring(0, 50) + "..."
                            : h.reason}
                        </span>
                      ) : (
                        "—"
                      )}
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
                        <span style={{ opacity: 0.5 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}