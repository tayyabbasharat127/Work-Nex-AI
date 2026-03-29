'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    companyName: 'WorkNexAI Corp',
    timezone: 'UTC',
    workingHours: '9:00 AM - 5:00 PM',
    attendanceAlertTime: '9:30 AM',
    emailNotifications: true,
    smsNotifications: false
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage system settings and preferences.</p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              {/* Company Settings */}
              <div>
                <h2 className="text-lg font-bold mb-4">Company Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    >
                      <option>UTC</option>
                      <option>EST</option>
                      <option>CST</option>
                      <option>PST</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <h2 className="text-lg font-bold mb-4">Working Hours</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Working Hours</label>
                    <input
                      type="text"
                      value={settings.workingHours}
                      onChange={(e) => handleChange('workingHours', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Attendance Alert Time</label>
                    <input
                      type="text"
                      value={settings.attendanceAlertTime}
                      onChange={(e) => handleChange('attendanceAlertTime', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <h2 className="text-lg font-bold mb-4">Notifications</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span>Email Notifications</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span>SMS Notifications</span>
                  </label>
                </div>
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
