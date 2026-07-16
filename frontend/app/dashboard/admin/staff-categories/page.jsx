'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Edit, Trash2, X, Users, Clock, Timer } from 'lucide-react';
import { staffCategoryAPI, userAPI } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORY_COLORS = [
  { bg: 'bg-info/10', border: 'border-info/30', icon: 'text-info', dot: 'bg-info' },
  { bg: 'bg-chart-4/10', border: 'border-chart-4/30', icon: 'text-chart-4', dot: 'bg-chart-4' },
  { bg: 'bg-success/10', border: 'border-success/30', icon: 'text-success', dot: 'bg-success' },
  { bg: 'bg-warning/10', border: 'border-warning/30', icon: 'text-warning', dot: 'bg-warning' },
];

const emptyForm = { name: '', lateThresholdTime: '', latesPerAbsence: '', minHoursPerDay: '', minHoursPerWeek: '' };

const toNullableNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

export default function AdminStaffCategories() {
  const [categories, setCategories] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const [catData, userData] = await Promise.allSettled([
        staffCategoryAPI.getAll(),
        userAPI.getAll(),
      ]);

      const cats = catData.status === 'fulfilled' ? (Array.isArray(catData.value) ? catData.value : []) : [];

      const stats = {};
      if (userData.status === 'fulfilled') {
        const users = Array.isArray(userData.value) ? userData.value : (userData.value?.users || []);
        users.forEach((u) => {
          if (u.staffCategoryId) stats[u.staffCategoryId] = (stats[u.staffCategoryId] || 0) + 1;
        });
      }

      setCategories(cats);
      setCategoryStats(stats);
    } catch {
      toast.error('Failed to load staff categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        lateThresholdTime: formData.lateThresholdTime || null,
        latesPerAbsence: toNullableNumber(formData.latesPerAbsence),
        minHoursPerDay: toNullableNumber(formData.minHoursPerDay),
        minHoursPerWeek: toNullableNumber(formData.minHoursPerWeek),
      };
      if (editingCategory) {
        await staffCategoryAPI.update(editingCategory.id, payload);
        toast.success('Staff category updated');
      } else {
        await staffCategoryAPI.create(payload);
        toast.success('Staff category created');
      }
      closeModal();
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      lateThresholdTime: cat.lateThresholdTime || '',
      latesPerAbsence: cat.latesPerAbsence ?? '',
      minHoursPerDay: cat.minHoursPerDay ?? '',
      minHoursPerWeek: cat.minHoursPerWeek ?? '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff category? This cannot be undone.')) return;
    try {
      await staffCategoryAPI.delete(id);
      toast.success('Staff category deleted');
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(emptyForm);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Staff Categories</h1>
              <p className="text-muted-foreground mt-1">Define groups like &quot;Faculty&quot; or &quot;NTS&quot; — each with its own late-arrival rule and weekly-hours target. Optional — leave empty if your organization doesn&apos;t need it.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium whitespace-nowrap"
            >
              <Plus size={18} />
              Add Category
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-3 bg-muted rounded w-3/4 mb-6" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Clock size={48} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-semibold">No staff categories yet</p>
              <p className="text-muted-foreground text-sm mt-1">Create one if you need different late-threshold or hours rules per group of employees</p>
              <button onClick={() => setShowModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">
                <Plus size={16} /> Add Category
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                const empCount = categoryStats[cat.id] || 0;

                return (
                  <div key={cat.id}
                    className={`bg-card border rounded-2xl p-6 hover:shadow-lg transition-all duration-200 group ${color.border}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${color.bg}`}>
                        <Clock size={22} className={color.icon} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(cat)} className="p-2 rounded-lg hover:bg-muted transition">
                          <Edit size={15} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition">
                          <Trash2 size={15} className="text-destructive" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-3">{cat.name}</h3>

                    <div className="space-y-1.5 text-sm text-muted-foreground mb-5">
                      {cat.lateThresholdTime ? (
                        <p>Late after <span className="text-foreground font-medium">{cat.lateThresholdTime}</span></p>
                      ) : (
                        <p>No lateness rule</p>
                      )}
                      {cat.latesPerAbsence && (
                        <p>Every <span className="text-foreground font-medium">{cat.latesPerAbsence}</span> lates = 1 absence</p>
                      )}
                      {cat.minHoursPerWeek && (
                        <p>Target: <span className="text-foreground font-medium">{cat.minHoursPerWeek}</span> hrs/week{cat.minHoursPerDay ? ` (${cat.minHoursPerDay} hrs/day)` : ''}</p>
                      )}
                    </div>

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

        {showModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">{editingCategory ? 'Edit Staff Category' : 'New Staff Category'}</h2>
                <button onClick={closeModal} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Faculty, NTS..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Late After <span className="text-muted-foreground text-xs">(optional)</span></label>
                    <input
                      type="time"
                      value={formData.lateThresholdTime}
                      onChange={(e) => setFormData({ ...formData, lateThresholdTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lates → 1 Absence <span className="text-muted-foreground text-xs">(optional)</span></label>
                    <input
                      type="number" min="1"
                      value={formData.latesPerAbsence}
                      onChange={(e) => setFormData({ ...formData, latesPerAbsence: e.target.value })}
                      placeholder="e.g. 3"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hrs/Day Target <span className="text-muted-foreground text-xs">(optional)</span></label>
                    <input
                      type="number" min="0" step="0.5"
                      value={formData.minHoursPerDay}
                      onChange={(e) => setFormData({ ...formData, minHoursPerDay: e.target.value })}
                      placeholder="e.g. 8"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hrs/Week Target <span className="text-muted-foreground text-xs">(optional)</span></label>
                    <input
                      type="number" min="0" step="0.5"
                      value={formData.minHoursPerWeek}
                      onChange={(e) => setFormData({ ...formData, minHoursPerWeek: e.target.value })}
                      placeholder="e.g. 40"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Timer size={14} className="mt-0.5 shrink-0" />
                  Hours targets are for reporting only — no leave/pay is auto-deducted for falling short.
                </p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium">
                    {editingCategory ? 'Save Changes' : 'Create Category'}
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
