"use client";

import React, { useEffect, useState, useMemo } from "react";
import SidebarSuperAdmin from "../../components/sideBar/superAdmin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";

import {
  getAllUsersApi,
  updateUserRoleApi,
  deleteUserApi,
} from "@/src/api/api";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "User" | "SuperAdmin";
  createdAt?: string;
};

export default function SuperAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // Fetch Admin users
  // -----------------------------
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getAllUsersApi();
      setUsers(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // Admin actions
  // -----------------------------
  const handleRoleChange = async (userId: string, role: "Admin" | "User") => {
    try {
      setLoading(true);
      setError(null);

      await updateUserRoleApi(userId, { role });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update role.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);

      await deleteUserApi(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="super-admin-dashboard">
      <SidebarSuperAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Working...</div>}

        {/* Summary Cards */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <h4>Total Users</h4>
            <div className="kpi-value">{users.length}</div>
          </div>
        </section>

        {/* User Table */}
        <section className="user-grid">
          <div className="table-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3>All Users</h3>
              <button className="btn-refresh" onClick={loadUsers} disabled={loading}>
                Refresh
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {!loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 20, textAlign: "center" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    return (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              className="btn-approve"
                              disabled={loading}
                              onClick={() => handleRoleChange(u.id, u.role === "User" ? "Admin" : "User")}
                            >
                              Change Role
                            </button>
                            <button
                              className="btn-delete"
                              disabled={loading}
                              onClick={() => handleDelete(u.id)}
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