'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Clock3, UserPlus, Users } from 'lucide-react';
import RoleGate from '@/components/RoleGate';
import { organizationSettingsAPI, userAPI } from '@/lib/api';
import { toast } from 'sonner';

const initialSettings = {
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  lateThresholdMinutes: 30,
  leaveAutomationEnabled: true,
  sandwichLeaveEnabled: false,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState('HR_CONFIGURATION');
  const [settings, setSettings] = useState(initialSettings);
  const [invite, setInvite] = useState({ firstName: '', lastName: '', email: '' });
  const [invited, setInvited] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    organizationSettingsAPI.get()
      .then((data) => {
        if (data.onboardingCompleted) {
          router.replace('/dashboard/admin');
          return;
        }
        setSettings((current) => ({ ...current, ...data }));
        setStep(data.onboardingStep === 'INVITE_EMPLOYEES' ? 'INVITE_EMPLOYEES' : 'HR_CONFIGURATION');
      })
      .catch(() => toast.error('Could not load onboarding settings'))
      .finally(() => setLoading(false));
  }, [router]);

  const saveHrConfiguration = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await organizationSettingsAPI.update({
        workingHoursStart: settings.workingHoursStart,
        workingHoursEnd: settings.workingHoursEnd,
        lateThresholdMinutes: Number(settings.lateThresholdMinutes),
        leaveAutomationEnabled: settings.leaveAutomationEnabled,
        sandwichLeaveEnabled: settings.sandwichLeaveEnabled,
        onboardingStep: 'INVITE_EMPLOYEES',
      });
      setStep('INVITE_EMPLOYEES');
      toast.success('HR configuration saved');
    } catch (error) {
      toast.error(error.message || 'Could not save HR configuration');
    } finally {
      setSaving(false);
    }
  };

  const inviteEmployee = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await userAPI.create({ ...invite, role: 'EMPLOYEE' });
      setInvited((rows) => [...rows, { ...invite }]);
      setInvite({ firstName: '', lastName: '', email: '' });
      toast.success('Employee invitation sent');
    } catch (error) {
      toast.error(error.message || 'Could not invite employee');
    } finally {
      setSaving(false);
    }
  };

  const finishOnboarding = async () => {
    try {
      setSaving(true);
      await organizationSettingsAPI.update({ onboardingCompleted: true, onboardingStep: 'COMPLETED' });
      toast.success('Organization onboarding completed');
      router.replace('/dashboard/admin');
    } catch (error) {
      toast.error(error.message || 'Could not complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Preparing your workspace...</div>;

  return (
    <RoleGate allow={['ADMIN', 'SUPER_ADMIN']}>
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">W</div>
            <h1 className="mt-4 text-3xl font-bold">Set up your HR workspace</h1>
            <p className="mt-2 text-muted-foreground">Configure the essentials now. Everything remains editable from Settings.</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <Progress active={step === 'HR_CONFIGURATION'} complete={step === 'INVITE_EMPLOYEES'} number="1" label="HR Configuration" />
            <Progress active={step === 'INVITE_EMPLOYEES'} number="2" label="Invite Employees" />
          </div>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
            {step === 'HR_CONFIGURATION' ? (
              <form onSubmit={saveHrConfiguration} className="space-y-6">
                <div className="flex items-start gap-4"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Clock3 /></span><div><h2 className="text-xl font-bold">Working time and leave rules</h2><p className="text-sm text-muted-foreground">These defaults drive attendance reporting and leave automation.</p></div></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Working day starts"><input type="time" value={settings.workingHoursStart} onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })} className="input-field" required /></Field>
                  <Field label="Working day ends"><input type="time" value={settings.workingHoursEnd} onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })} className="input-field" required /></Field>
                </div>
                <Field label="Late threshold after start (minutes)"><input type="number" min="0" max="240" value={settings.lateThresholdMinutes} onChange={(e) => setSettings({ ...settings, lateThresholdMinutes: e.target.value })} className="input-field" required /></Field>
                <Toggle checked={settings.leaveAutomationEnabled} onChange={(checked) => setSettings({ ...settings, leaveAutomationEnabled: checked })} title="Enable leave automation" description="Evaluate requests against active policy, balance and staffing rules." />
                <Toggle checked={settings.sandwichLeaveEnabled} onChange={(checked) => setSettings({ ...settings, sandwichLeaveEnabled: checked })} title="Enable sandwich-leave rule" description="Include applicable weekend or holiday gaps in leave deductions." />
                <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Saving...' : 'Save and continue'} <ArrowRight size={17} /></button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Users /></span><div><h2 className="text-xl font-bold">Invite your first employees</h2><p className="text-sm text-muted-foreground">They receive a secure password-setup email. No password is shared by an administrator.</p></div></div>
                <form onSubmit={inviteEmployee} className="grid gap-4 rounded-xl border border-border bg-muted/15 p-4 sm:grid-cols-2">
                  <Field label="First name"><input value={invite.firstName} onChange={(e) => setInvite({ ...invite, firstName: e.target.value })} className="input-field" required /></Field>
                  <Field label="Last name"><input value={invite.lastName} onChange={(e) => setInvite({ ...invite, lastName: e.target.value })} className="input-field" required /></Field>
                  <div className="sm:col-span-2"><Field label="Work email"><input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className="input-field" required /></Field></div>
                  <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 font-semibold text-primary sm:col-span-2 disabled:opacity-50"><UserPlus size={17} /> {saving ? 'Sending...' : 'Send invitation'}</button>
                </form>
                {invited.length > 0 && <div className="space-y-2">{invited.map((person) => <div key={person.email} className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm"><Check size={16} className="text-success" /><span>{person.firstName} {person.lastName}</span><span className="ml-auto text-muted-foreground">{person.email}</span></div>)}</div>}
                <button type="button" onClick={finishOnboarding} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Finishing...' : invited.length ? 'Finish onboarding' : 'Skip invitations and finish'} <ArrowRight size={17} /></button>
              </div>
            )}
          </section>
        </div>
      </main>
    </RoleGate>
  );
}

function Progress({ active, complete, number, label }) { return <div className={`flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${active || complete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{complete ? <Check size={15} /> : number}</span><span className="text-sm font-semibold">{label}</span></div>; }
function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>; }
function Toggle({ checked, onChange, title, description }) { return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4"><span><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" /></label>; }
