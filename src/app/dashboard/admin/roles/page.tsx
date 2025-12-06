"use client";

import React from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Users, Shield, UserCog, UserPlus } from "lucide-react";
import "./page.scss";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";

export default function RolesPage() {
  const stats = [
    { label: "Total Roles", value: "8", trend: "up", change: "+1" },
    { label: "Admins", value: "3", trend: "up", change: "+1" },
    { label: "Managers", value: "12", trend: "down", change: "-2" },
    { label: "Employees", value: "84", trend: "up", change: "+5" },
  ];

  const roles = [
    {
      name: "Administrator",
      users: 3,
      permissions: "Full access to system & settings",
      color: "#6C5CE7",
    },
    {
      name: "Manager",
      users: 12,
      permissions: "Manage teams, view analytics, approve leave",
      color: "#FF8C42",
    },
    {
      name: "Employee",
      users: 84,
      permissions: "View tasks, mark attendance, request leave",
      color: "#22C55E",
    },
    {
      name: "HR",
      users: 4,
      permissions: "Manage recruitment, leaves, and payroll",
      color: "#B8C1FF",
    },
    {
      name: "Finance",
      users: 2,
      permissions: "Access reports and manage invoices",
      color: "#FFE4D1",
    },
  ];

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
            <h3>Roles Overview</h3>
            <button className="btn-add">
              <UserPlus size={16} /> Add Role
            </button>
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
              {roles.map((role, i) => (
                <tr key={i}>
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
