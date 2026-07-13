'use client';

import { X, Eye, EyeOff } from 'lucide-react';

export default function UserFormModal({
  open, onClose, onSubmit,
  editingUser, loading,
  formData, setFormData,
  showPassword, setShowPassword,
  roles, departments, staffCategories, users,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-first-name" className="block text-sm font-medium mb-2">First Name</label>
              <input
                id="user-first-name"
                type="text"
                required
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                placeholder="e.g. Babar"
              />
            </div>
            <div>
              <label htmlFor="user-last-name" className="block text-sm font-medium mb-2">Last Name</label>
              <input
                id="user-last-name"
                type="text"
                required
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                placeholder="e.g. Azam"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
              placeholder="Enter email address"
            />
          </div>
          <div>
              <label className="block text-sm font-medium mb-2">
                {editingUser ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password (optional)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {editingUser
                  ? 'Leave blank to keep the current password. New password must be at least 6 characters.'
                  : 'Leave empty to auto-generate. User will receive password via email.'}
              </p>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
              >
                {roles.filter(r => r.tier !== 'SUPER_ADMIN').map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value || '' })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select Department</option>
                {Array.isArray(departments) && departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {staffCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Staff Category <span className="text-muted-foreground text-xs">(optional)</span></label>
              <select
                value={formData.staff_category_id}
                onChange={(e) => setFormData({ ...formData, staff_category_id: e.target.value || '' })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">None</option>
                {staffCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                placeholder="e.g. Senior Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {roles.find(r => r.id === formData.roleId)?.tier !== 'MANAGER' && (
            <div>
              <label className="block text-sm font-medium mb-2">Manager</label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || '' })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">No Manager</option>
                {Array.isArray(users) && users
                  .filter(u => u.role === 'MANAGER' && u.id !== editingUser?.id)
                  .map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.roleName})
                    </option>
                  ))}
              </select>
            </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
