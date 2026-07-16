'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, MailCheck, RefreshCw } from 'lucide-react';
import { billingAPI } from '@/lib/api';
import { toast } from 'sonner';

const STEPS = ['Owner Account', 'Email Verification', 'Organization', 'Plan'];
const COUNTRIES = [
  { value: 'PK', label: 'Pakistan', timezone: 'Asia/Karachi' },
  { value: 'AE', label: 'United Arab Emirates', timezone: 'Asia/Dubai' },
  { value: 'SA', label: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  { value: 'GB', label: 'United Kingdom', timezone: 'Europe/London' },
  { value: 'US', label: 'United States', timezone: 'America/New_York' },
  { value: 'CA', label: 'Canada', timezone: 'America/Toronto' },
  { value: 'AU', label: 'Australia', timezone: 'Australia/Sydney' },
  { value: 'IN', label: 'India', timezone: 'Asia/Kolkata' },
];
const TIMEZONES = [...new Set(COUNTRIES.map((country) => country.timezone).concat(['UTC']))];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = (searchParams.get('plan') || '').toUpperCase();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [completionToken, setCompletionToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', termsAccepted: false,
    orgName: '', country: 'PK', timezone: 'Asia/Karachi', industry: '', planType: '',
  });

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const rows = await billingAPI.getPlans();
        const selectable = (Array.isArray(rows) ? rows : []).filter((plan) => ['STARTER', 'GROWTH', 'BUSINESS'].includes(plan.type));
        if (selectable.length === 0) throw new Error('No selectable plans returned');
        setPlans(selectable);
        const selected = selectable.find((plan) => plan.type === requestedPlan) || selectable[0];
        setForm((current) => ({ ...current, planType: selected?.type || current.planType }));
        setPlansLoading(false);
        return;
      } catch {
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }

    setPlansLoading(false);
    setPlansError('Subscription plans are temporarily unavailable. Check the backend connection and try again.');
  }, [requestedPlan]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone) setForm((current) => ({ ...current, timezone: browserTimezone }));
  }, []);

  const passwordChecks = useMemo(() => [
    { label: 'At least 12 characters', valid: form.password.length >= 12 },
    { label: 'Uppercase and lowercase letters', valid: /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) },
    { label: 'At least one number', valid: /\d/.test(form.password) },
    { label: 'At least one symbol', valid: /[^A-Za-z0-9]/.test(form.password) },
  ], [form.password]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const submitOwner = async (event) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return setError('First name, last name and work email are required');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (!passwordChecks.every((check) => check.valid)) return setError('Password does not meet the security requirements');
    if (!form.termsAccepted) return setError('Accept the Terms of Service and Privacy Policy to continue');
    try {
      setLoading(true);
      const result = await billingAPI.startRegistration({
        ownerFirstName: form.firstName.trim(),
        ownerLastName: form.lastName.trim(),
        ownerEmail: form.email.trim(),
        ownerPassword: form.password,
        termsAccepted: true,
      });
      setRegistrationId(result.registrationId);
      setDevelopmentCode(result.developmentVerificationCode || '');
      setStep(1);
      toast.success('Verification code sent');
    } catch (err) {
      setError(err.message || 'Could not start registration');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) return setError('Enter the complete 6-digit verification code');
    try {
      setLoading(true);
      const result = await billingAPI.verifyRegistrationEmail(registrationId, verificationCode);
      setCompletionToken(result.completionToken);
      setStep(2);
      toast.success('Email verified');
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setLoading(true);
      const result = await billingAPI.resendVerification(registrationId);
      setDevelopmentCode(result.developmentVerificationCode || '');
      toast.success('A new verification code was sent');
    } catch (err) {
      setError(err.message || 'Could not resend code');
    } finally {
      setLoading(false);
    }
  };

  const continueOrganization = (event) => {
    event.preventDefault();
    if (!form.orgName.trim() || !form.country || !form.timezone) return setError('Organization name, country and timezone are required');
    if (plans.length === 0 && !plansLoading) loadPlans();
    setStep(3);
  };

  const createWorkspace = async () => {
    if (!form.planType) return setError('Select a subscription plan');
    try {
      setLoading(true);
      const result = await billingAPI.completeRegistration({
        completionToken,
        orgName: form.orgName.trim(),
        country: form.country,
        timezone: form.timezone,
        industry: form.industry.trim() || undefined,
        planType: form.planType,
      });
      toast.success('Your WorkNex workspace is ready');
      router.replace(result.onboardingPath || '/onboarding');
    } catch (err) {
      setError(err.message || 'Could not create organization workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">W</span>
            WorkNexAI
          </Link>
          <h1 className="mt-5 text-3xl font-bold">Create your organization</h1>
          <p className="mt-2 text-muted-foreground">A verified workspace in four short steps. No credit card required.</p>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="text-center">
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${index < step ? 'border-success bg-success text-success-foreground' : index === step ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>
                {index < step ? <Check size={16} /> : index + 1}
              </div>
              <p className="mt-2 hidden text-xs text-muted-foreground sm:block">{label}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          {error && <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

          {step === 0 && (
            <form onSubmit={submitOwner} className="space-y-5">
              <StepHeading title="Owner account" description="Use the details of the person who will administer this organization." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name"><input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} autoComplete="given-name" required className="input-field" placeholder="e.g. Tayyab" /></Field>
                <Field label="Last name"><input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} autoComplete="family-name" required className="input-field" placeholder="e.g. Basharat" /></Field>
              </div>
              <Field label="Work email"><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" required className="input-field" placeholder="you@company.com" /></Field>
              <Field label="Password">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete="new-password" required className="input-field pr-12" placeholder="Create a strong password" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </div>
              </Field>
              <Field label="Confirm password"><input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} autoComplete="new-password" required className="input-field" placeholder="Re-enter your password" /></Field>
              <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                {passwordChecks.map((check) => <p key={check.label} className={`flex items-center gap-2 text-xs ${check.valid ? 'text-success' : 'text-muted-foreground'}`}><Check size={14} />{check.label}</p>)}
              </div>
              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <input type="checkbox" checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} className="mt-1" required />
                <span>I agree to the <span className="font-medium text-primary">Terms of Service</span> and <span className="font-medium text-primary">Privacy Policy</span>.</span>
              </label>
              <PrimaryButton loading={loading}>Send verification code <ArrowRight size={17} /></PrimaryButton>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={verifyEmail} className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MailCheck size={30} /></div>
              <StepHeading title="Verify your email" description={`Enter the six-digit code sent to ${form.email}.`} />
              {developmentCode && <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">Development code: <b>{developmentCode}</b></div>}
              <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="input-field mx-auto block max-w-xs py-4 text-center text-3xl font-bold tracking-[0.45em]" placeholder="000000" />
              <PrimaryButton loading={loading}>Verify email <ArrowRight size={17} /></PrimaryButton>
              <button type="button" onClick={resendCode} disabled={loading} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">Resend code</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={continueOrganization} className="space-y-5">
              <StepHeading title="Organization and timezone" description="These settings control attendance dates, working windows and scheduled jobs." />
              <Field label="Organization name"><input value={form.orgName} onChange={(e) => update('orgName', e.target.value)} required className="input-field" placeholder="Acme Corporation" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country">
                  <select value={form.country} onChange={(e) => { const selected = COUNTRIES.find((country) => country.value === e.target.value); setForm((current) => ({ ...current, country: e.target.value, timezone: selected?.timezone || current.timezone })); }} className="input-field">
                    {COUNTRIES.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
                  </select>
                </Field>
                <Field label="Timezone">
                  <select value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className="input-field">
                    {!TIMEZONES.includes(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
                    {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Industry (optional)"><input value={form.industry} onChange={(e) => update('industry', e.target.value)} className="input-field" placeholder="Technology, Healthcare, Retail..." /></Field>
              <div className="flex gap-3"><SecondaryButton onClick={() => setStep(1)}><ArrowLeft size={17} /> Back</SecondaryButton><PrimaryButton>Continue <ArrowRight size={17} /></PrimaryButton></div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <StepHeading title="Choose your trial plan" description="Your 14-day trial starts now. No payment information is collected." />
              {plansLoading ? (
                <div className="flex min-h-36 items-center justify-center rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground">
                  <RefreshCw size={18} className="mr-2 animate-spin" /> Loading subscription plans...
                </div>
              ) : plansError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center">
                  <p className="text-sm text-destructive">{plansError}</p>
                  <button type="button" onClick={loadPlans} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted">
                    <RefreshCw size={15} /> Retry loading plans
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {plans.map((plan) => (
                    <button key={plan.type} type="button" onClick={() => update('planType', plan.type)} className={`rounded-xl border p-4 text-left transition ${form.planType === plan.type ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}>
                      <p className="font-bold">{plan.name}</p>
                      <p className="mt-1 text-2xl font-bold">${plan.pricing?.monthly}<span className="text-xs font-normal text-muted-foreground">/month</span></p>
                      <p className="mt-2 text-xs text-muted-foreground">Up to {plan.maxEmployees} employees</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="rounded-xl border border-border bg-muted/20 p-3 text-center text-sm text-muted-foreground">Need Enterprise? Contact sales for custom security, infrastructure and pricing.</p>
              <div className="flex gap-3"><SecondaryButton onClick={() => setStep(2)}><ArrowLeft size={17} /> Back</SecondaryButton><button type="button" onClick={createWorkspace} disabled={loading || plansLoading || !!plansError || !form.planType} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{loading ? 'Creating workspace...' : 'Create workspace'} <ArrowRight size={17} /></button></div>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
      </div>
    </main>
  );
}

function StepHeading({ title, description }) { return <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>; }
function PrimaryButton({ loading, children }) { return <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{loading ? 'Please wait...' : children}</button>; }
function SecondaryButton({ onClick, children }) { return <button type="button" onClick={onClick} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold hover:bg-muted">{children}</button>; }

export default function RegisterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-background" />}><RegisterForm /></Suspense>;
}
