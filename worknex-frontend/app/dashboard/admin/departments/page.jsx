'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Edit, Trash2, X, Users, Building2, Briefcase } from 'lucide-react';
import { departmentAPI, userAPI } from '@/lib/api';
import { toast } from 'sonner';

const DEPT_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400', dot: 'bg-blue-500' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-400', dot: 'bg-purple-500' },
  { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'text-green-400', dot: 'bg-green-500' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-400', dot: 'bg-orange-500' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: 'text-pink-400', dot: 'bg-pink-500' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-400', dot: 'bg-cyan-500' },
];

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [deptStats, setDeptStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const [deptData, userData] = await Promise.allSettled([
        departmentAPI.getAll(),
        userAPI.getAll(),
      ]);

      const depts = deptData.status === 'fulfilled'
        ? (Array.isArray(deptData.value) ? deptData.value : [])
        : [];

      // Count employees per department
      const stats = {};
      if (userData.status === 'fulfilled') {
        const users = Array.isArray(userData.value) ? userData.value : (userData.value?.users || []);
        users.forEach(u => {
          if (u.departmentId) {
            stats[u.departmentId] = (stats[u.departmentId] || 0) + 1;
          }
        });
      }

      setDepartments(depts);
      setDeptStats(stats);
    } catch (err) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await departmentAPI.update?.(editingDept.id, formData);
        toast.success('Department updated');
      } else {
        await departmentAPI.create(formData);
        toast.success('Department created');
      }
      closeModal();
      loadDepartments();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department? This cannot be undone.')) return;
    try {
      await departmentAPI.delete?.(id);
      toast.success('Department deleted');
      loadDepartments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({ name: '', description: '' });
  };

  const totalEmployees = Object.values(deptStats).reduce((s, v) => s + v, 0);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        {/* Header */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Departments</h1>
              <p className="text-muted-foreground mt-1">Manage your organization&apos;s departments.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium"
            >
              <Plus size={18} />
              Add Department
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20">
                  <Building2 size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Departments</p>
                  <p className="text-2xl font-bold">{departments.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/20">
                  <Users size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{totalEmployees}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20">
                  <Briefcase size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Team Size</p>
                  <p className="text-2xl font-bold">
                    {departments.length > 0 ? Math.round(totalEmployees / departments.length) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-3 bg-muted rounded w-3/4 mb-6" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Building2 size={48} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-semibold">No departments yet</p>
              <p className="text-muted-foreground text-sm mt-1">Create your first department to get started</p>
              <button onClick={() => setShowModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">
                <Plus size={16} /> Add Department
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept, idx) => {
                const color = DEPT_COLORS[idx % DEPT_COLORS.length];
                const empCount = deptStats[dept.id] || 0;

                return (
                  <div key={dept.id}
                    className={`bg-card border rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group ${color.border}`}>
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${color.bg}`}>
                        <Building2 size={22} className={color.icon} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(dept)}
                          className="p-2 rounded-lg hover:bg-muted transition">
                          <Edit size={15} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(dept.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition">
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* Name & Description */}
                    <h3 className="text-lg font-bold mb-1">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
                      {dept.description || 'No description provided'}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                        <span className="text-sm text-muted-foreground">Active</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Users size={14} className="text-muted-foreground" />
                        <span>{empCount} {empCount === 1 ? 'employee' : 'employees'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">
                  {editingDept ? 'Edit Department' : 'New Department'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Department Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Engineering, Marketing..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description <span className="text-muted-foreground">(optional)</span></label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this department..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium">
                    {editingDept ? 'Save Changes' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
