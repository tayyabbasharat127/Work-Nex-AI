'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Edit, Trash2, Shield, X } from 'lucide-react';
import { rolesAPI } from '@/lib/api';
import { toast } from 'sonner';

const ASSIGNABLE_TIERS = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [formData, setFormData] = useState({ name: '', tier: 'MANAGER', permissions: [] });

  async function loadData() {
    try {
      setLoading(true);
      const [roleList, permissions] = await Promise.all([
        rolesAPI.getAll(),
        rolesAPI.getPermissions(),
      ]);
      setRoles(Array.isArray(roleList) ? roleList : []);
      setPermissionCatalog(Array.isArray(permissions) ? permissions : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRole(null);
    setFormData({ name: '', tier: 'MANAGER', permissions: [] });
    setShowModal(true);
  };

  const handleOpenEditModal = (role) => {
    setEditingRole(role);
    setFormData({ name: role.name, tier: role.tier, permissions: role.permissions || [] });
    setShowModal(true);
  };

  const togglePermission = (key) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await rolesAPI.update(editingRole.id, {
          name: editingRole.isSystem ? undefined : formData.name,
          tier: editingRole.isSystem ? undefined : formData.tier,
          permissions: formData.permissions,
        });
        toast.success('Role updated');
      } else {
        await rolesAPI.create(formData);
        toast.success('Role created');
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleOpenDeleteModal = (role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await rolesAPI.delete(roleToDelete.id);
      toast.success('Role deleted');
      setShowDeleteModal(false);
      setRoleToDelete(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-4xl">
              <h1 className="text-3xl font-bold">Roles & Permissions</h1>
              <p className="text-muted-foreground mt-1">
                Built-in roles (Admin/Manager/Employee) always exist. Create custom roles with their
                own name and capabilities — they still inherit access scope from the tier you pick.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus size={20} />
              Add Role
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading roles...</div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/20">
                        <Shield className="text-primary" size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{role.name}</h3>
                          {role.isSystem && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">Built-in</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Access scope: {role.tier}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEditModal(role)} className="p-2 hover:bg-background rounded-lg transition">
                        <Edit size={18} className="text-muted-foreground" />
                      </button>
                      {!role.isSystem && (
                        <button onClick={() => handleOpenDeleteModal(role)} className="p-2 hover:bg-destructive/10 rounded-lg transition">
                          <Trash2 size={18} className="text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-6">
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-1">Permissions</p>
                      <p className="font-semibold break-words">
                        {role.permissions?.length ? role.permissions.join(', ') : 'None (scope-only access)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Users</p>
                      <p className="font-semibold">{role._count?.users ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                <h2 className="text-xl font-bold">{editingRole ? 'Edit Role' : 'Add New Role'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium mb-2">Role Name</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystem}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                    placeholder="e.g. Dean, Registrar, HOD"
                  />
                  {editingRole?.isSystem && (
                    <p className="text-xs text-muted-foreground mt-1">Built-in role names can&apos;t be changed.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Access Scope</label>
                  <select
                    disabled={editingRole?.isSystem}
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                  >
                    {ASSIGNABLE_TIERS.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Determines whose data this role can see: Admin (org-wide), Manager (own team), Employee (self only).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="space-y-2 rounded-xl border border-border p-3">
                    {permissionCatalog.map((perm) => (
                      <label key={perm.key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium">{perm.label}</span>
                          <span className="block text-xs text-muted-foreground">{perm.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                  >
                    {editingRole ? 'Update Role' : 'Add Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && roleToDelete && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-destructive" />
                </div>
                <h2 className="text-xl font-bold mb-2">Delete Role</h2>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{roleToDelete.name}</span>?
                  This is blocked if any user is still assigned to it.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
