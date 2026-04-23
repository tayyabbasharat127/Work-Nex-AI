"use client";

import React, { useState } from "react";
import SidebarManager from "@/src/app/components/sideBar/manager/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  Users,
  UserSearch,
  UserCheck,
  UserX,
  Filter,
  Building2,
} from "lucide-react";
import Image from "next/image";
import "./page.scss";

const ManagerTeamPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const employees = [
    {
      name: "Jane Cooper",
      email: "jane.cooper@worknex.ai",
      role: "Senior Developer",
      department: "Engineering",
      status: "Active",
      lastActive: "2h ago",
      avatar: "https://i.pravatar.cc/40?img=7",
    },
    {
      name: "John Smith",
      email: "john.smith@worknex.ai",
      role: "Frontend Developer",
      department: "Engineering",
      status: "Active",
      lastActive: "5h ago",
      avatar: "https://i.pravatar.cc/40?img=4",
    },
    {
      name: "Emily Davis",
      email: "emily.davis@worknex.ai",
      role: "HR Coordinator",
      department: "HR",
      status: "Inactive",
      lastActive: "3d ago",
      avatar: "https://i.pravatar.cc/40?img=12",
    },
    {
      name: "Michael Lee",
      email: "michael.lee@worknex.ai",
      role: "Project Manager",
      department: "Management",
      status: "Active",
      lastActive: "1h ago",
      avatar: "https://i.pravatar.cc/40?img=3",
    },
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());

    const matchesDept =
      filterDept === "All" || emp.department === filterDept;

    const matchesStatus =
      filterStatus === "All" || emp.status === filterStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const stats = [
    {
      label: "Total Employees",
      value: employees.length,
      icon: <Users size={20} />,
    },
    {
      label: "Active",
      value: employees.filter((emp) => emp.status === "Active").length,
      icon: <UserCheck size={20} />,
    },
    {
      label: "Inactive",
      value: employees.filter((emp) => emp.status === "Inactive").length,
      icon: <UserX size={20} />,
    },
  ];

  return (
    <div className="manager-team">
      <SidebarManager />

      <main className="main-content">
        {/* Top Search */}
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Team</h1>
          <p>Search, filter, and view all team members under your management.</p>
        </div>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          {stats.map((s, i) => (
            <div key={i} className="kpi-card">
              <div className="icon">{s.icon}</div>
              <div>
                <h4>{s.label}</h4>
                <p className="value">{s.value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* FILTERS */}
        <section className="filters card-box">
          <div className="filters-row">
            <div className="filter-input">
              <UserSearch size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-select">
              <Filter size={18} />
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div className="filter-select">
              <Building2 size={18} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </section>

        {/* TEAM TABLE */}
        <section className="team-table card-box">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, i) => (
                <tr key={i}>
                  <td>
                    <div className="user-info">
                      <Image src={emp.avatar} alt={emp.name} width={40} height={40} style={{ borderRadius: "50%" }} />
                      <div>
                        <p className="name">{emp.name}</p>
                        <p className="email">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{emp.role}</td>
                  <td>{emp.department}</td>
                  <td>
                    <span
                      className={`status-badge ${emp.status.toLowerCase()}`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td>{emp.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default ManagerTeamPage;
