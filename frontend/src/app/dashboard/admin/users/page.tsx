"use client";

import React, { useEffect, useMemo, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { UserPlus, Edit2, Trash2, Download, X } from "lucide-react";
import Image from "next/image";
import "./page.scss";

import {
  createUserApi,
  deleteUserApi,
  getUserApi, // ✅ your api.js exports getUserApi
  updateUserApi,
  getAllDepartmentsApi,
} from "@/src/api/api";

const ROLE_OPTIONS = [
  { value: "1", label: "Admin" },
  { value: "2", label: "Manager" },
  { value: "3", label: "Employee" },
];

type Department = {
  department_id: number;
  name: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleLabel: string;
  departmentId: string;
  departmentName: string;
  status: string;
  managerId: string;
  avatar?: string;
  createdAt?: string;
};

type FormState = {
  name: string;
  email: string;
  roleId: string;
  departmentId: string;
  managerId: string;
  password: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  roleId: ROLE_OPTIONS[2].value,
  departmentId: "",
  managerId: "",
  password: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const departmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d) => {
      map[String(d.department_id)] = d.name;
    });
    return map;
  }, [departments]);

  const roleLabel = (roleId: string) =>
    ROLE_OPTIONS.find((r) => r.value === roleId)?.label ?? "Unknown";

  // -----------------------------
  // Helpers
  // -----------------------------
  const normalizeUsers = (list: unknown[]): UserRow[] => {
    return (list || [])
      .map((u: unknown) => {
        const item = u as Record<string, unknown>;
        const id = item.user_id ?? item.id ?? item.userId;
        if (!id) return null;

        const email = (item.email ?? "") as string;
        const departmentId = item.department_id ? String(item.department_id) : "";
        const roleId = item.role_id ? String(item.role_id) : "";
        return {
          id: String(id),
          name: (item.name ?? "") as string,
          email,
          roleId,
          roleLabel: roleLabel(roleId),
          departmentId,
          departmentName:
            (item.department_name ?? departmentMap[departmentId] ?? "—") as string,
          status: (item.status ?? "active").toString(),
          managerId: item.manager_id ? String(item.manager_id) : "",
          createdAt: (item.created_at || item.createdAt) as string,
          avatar:
            (item.avatar as string) ||
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
      roleId: u.roleId || ROLE_OPTIONS[2].value,
      departmentId: u.departmentId,
      managerId: u.managerId,
      password: "",
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
  // Fetch Users + Departments
  // -----------------------------
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [deptRes, userRes] = await Promise.all([
        getAllDepartmentsApi(),
        getUserApi(),
      ]);

      const deptList = deptRes.data?.data ?? deptRes.data ?? [];
      setDepartments(deptList);

      const rawList = userRes.data?.data ?? userRes.data ?? [];
      setUsers(normalizeUsers(rawList));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(
        err.response?.data?.message || err.message || "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      u.roleLabel,
      u.departmentName,
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
        // Map frontend field names to backend field names
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role_id: form.roleId ? Number(form.roleId) : null,
          department_id: form.departmentId ? Number(form.departmentId) : null,
          manager_id: form.managerId ? Number(form.managerId) : null,
        };
        
        const res = await createUserApi(payload);
        const created = res.data?.user || res.data;

        const normalized = normalizeUsers([created])[0];
        if (!normalized) {
          await loadData();
        } else {
          await loadData();
        }

        closeModal();
        return;
      }

      if (!activeId) {
        setError("Missing user id for update.");
        return;
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role_id: form.roleId ? Number(form.roleId) : null,
        department_id: form.departmentId ? Number(form.departmentId) : null,
        manager_id: form.managerId ? Number(form.managerId) : null,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await updateUserApi(activeId, payload);
      const updated = res.data?.user || res.data;

      const normalized =
        normalizeUsers([updated])[0] || null;

      if (!normalized) {
        await loadData();
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === activeId ? { ...u, ...normalized } : u))
        );
      }

      closeModal();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || "Save failed.");
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
      await loadData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  const managerOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.name || "Unnamed"} (${u.email})`,
      })),
    [users]
  );

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
                        <Image src={user.avatar || "/placeholder.png"} alt={user.name} width={40} height={40} style={{ borderRadius: "50%" }} />
                        <p className="name">{user.name}</p>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.roleLabel}</td>
                    <td>{user.departmentName}</td>
                    <td>
                      <span className={`status ${user.status.toLowerCase()}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
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
          <div 
            className="modal-backdrop" 
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >
            <div className="modal">
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
                        value={form.roleId}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, roleId: e.target.value }))
                        }
                        disabled={loading}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Department</label>
                      <select
                        value={form.departmentId}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, departmentId: e.target.value }))
                        }
                        disabled={loading}
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option
                            key={dept.department_id}
                            value={dept.department_id}
                          >
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Manager (optional)</label>
                    <select
                      value={form.managerId}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, managerId: e.target.value }))
                      }
                      disabled={loading}
                    >
                      <option value="">No manager assigned</option>
                      {managerOptions
                        .filter((m) => m.value !== activeId)
                        .map((mgr) => (
                          <option key={mgr.value} value={mgr.value}>
                            {mgr.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  {mode === "create" || mode === "edit" ? (
                    <div className="form-group">
                      <label>
                        Password{mode === "create" ? " (required)" : " (optional)"}
                      </label>
                      <input
                        type="password"
                        placeholder={
                          mode === "create"
                            ? "Set a temporary password"
                            : "Leave blank to keep current password"
                        }
                        value={form.password}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, password: e.target.value }))
                        }
                        disabled={loading}
                      />
                    </div>
                  ) : null}

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
