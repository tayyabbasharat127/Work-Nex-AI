'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Save, Lock } from 'lucide-react';

export default function EmployeeSettings() {
  const [settings, setSettings] = useState({
    email: 'employee@example.com',
    phone: '+1-234-567',
    language: 'English',
    theme: 'Dark',
    notifications: true
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    alert('Settings saved!');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences.</p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              {/* Profile Settings */}
              <div>
                <h2 className="text-lg font-bold mb-4">Profile Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h2 className="text-lg font-bold mb-4">Preferences</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground"
                    >
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => handleChange('theme', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground"
                    >
                      <option>Dark</option>
                      <option>Light</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => handleChange('notifications', e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span>Enable Notifications</span>
                  </label>
                </div>
              </div>

              {/* Security */}
              <div className="pt-6 border-t border-border">
                <h2 className="text-lg font-bold mb-4">Security</h2>
                <button className="inline-flex items-center gap-2 px-6 py-2 rounded-lg border border-border hover:bg-background transition font-medium">
                  <Lock size={20} />
                  Change Password
                </button>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t border-border">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium"
                >
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
