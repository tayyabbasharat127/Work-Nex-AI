"use client";

import React, { useEffect, useState } from "react";
import SidebarAdmin from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

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
      const res = await getAllDepartmentsApi();
      setDepartments(res.data?.data || res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Create or update department
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      if (editingDept) {
        // Update existing department
        await updateDepartmentApi(String(editingDept.department_id), formData);
        setSuccessMsg("Department updated successfully!");
      } else {
        // Create new department
        await createDepartmentApi(formData);
        setSuccessMsg("Department created successfully!");
      }
      
      // Reset form and reload
      setFormData({ name: '', manager_id: '', description: '' });
      setEditingDept(null);
      await loadDepartments();
      
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to save department");
    } finally {
      setLoading(false);
    }
  };

  // Edit department
  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      manager_id: dept.manager_id,
      description: dept.description
    });
  };

  // Delete department
  const handleDelete = async (deptId: number) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    try {
      setLoading(true);
      await deleteDepartmentApi(String(deptId));
      setSuccessMsg("Department deleted successfully!");
      await loadDepartments();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to delete department");
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingDept(null);
    setFormData({ name: '', manager_id: '', description: '' });
  };

  return (
    <div className="departments-dashboard">
      <SidebarAdmin />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>Department Management</h1>
          <p>Manage organization departments</p>
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
        
        {loading && <div className="banner banner-loading">Processing...</div>}

        {/* Department Form */}
        <div className="card-box">
          <h3>{editingDept ? 'Edit Department' : 'Create New Department'}</h3>
          <form className="department-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Department Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter department name"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Manager ID</label>
                <input
                  type="text"
                  value={formData.manager_id}
                  onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                  placeholder="Enter manager ID"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter department description"
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Saving..." : (editingDept ? "Update Department" : "Create Department")}
              </button>
              {editingDept && (
                <button type="button" className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Departments List */}
        <div className="card-box">
          <h3>Departments ({departments.length})</h3>
          <div className="departments-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Manager ID</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: "center" }}>
                      <p style={{ opacity: 0.6 }}>No departments found.</p>
                      <small>Create your first department using the form above.</small>
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.department_id}>
                      <td>
                        <strong>{dept.name}</strong>
                      </td>
                      <td>{dept.manager_id || '—'}</td>
                      <td style={{ maxWidth: 300 }}>
                        {dept.description ? (
                          <span title={dept.description}>
                            {dept.description.length > 50 
                              ? dept.description.substring(0, 50) + "..." 
                              : dept.description}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{new Date(dept.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(dept)}
                            disabled={loading}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(dept.department_id)}
                            disabled={loading}
                          >
                            🗑️ Delete
                          </button>
                        </div>
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
