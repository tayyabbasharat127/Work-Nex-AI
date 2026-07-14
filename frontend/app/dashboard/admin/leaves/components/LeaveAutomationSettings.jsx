'use client';

import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { organizationSettingsAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function LeaveAutomationSettings() {
  const [settings, setSettings] = useState({ leaveAutomationEnabled: true, sandwichLeaveEnabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    organizationSettingsAPI.get()
      .then((data) => {
        if (active) {
          setSettings({
            leaveAutomationEnabled: Boolean(data?.leaveAutomationEnabled),
            sandwichLeaveEnabled: Boolean(data?.sandwichLeaveEnabled),
          });
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load leave rules'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggle = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }));

  const save = async () => {
    try {
      setSaving(true);
      const saved = await organizationSettingsAPI.update(settings);
      setSettings({
        leaveAutomationEnabled: Boolean(saved?.leaveAutomationEnabled),
        sandwichLeaveEnabled: Boolean(saved?.sandwichLeaveEnabled),
      });
      toast.success('Leave rules saved');
    } catch (error) {
      toast.error(error.message || 'Failed to save leave rules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="rounded-lg bg-success/15 p-2 text-success"><ShieldCheck size={18} /></div>
        <div>
          <h2 className="font-semibold">Automation Rules</h2>
          <p className="text-xs text-muted-foreground">Controls applied to new leave requests.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading rules...</div>
      ) : (
        <div className="space-y-2.5">
          <button type="button" onClick={() => toggle('leaveAutomationEnabled')} className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-background/40 px-3.5 py-3 text-left hover:border-primary/50">
            <span>
              <span className="block text-sm font-medium">Leave automation</span>
              <span className="block text-xs text-muted-foreground">Evaluate policy, balance and staffing rules.</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.leaveAutomationEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-elevated transition ${settings.leaveAutomationEnabled ? 'left-6' : 'left-1'}`} />
            </span>
          </button>

          <button type="button" onClick={() => toggle('sandwichLeaveEnabled')} className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-background/40 px-3.5 py-3 text-left hover:border-primary/50">
            <span>
              <span className="block text-sm font-medium">Sandwich-leave rule</span>
              <span className="block text-xs text-muted-foreground">Include weekend/holiday gaps beside an unapproved absence.</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.sandwichLeaveEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-elevated transition ${settings.sandwichLeaveEnabled ? 'left-6' : 'left-1'}`} />
            </span>
          </button>

          <button type="button" onClick={save} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save rules'}
          </button>
        </div>
      )}
    </section>
  );
}
