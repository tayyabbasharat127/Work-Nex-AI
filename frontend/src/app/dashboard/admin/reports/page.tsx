"use client";

import React, { useEffect, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { generateReportApi, getReportsApi } from "@/src/api/api";
import "./page.scss";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'attendance',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    format: 'csv'
  });

  // Load reports
  const loadReports = async () => {
    try {
      const res = await getReportsApi();
      setReports(res.data?.data || res.data);
    } catch (e: any) {
      console.error("Error loading reports:", e);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Generate report
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      const res = await generateReportApi(formData);
      setSuccessMsg(`Report generated successfully: ${res.data?.data?.filename}`);
      
      // Refresh reports list
      await loadReports();
      
      // Reset form
      setFormData({
        ...formData,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Reports</h1>
          <p>Generate and download reports</p>
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
        
        {loading && <div className="banner banner-loading">Generating report...</div>}

        {/* Report Generation Form */}
        <div className="card-box">
          <h3>Generate New Report</h3>
          <form className="report-form" onSubmit={handleGenerateReport}>
            <div className="form-row">
              <div className="form-group">
                <label>Report Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  disabled={loading}
                >
                  <option value="attendance">Attendance Report</option>
                  <option value="leaves">Leave Report</option>
                </select>
              </div>

              <div className="form-group">
                <label>Format</label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({...formData, format: e.target.value})}
                  disabled={loading}
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Department (Optional)</label>
              <input
                type="text"
                value={formData.departmentId}
                onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                placeholder="Enter department ID"
                disabled={loading}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </form>
        </div>

        {/* Reports History */}
        <div className="card-box">
          <h3>Generated Reports</h3>
          <div className="reports-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Generated By</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center" }}>
                      <p style={{ opacity: 0.6 }}>No reports generated yet.</p>
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.report_id}>
                      <td>{report.name}</td>
                      <td>
                        <span className="report-type">{report.type}</span>
                      </td>
                      <td>
                        <span className={`status ${report.status.toLowerCase()}`}>
                          {report.status}
                        </span>
                      </td>
                      <td>{report.generated_by_name || 'Unknown'}</td>
                      <td>{new Date(report.created_at).toLocaleString()}</td>
                      <td>
                        {report.status === 'completed' ? (
                          <button className="download-btn">
                            📥 Download
                          </button>
                        ) : (
                          <span style={{ opacity: 0.5 }}>Processing...</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
