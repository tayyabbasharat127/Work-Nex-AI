"use client";

import React, { useEffect, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { getKPIsApi, getTrendsApi, getDepartmentAnalyticsApi } from "@/src/api/api";
import "./page.scss";

export default function AnalyticsPage() {
  const [kpiData, setKpiData] = useState<{ totalEmployees?: number; presentToday?: number; absentToday?: number; onLeaveToday?: number; attendanceRate?: number } | null>(null);
  const [trendsData, setTrendsData] = useState<{ date: string; total: number; present: number; absent: number; late: number }[]>([]);
  const [departmentData, setDepartmentData] = useState<{ department: string; total_employees: number; present_today: number; on_leave_today: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load KPIs
  const loadKPIs = async () => {
    try {
      const res = await getKPIsApi();
      setKpiData(res.data?.data || res.data);
    } catch (e: unknown) {
      console.error("Error loading KPIs:", e);
      setError("Failed to load KPIs");
    }
  };

  // Load Trends
  const loadTrends = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await getTrendsApi({ startDate, endDate });
      setTrendsData(res.data?.data || res.data);
    } catch (e: unknown) {
      console.error("Error loading trends:", e);
    }
  };

  // Load Department Analytics
  const loadDepartmentAnalytics = async () => {
    try {
      const res = await getDepartmentAnalyticsApi();
      setDepartmentData(res.data?.data || res.data);
    } catch (e: unknown) {
      console.error("Error loading department analytics:", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadKPIs(), loadTrends(), loadDepartmentAnalytics()]);
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="analytics-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Analytics Dashboard</h1>
          <p>Real-time insights and performance metrics</p>
        </div>

        {error && (
          <div className="banner banner-error">
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 10 }}>×</button>
          </div>
        )}

        {loading && <div className="banner banner-loading">Loading analytics...</div>}

        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpiData && (
            <>
              <div className="kpi-card">
                <h4>Total Employees</h4>
                <p className="value">{kpiData.totalEmployees || 0}</p>
              </div>
              <div className="kpi-card">
                <h4>Present Today</h4>
                <p className="value present">{kpiData.presentToday || 0}</p>
              </div>
              <div className="kpi-card">
                <h4>Absent Today</h4>
                <p className="value absent">{kpiData.absentToday || 0}</p>
              </div>
              <div className="kpi-card">
                <h4>On Leave Today</h4>
                <p className="value leave">{kpiData.onLeaveToday || 0}</p>
              </div>
              <div className="kpi-card">
                <h4>Attendance Rate</h4>
                <p className="value">{kpiData.attendanceRate || 0}%</p>
              </div>
            </>
          )}
        </div>

        {/* Department Analytics */}
        <div className="card-box">
          <h3>Department Analytics</h3>
          <div className="department-grid">
            {departmentData.map((dept, index) => (
              <div key={index} className="dept-card">
                <h4>{dept.department}</h4>
                <div className="dept-stats">
                  <div className="stat">
                    <span className="label">Total:</span>
                    <span className="value">{dept.total_employees}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Present:</span>
                    <span className="value present">{dept.present_today}</span>
                  </div>
                  <div className="stat">
                    <span className="label">On Leave:</span>
                    <span className="value leave">{dept.on_leave_today}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Trends */}
        <div className="card-box">
          <h3>Attendance Trends (Last 7 Days)</h3>
          <div className="trends-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {trendsData.map((trend, index) => (
                  <tr key={index}>
                    <td>{new Date(trend.date).toLocaleDateString()}</td>
                    <td>{trend.total}</td>
                    <td className="present">{trend.present}</td>
                    <td className="absent">{trend.absent}</td>
                    <td className="late">{trend.late}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
