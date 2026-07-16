'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Radix SelectItem can't take an empty-string value, so optional fields
// (department/staff category/manager can all be cleared back to "none")
// use this sentinel and translate to/from '' at the form-data boundary.
const NONE = '__none__';

export default function UserFormModal({
  open, onClose, onSubmit,
  editingUser, loading,
  formData, setFormData,
  showPassword, setShowPassword,
  roles, departments, staffCategories, users,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex-1 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="user-first-name" className="mb-2 block text-sm font-medium text-foreground">First Name</label>
              <Input
                id="user-first-name"
                type="text"
                required
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="e.g. Babar"
              />
            </div>
            <div>
              <label htmlFor="user-last-name" className="mb-2 block text-sm font-medium text-foreground">Last Name</label>
              <Input
                id="user-last-name"
                type="text"
                required
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="e.g. Azam"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-11 rounded-xl"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Employee ID <span className="text-xs text-muted-foreground">(must match the biometric device PIN, if enrolled)</span>
            </label>
            <Input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="h-11 rounded-xl"
              placeholder="Leave blank to auto-generate"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              {editingUser ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-11 rounded-xl pr-12"
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password (optional)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {editingUser
                ? 'Leave blank to keep the current password. New password must be at least 6 characters.'
                : 'Leave empty to auto-generate. User will receive password via email.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Role</label>
              <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.filter(r => r.tier !== 'SUPER_ADMIN').map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Department</label>
              <Select value={formData.department_id || NONE} onValueChange={(v) => setFormData({ ...formData, department_id: v === NONE ? '' : v })}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Select Department</SelectItem>
                  {Array.isArray(departments) && departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {staffCategories.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Staff Category <span className="text-xs text-muted-foreground">(optional)</span></label>
              <Select value={formData.staff_category_id || NONE} onValueChange={(v) => setFormData({ ...formData, staff_category_id: v === NONE ? '' : v })}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {staffCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Designation</label>
              <Input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="e.g. Senior Developer"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {roles.find(r => r.id === formData.roleId)?.tier !== 'MANAGER' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Manager</label>
                <Select value={formData.manager_id || NONE} onValueChange={(v) => setFormData({ ...formData, manager_id: v === NONE ? '' : v })}>
                  <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="No Manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No Manager</SelectItem>
                    {Array.isArray(users) && users
                      .filter(u => u.role === 'MANAGER' && u.id !== editingUser?.id)
                      .map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} ({manager.roleName})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Joining Date</label>
              <Input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="pt-2 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
