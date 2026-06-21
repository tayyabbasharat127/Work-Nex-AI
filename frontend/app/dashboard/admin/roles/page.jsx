'use client';

import Sidebar from '@/components/Sidebar';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';

export default function AdminRoles() {
  const roles = [
    { id: 1, name: 'Admin', permissions: 15, users: 2, description: 'Full system access' },
    { id: 2, name: 'Manager', permissions: 10, users: 5, description: 'Team management access' },
    { id: 3, name: 'Employee', permissions: 5, users: 2500, description: 'Basic access' },
    { id: 4, name: 'HR', permissions: 12, users: 8, description: 'HR operations access' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Roles & Permissions</h1>
              <p className="text-muted-foreground mt-1">Manage user roles and permissions.</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">
              <Plus size={20} />
              Add Role
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <Shield className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-background rounded-lg transition">
                      <Edit size={18} className="text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-destructive/10 rounded-lg transition">
                      <Trash2 size={18} className="text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Permissions</p>
                    <p className="font-semibold">{role.permissions} granted</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Users</p>
                    <p className="font-semibold">{role.users}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
