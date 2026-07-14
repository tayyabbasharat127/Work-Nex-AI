'use client';

import { Eye, Edit, Trash2 } from 'lucide-react';
import { getRoleName } from '@/lib/helpers';

export default function UsersTable({ loading, paginatedUsers, departments, onView, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="text-center py-12 text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left py-4 px-6 font-semibold">User</th>
            <th className="text-left py-4 px-6 font-semibold">Role</th>
            <th className="text-left py-4 px-6 font-semibold">Department</th>
            <th className="text-center py-4 px-6 font-semibold">Status</th>
            <th className="text-left py-4 px-6 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paginatedUsers.map((user) => (
            <tr key={user.id} className="hover:bg-muted/30 transition">
              <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  user.role_id === 1 ? 'bg-destructive/20 text-destructive' :
                  user.role_id === 2 ? 'bg-success/20 text-success' :
                  user.role_id === 3 ? 'bg-warning/20 text-warning' :
                  'bg-info/20 text-info'
                }`}>
                  {user.roleName || getRoleName(user.role_id)}
                </span>
              </td>
              <td className="py-4 px-6 text-muted-foreground">
                {departments.find(d => d.id === user.department_id)?.name || 'N/A'}
              </td>
              <td className="py-4 px-6 text-center">
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${
                  user.status === 'Active'
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {user.status}
                </span>
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onView(user)}
                    className="p-2 hover:bg-primary/10 rounded-lg transition group"
                  >
                    <Eye size={16} className="text-muted-foreground group-hover:text-primary" />
                  </button>
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 hover:bg-accent/10 rounded-lg transition group"
                  >
                    <Edit size={16} className="text-muted-foreground group-hover:text-accent" />
                  </button>
                  <button
                    onClick={() => onDelete(user)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition group"
                  >
                    <Trash2 size={16} className="text-muted-foreground group-hover:text-destructive" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
