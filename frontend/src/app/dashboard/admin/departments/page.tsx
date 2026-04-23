"use client";

import React, { useEffect, useState, useMemo } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Plus, Edit2, Trash2, Download, X } from "lucide-react";
import {
  getAllDepartmentsApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi
} from "@/src/api/api";
import "./page.scss";

interface Department {
  department_id: number;
  name: string;
  manager_id: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    manager_id: '',
    description: ''
  });

  // Load departments
  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllDepartmentsApi();
      setDepartments(res.data?.data || res.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // KPI Stats
  const stats = useMemo(() => {
    const total = departments.length;
    const withDescriptions = departments.filter(d => d.description && d.description.trim()).length;
    const withoutDescriptions = total - withDescriptions;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const newThisMonth = departments.filter((d) => {
      if (!d.created_at) return false;
      const date = new Date(d.created_at);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;

    return [
      { label: "Total Departments", value: String(total), trend: "up", change: "" },
      { label: "With Descriptions", value: String(withDescriptions), trend: "up", change: "" },
      { label: "Without Descriptions", value: String(withoutDescriptions), trend: "down", change: "" },
      { label: "New This Month", value: String(newThisMonth), trend: "up", change: "" },
    ];
  }, [departments]);

  // Modal handlers
  const openCreate = () => {
    setMode("create");
    setActiveId(null);
    setFormData({ name: '', manager_id: '', description: '' });
    setShowModal(true);
    setError(null);
  };

  const openEdit = (dept: Department) => {
    setMode("edit");
    setActiveId(dept.department_id);
    setFormData({
      name: dept.name,
      manager_id: dept.manager_id,
      description: dept.description
    });
    setShowModal(true);
    setError(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveId(null);
    setMode("create");
    setFormData({ name: '', manager_id: '', description: '' });
  };

  // Create or update department
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Department name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (mode === "edit" && activeId) {
        await updateDepartmentApi(String(activeId), formData);
      } else {
        await createDepartmentApi(formData);
      }

      await loadDepartments();
      closeModal();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || "Failed to save department");
    } finally {
      setLoading(false);
    }
  };

  // Delete department
  const handleDelete = async (deptId: number) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      setLoading(true);
      setError(null);
      await deleteDepartmentApi(String(deptId));
      await loadDepartments();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ["Name", "Manager ID", "Description", "Created"];
    const rows = departments.map((d) => [
      d.name,
      d.manager_id || "—",
      d.description || "—",
      new Date(d.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const value = String(cell ?? "");
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
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
    link.download = "departments_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="departments-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <div className="banner banner-loading">Working...</div>}

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

        {/* Departments Table */}
        <section className="table-section">
          <div className="table-header">
            <h3>Departments Overview</h3>
            <div className="table-actions">
              <button className="btn-export" onClick={exportCSV} disabled={loading}>
                <Download size={16} /> Export CSV
              </button>
              <button className="btn-add" onClick={openCreate} disabled={loading}>
                <Plus size={16} /> Add Department
              </button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading && departments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 20, textAlign: "center" }}>
                    No departments found.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.department_id}>
                    <td>
                      <strong>{dept.name}</strong>
                    </td>
                    <td style={{ maxWidth: 400 }}>
                      {dept.description ? (
                        <span title={dept.description}>
                          {dept.description.length > 60
                            ? dept.description.substring(0, 60) + "..."
                            : dept.description}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{new Date(dept.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="edit-btn"
                          title="Edit"
                          onClick={() => openEdit(dept)}
                          disabled={loading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          title="Delete"
                          onClick={() => handleDelete(dept.department_id)}
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

        {/* Modal for Create/Edit */}
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
                <h3>{mode === "create" ? "Add New Department" : "Edit Department"}</h3>
                <button className="close-btn" onClick={closeModal} disabled={loading}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <form className="department-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Department Name</label>
                    <input
                      type="text"
                      placeholder="Enter department name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Description (optional)</label>
                    <textarea
                      placeholder="Enter department description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={loading}
                      rows={3}
                    />
                  </div>

                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? "Saving..." : "Save Department"}
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
