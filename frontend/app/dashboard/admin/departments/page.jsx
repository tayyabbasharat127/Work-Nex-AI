'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { departmentAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
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
      const data = await departmentAPI.getAll();
      // Map department_id to id for frontend compatibility
      const mappedDepts = Array.isArray(data) ? data.map(dept => ({
        ...dept,
        id: dept.department_id || dept.id
      })) : [];
      setDepartments(mappedDepts);
    } catch (err) {
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await departmentAPI.update(editingDept.department_id || editingDept.id, formData);
        toast.success('Department updated successfully');
      } else {
        await departmentAPI.create(formData);
        toast.success('Department created successfully');
      }
      setShowModal(false);
      setFormData({ name: '', description: '' });
      setEditingDept(null);
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
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted successfully');
      loadDepartments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete department');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Departments</h1>
              <p className="text-muted-foreground mt-1">Manage organization departments.</p>
            </div>
            <button 
              onClick={() => {
                setEditingDept(null);
                setFormData({ name: '', description: '' });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus size={20} />
              Add Department
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No departments found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {departments.map((dept) => (
                <div key={dept.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold">{dept.name}</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(dept)}
                        className="p-1.5 hover:bg-background rounded transition"
                      >
                        <Edit size={16} className="text-muted-foreground" />
                      </button>
                      <button 
                        onClick={() => handleDelete(dept.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded transition"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {dept.description && (
                      <p className="text-foreground">{dept.description}</p>
                    )}
                    <p><span className="font-semibold text-foreground">ID:</span> {dept.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">
                  {editingDept ? 'Edit Department' : 'Add Department'}
                </h2>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditingDept(null);
                    setFormData({ name: '', description: '' });
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Department Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingDept(null);
                      setFormData({ name: '', description: '' });
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
                  >
                    {editingDept ? 'Update' : 'Create'}
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
