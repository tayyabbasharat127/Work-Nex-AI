"use client";

import React, { useEffect, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import "./page.scss";
import { getUserApi } from "@/src/api/api";

const SYSTEM_ROLES = [
  { id: "1", name: "Admin", permissions: "Full access to system & settings", color: "#6C5CE7" },
  { id: "2", name: "Manager", permissions: "Manage teams, view analytics, approve leave", color: "#FF8C42" },
  { id: "3", name: "Employee", permissions: "View tasks, mark attendance, request leave", color: "#22C55E" },
];

export default function RolesPage() {
  const [users, setUsers] = useState<{ role_id?: number | string }[]>([]);

  // Load users to count by role
  const loadUsers = async () => {
    try {
      const res = await getUserApi();
      const userList = res.data?.data || res.data || [];
      setUsers(userList);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadUsers();
    };
    init();
  }, []);

  // Count users by role
  const roleCounts = SYSTEM_ROLES.reduce((acc, role) => {
    const count = users.filter((user) => String(user.role_id) === role.id).length;
    acc[role.id] = count;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: "Total Roles", value: String(SYSTEM_ROLES.length), trend: "up", change: "" },
    { label: "Admins", value: String(roleCounts["1"] || 0), trend: "up", change: "" },
    { label: "Managers", value: String(roleCounts["2"] || 0), trend: "up", change: "" },
    { label: "Employees", value: String(roleCounts["3"] || 0), trend: "up", change: "" },
  ];

  const roles = SYSTEM_ROLES.map(role => ({
    ...role,
    users: roleCounts[role.id] || 0,
  }));

  return (
    <div className="roles-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {/* KPI Cards */}
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

        {/* Roles Table */}
        <section className="table-section">
          <div className="table-header">
            <h3>System Roles Overview</h3>
            <div className="table-info">
              <span>These are the three core roles in the system</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Users Assigned</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <div className="role-cell">
                      <div
                        className="role-dot"
                        style={{ background: role.color }}
                      ></div>
                      {role.name}
                    </div>
                  </td>
                  <td>{role.users}</td>
                  <td>{role.permissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
