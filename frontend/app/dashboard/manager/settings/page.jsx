'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Save, Lock } from 'lucide-react';

export default function ManagerSettings() {
  const [settings, setSettings] = useState({
    email: 'manager@example.com',
    department: 'IT Department',
    language: 'English',
    notifications: true
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences.</p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Department</label>
                <input
                  type="text"
                  value={settings.department}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-muted-foreground"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleChange('notifications', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Enable Notifications</span>
              </label>
              <div className="pt-6 border-t border-border">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">
                  <Save size={20} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
