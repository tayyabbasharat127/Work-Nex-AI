"use client";

import React, { useEffect, useMemo, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { UserPlus, Edit2, Trash2, Download, X } from "lucide-react";
import "./page.scss";

import {
  createUserApi,
  deleteUserApi,
  getUserApi, // ✅ your api.js exports getUserApi
  updateUserApi,
} from "@/src/api/api";

// ✅ ADD THIS TYPE (was missing)
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Inactive";
  avatar?: string;
  createdAt?: string;
};

type FormState = {
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Inactive";
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "Employee",
  department: "HR",
  status: "Active",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // -----------------------------
  // Helpers
  // -----------------------------
  const normalizeUsers = (list: any[]): UserRow[] => {
    return (list || [])
      .map((u: any) => {
        const id = u.id || u._id || u.userId;
        if (!id) return null;

        const email = u.email ?? "";
        return {
          id: String(id),
          name: u.name ?? "",
          email,
          role: u.role ?? "Employee",
          department: u.department ?? "HR",
          status: (u.status ?? "Active") as "Active" | "Inactive",
          createdAt: u.createdAt,
          avatar:
            u.avatar ||
            `https://i.pravatar.cc/40?u=${encodeURIComponent(email || String(id))}`,
        } as UserRow;
      })
      .filter(Boolean) as UserRow[];
  };

  const openCreate = () => {
    setMode("create");
    setActiveId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
    setError(null);
  };

  const openEdit = (u: UserRow) => {
    setMode("edit");
    setActiveId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      status: u.status,
    });
    setShowModal(true);
    setError(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveId(null);
    setMode("create");
    setForm(EMPTY_FORM);
  };

  // -----------------------------
  // Fetch Users
  // -----------------------------
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ FIX: you have getUserApi, not getUsersApi
      const res = await getUserApi({});

      // axios -> res.data is the body
      // Support shapes:
      // 1) { users: [...] }
      // 2) [...]
      const rawList = Array.isArray(res.data) ? res.data : res.data?.users || [];
      setUsers(normalizeUsers(rawList));
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // KPIs computed from real data
  // -----------------------------
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "Active").length;
    const inactive = total - active;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const newThisMonth = users.filter((u) => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    return [
      { label: "Total Users", value: String(total), trend: "up", change: "" },
      { label: "Active Users", value: String(active), trend: "up", change: "" },
      {
        label: "Inactive Users",
        value: String(inactive),
        trend: "down",
        change: "",
      },
      {
        label: "New This Month",
        value: String(newThisMonth),
        trend: "up",
        change: "",
      },
    ];
  }, [users]);

  // -----------------------------
  // CSV export from fetched users
  // -----------------------------
  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Department", "Status"];
    const rows = users.map((u) => [
      u.name,
      u.email,
      u.role,
      u.department,
      u.status,
    ]);

    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const value = String(cell ?? "");
            if (
              value.includes(",") ||
              value.includes('"') ||
              value.includes("\n")
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "users_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // -----------------------------
  // Create / Update submit
  // -----------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return setError("Name is required.");
    if (!form.email.trim()) return setError("Email is required.");

    try {
      setLoading(true);
      setError(null);

      if (mode === "create") {
        const res = await createUserApi(form);
        const created = res.data?.user || res.data;

        const normalized = normalizeUsers([created])[0];
        if (normalized) setUsers((prev) => [normalized, ...prev]);

        closeModal();
        return;
      }

      if (!activeId) {
        setError("Missing user id for update.");
        return;
      }

      const res = await updateUserApi(activeId, form);
      const updated = res.data?.user || res.data;

      const normalized =
        normalizeUsers([updated])[0] || ({
          id: activeId,
          ...form,
          avatar: `https://i.pravatar.cc/40?u=${encodeURIComponent(form.email)}`,
        } as UserRow);

      setUsers((prev) =>
        prev.map((u) => (u.id === activeId ? { ...u, ...normalized } : u))
      );

      closeModal();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Delete
  // -----------------------------
  const handleDelete = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);

      await deleteUserApi(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="users-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Working...</div>}

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

        <section className="table-section">
          <div className="table-header">
            <h3>Users Overview</h3>
            <div className="table-actions">
              <button
                className="btn-export"
                onClick={exportCSV}
                disabled={loading}
              >
                <Download size={16} /> Export CSV
              </button>
              <button className="btn-add" onClick={openCreate} disabled={loading}>
                <UserPlus size={16} /> Add User
              </button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 20, textAlign: "center" }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <img src={user.avatar} alt={user.name} />
                        <p className="name">{user.name}</p>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.department}</td>
                    <td>
                      <span className={`status ${user.status.toLowerCase()}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="edit-btn"
                          title="Edit"
                          onClick={() => openEdit(user)}
                          disabled={loading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          title="Delete"
                          onClick={() => handleDelete(user.id)}
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{mode === "create" ? "Add New User" : "Edit User"}</h3>
                <button
                  className="close-btn"
                  onClick={closeModal}
                  disabled={loading}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <form className="user-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                      disabled={loading || mode === "edit"}
                    />
                    {mode === "edit" && (
                      <small className="hint">Email is locked in edit mode.</small>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={form.role}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, role: e.target.value }))
                        }
                        disabled={loading}
                      >
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Employee</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Department</label>
                      <select
                        value={form.department}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, department: e.target.value }))
                        }
                        disabled={loading}
                      >
                        <option>HR</option>
                        <option>IT</option>
                        <option>Marketing</option>
                        <option>Finance</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          status: e.target.value as "Active" | "Inactive",
                        }))
                      }
                      disabled={loading}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? "Saving..." : "Save User"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
