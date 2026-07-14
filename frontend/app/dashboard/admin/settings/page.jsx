'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Save } from 'lucide-react';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import { organizationSettingsAPI } from '@/lib/api';
import { toast } from 'sonner';

const defaultSettings = {
  name: '',
  timezone: 'Asia/Karachi',
  workingHours: { start: '09:00', end: '17:00' },
  lateThreshold: { hour: 9, minute: 30 },
  attendancePolicy: { halfDayHours: 4, workWindowStart: '', workWindowEnd: '' },
};

const normalizeSettings = (value = {}) => ({
  ...defaultSettings,
  ...value,
  workingHours: {
    ...defaultSettings.workingHours,
    ...(value.workingHours && typeof value.workingHours === 'object' ? value.workingHours : {}),
  },
  lateThreshold: {
    ...defaultSettings.lateThreshold,
    ...(value.lateThreshold && typeof value.lateThreshold === 'object' ? value.lateThreshold : {}),
  },
  attendancePolicy: {
    ...defaultSettings.attendancePolicy,
    ...(value.attendancePolicy && typeof value.attendancePolicy === 'object' ? value.attendancePolicy : {}),
  },
});

export default function AdminSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await organizationSettingsAPI.get();
      setSettings(normalizeSettings(data));
    } catch {
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadSettings, 0);
    return () => clearTimeout(timer);
  }, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  // For nested objects (workingHours, lateThreshold, attendancePolicy):
  // merges against the LATEST state via the setState updater, not a
  // `settings.xxx` value captured in the render closure. `<input type="time">`
  // fires onChange per segment (hour, then minute) — using the closure value
  // let a fast second edit clobber the first because it spread a stale
  // `settings.attendancePolicy` that hadn't caught up yet.
  const updateNested = (key, patch) => setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleSave = async () => {
    try {
      setSaving(true);
      const saved = await organizationSettingsAPI.update(settings);
      setSettings(normalizeSettings(saved));
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 z-20">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organization, attendance and account preferences.</p>
        </div>

        <div className="p-5">
          <div className="grid max-w-6xl items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              {loading ? (
                <div className="text-muted-foreground">Loading settings...</div>
              ) : (
                <>
                  <Section title="Organization">
                    <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Organization Name">
                      <input value={settings.name || ''} onChange={(event) => update('name', event.target.value)} className="w-full px-4 py-2 rounded-lg border border-border bg-input" />
                    </Field>
                    <Field label="Timezone">
                      <select value={settings.timezone || 'Asia/Karachi'} onChange={(event) => update('timezone', event.target.value)} className="w-full px-4 py-2 rounded-lg border border-border bg-input">
                        <option value="Asia/Karachi">Asia/Karachi</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                      </select>
                    </Field>
                    </div>
                  </Section>

                  <Section title="Attendance">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Work Start">
                        <input type="time" value={settings.workingHours?.start || '09:00'} onChange={(event) => updateNested('workingHours', { start: event.target.value })} className="w-full px-4 py-2 rounded-lg border border-border bg-input" />
                      </Field>
                      <Field label="Work End">
                        <input type="time" value={settings.workingHours?.end || '17:00'} onChange={(event) => updateNested('workingHours', { end: event.target.value })} className="w-full px-4 py-2 rounded-lg border border-border bg-input" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Late Hour">
                        <input type="number" value={settings.lateThreshold?.hour ?? 9} onChange={(event) => updateNested('lateThreshold', { hour: Number(event.target.value) })} className="w-full px-4 py-2 rounded-lg border border-border bg-input" />
                      </Field>
                      <Field label="Late Minute">
                        <input type="number" value={settings.lateThreshold?.minute ?? 30} onChange={(event) => updateNested('lateThreshold', { minute: Number(event.target.value) })} className="w-full px-4 py-2 rounded-lg border border-border bg-input" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Office Window Start" hint="Reporting only — flags punches outside this range, never blocks a check-in">
                        <input type="time" value={settings.attendancePolicy?.workWindowStart || ''} onChange={(event) => updateNested('attendancePolicy', { workWindowStart: event.target.value })} className="time-picker-visible w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground" />
                      </Field>
                      <Field label="Office Window End">
                        <input type="time" value={settings.attendancePolicy?.workWindowEnd || ''} onChange={(event) => updateNested('attendancePolicy', { workWindowEnd: event.target.value })} className="time-picker-visible w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground" />
                      </Field>
                    </div>
                  </Section>

                  <div className="pt-4 border-t border-border">
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50">
                      <Save size={17} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-bold mb-3">Account Security</h2>
              <TwoFactorSettings />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
