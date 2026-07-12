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
  officeIpRanges: '',
  wifiVerificationEnabled: false,
  attendancePolicy: { halfDayHours: 4, workWindowStart: '', workWindowEnd: '' },
  leaveAutomationEnabled: true,
  sandwichLeaveEnabled: false,
};

const normalizeIpRanges = (value) => {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ');
  return typeof value === 'string' ? value : '';
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
  officeIpRanges: normalizeIpRanges(value.officeIpRanges),
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
      const payload = {
        ...settings,
        officeIpRanges: settings.officeIpRanges
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const saved = await organizationSettingsAPI.update(payload);
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
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage organization settings and preferences.</p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              {loading ? (
                <div className="text-muted-foreground">Loading settings...</div>
              ) : (
                <>
                  <Section title="Organization">
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
                    <Field label="Office IP Ranges">
                      <input value={settings.officeIpRanges} onChange={(event) => update('officeIpRanges', event.target.value)} className="w-full px-4 py-2 rounded-lg border border-border bg-input" />
                    </Field>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={Boolean(settings.wifiVerificationEnabled)} onChange={(event) => update('wifiVerificationEnabled', event.target.checked)} />
                      <span>Enable Wi-Fi/IP verification</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Office Window Start" hint="Reporting only — flags punches outside this range, never blocks a check-in">
                        <input type="time" value={settings.attendancePolicy?.workWindowStart || ''} onChange={(event) => updateNested('attendancePolicy', { workWindowStart: event.target.value })} className="time-picker-visible w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground" />
                      </Field>
                      <Field label="Office Window End">
                        <input type="time" value={settings.attendancePolicy?.workWindowEnd || ''} onChange={(event) => updateNested('attendancePolicy', { workWindowEnd: event.target.value })} className="time-picker-visible w-full px-4 py-2 rounded-lg border border-border bg-input text-foreground" />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Leave Automation">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={Boolean(settings.leaveAutomationEnabled)} onChange={(event) => update('leaveAutomationEnabled', event.target.checked)} />
                      <span>Enable leave automation rules</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={Boolean(settings.sandwichLeaveEnabled)} onChange={(event) => update('sandwichLeaveEnabled', event.target.checked)} />
                      <span>Enable sandwich-leave rule (leave adjacent to an unapproved absence deducts the weekend/holiday gap too)</span>
                    </label>
                  </Section>

                  <div className="pt-6 border-t border-border">
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium disabled:opacity-50">
                      <Save size={20} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6 mt-6">
              <h2 className="text-lg font-bold mb-4">Account Security</h2>
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
