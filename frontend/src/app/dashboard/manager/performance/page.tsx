"use client";

import React, { useState } from "react";
import SidebarManager from "@/src/app/components/sideBar/manager/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import {
  Search,
  Building2,
  TrendingUp,
  Star,
  Users
} from "lucide-react";
import Image from "next/image";
import "./page.scss";

type EmployeePerformance = {
  id: number;
  name: string;
  email: string;
  department: string;
  score: number;
  consistency: number;
  efficiency: number;
  quality: number;
  avatar: string;
};

const ManagerPerformancePage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);

  // FAKE PERFORMANCE DATA
  const team = [
    {
      id: 1,
      name: "Jane Cooper",
      email: "jane.cooper@worknex.ai",
      department: "Engineering",
      score: 92,
      consistency: 88,
      efficiency: 90,
      quality: 94,
      avatar: "https://i.pravatar.cc/40?img=10",
    },
    {
      id: 2,
      name: "John Smith",
      email: "john.smith@worknex.ai",
      department: "HR",
      score: 86,
      consistency: 80,
      efficiency: 85,
      quality: 89,
      avatar: "https://i.pravatar.cc/40?img=5",
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "emily.davis@worknex.ai",
      department: "Engineering",
      score: 78,
      consistency: 74,
      efficiency: 79,
      quality: 77,
      avatar: "https://i.pravatar.cc/40?img=1",
    },
  ];

  // FILTERED LIST
  const filtered = team.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());

    const matchDept = dept === "All" || e.department === dept;

    return matchSearch && matchDept;
  });

  // SORT BY SCORE DESCENDING (Ranking)
  const ranked = [...filtered].sort((a, b) => b.score - a.score);

  return (
    <div className="manager-performance">
      <SidebarManager />

      <main className="main-content">
        {/* Search Bar */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Page Heading */}
        <div className="page-heading">
          <h1>Team Performance</h1>
          <p>View team ranking, performance trends, and department insights.</p>
        </div>

        {/* KPI CARDS */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="icon">
              <TrendingUp size={18} />
            </div>
            <h4>Top Performer Score</h4>
            <p className="value">{Math.max(...team.map((t) => t.score))}</p>
          </div>

          <div className="kpi-card">
            <div className="icon">
              <Star size={18} />
            </div>
            <h4>Average Score</h4>
            <p className="value">
              {Math.round(team.reduce((sum, t) => sum + t.score, 0) / team.length)}
            </p>
          </div>

          <div className="kpi-card">
            <div className="icon">
              <Users />
            </div>
            <h4>Total Team Members</h4>
            <p className="value">{team.length}</p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="filters card-box">
          <div className="filters-row">
            {/* Search */}
            <div className="filter-input">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Department */}
            <div className="filter-select">
              <Building2 size={18} />
              <select value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Management">Management</option>
              </select>
            </div>
          </div>
        </section>

        {/* Ranking Table */}
        <section className="ranking-table card-box">
          <h3 className="table-title">Team Performance Ranking</h3>

          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Score</th>
                <th>Consistency</th>
                <th>Efficiency</th>
                <th>Quality</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              {ranked.map((e, index) => (
                <tr key={e.id}>
                  <td>#{index + 1}</td>

                  <td>
                    <div className="user-info">
                      <Image src={e.avatar} alt={e.name} width={40} height={40} style={{ borderRadius: "50%" }} />
                      <div>
                        <p className="name">{e.name}</p>
                        <p className="email">{e.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="score">{e.score}</td>
                  <td>{e.consistency}%</td>
                  <td>{e.efficiency}%</td>
                  <td>{e.quality}%</td>

                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedEmployee(e)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Charts Section */}
        <section className="charts-grid">
          {/* Trend Line Chart */}
          <div className="card-box chart-card">
            <h3>Team Performance Trend</h3>

            <svg viewBox="0 0 400 160" className="line-chart">
              <polyline
                points="20,120 80,100 140,110 200,85 260,95 320,70"
                className="line-performance"
                fill="none"
                strokeWidth="3"
              />
            </svg>

            <div className="chart-xlabels">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card-box chart-card">
            <h3>Department Comparison</h3>

            <svg viewBox="0 0 400 180" className="bar-chart">
              {[80, 92, 75].map((val, i) => {
                const x = 80 + i * 90;
                const height = val;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={150 - height}
                    width="40"
                    height={height}
                    rx={6}
                    className="bar"
                  />
                );
              })}
            </svg>

            <div className="chart-xlabels">
              <span>Engineering</span>
              <span>HR</span>
              <span>Management</span>
            </div>
          </div>
        </section>

        {/* MODAL */}
        {selectedEmployee && (
          <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
            <div className="modal card-box" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedEmployee.name}</h2>

              <div className="modal-section">
                <strong>Email:</strong> {selectedEmployee.email}
              </div>

              <div className="modal-section">
                <strong>Overall Score:</strong>{" "}
                <span className="highlight">{selectedEmployee.score}</span>
              </div>

              <div className="modal-section">
                <strong>Efficiency:</strong> {selectedEmployee.efficiency}% <br />
                <strong>Consistency:</strong> {selectedEmployee.consistency}% <br />
                <strong>Quality:</strong> {selectedEmployee.quality}% <br />
              </div>

              <button
                className="close-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagerPerformancePage;
