'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { ArrowRight, CalendarDays, CalendarRange, FileText, Inbox, Plus, ShieldCheck, X } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { useLeaveTypeLabels, formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { leaveAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function EmployeeLeaves() {
  const { leaves, loading, fetchMyLeaves, createLeave, cancelLeave } = useLeaves();
  const { labels: typeLabels } = useLeaveTypeLabels();
  const [showModal, setShowModal] = useState(false);
  const [balances, setBalances] = useState([]);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'ANNUAL', // Changed to uppercase to match backend enum
    reason: ''
  });

  async function loadLeaves() {
    try {
      const [leaveRows, balanceRows] = await Promise.all([
        fetchMyLeaves(),
        leaveAPI.getMyBalances(),
      ]);
      setBalances(Array.isArray(balanceRows) ? balanceRows : []);
      return leaveRows;
    } catch {
      toast.error('Failed to load leaves');
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadLeaves, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configuredLeaveTypes = useMemo(() => balances
    .map((balance) => balance.policy?.leaveType)
    .filter(Boolean), [balances]);

  useEffect(() => {
    if (configuredLeaveTypes.length && !configuredLeaveTypes.includes(formData.type)) {
      setFormData((current) => ({ ...current, type: configuredLeaveTypes[0] }));
    }
  }, [configuredLeaveTypes, formData.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user context exists; the httpOnly refresh cookie can rehydrate the access token.
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (!user) {
        toast.error('Please login first to apply for leave');
        return;
      }
    }
    
    try {
      console.log('Submitting leave:', formData);
      
      // Transform data to match backend expectations
      const leaveData = {
        leaveType: formData.type.toUpperCase(), // Convert to uppercase enum
        startDate: formData.startDate, // Already in YYYY-MM-DD format from date input
        endDate: formData.endDate,
        reason: formData.reason
      };
      
      console.log('Transformed leave data:', leaveData);
      
      const result = await createLeave(leaveData);
      
      console.log('Leave created:', result);
      
      toast.success('Leave application submitted successfully');
      setShowModal(false);
      setFormData({ startDate: '', endDate: '', type: configuredLeaveTypes[0] || 'ANNUAL', reason: '' });
      
      // Force reload the leaves list
      await loadLeaves();
    } catch (err) {
      console.error('Leave submission error:', err);
      const errorMessage = err.message || 'Failed to apply for leave';
      
      // Check if it's an authentication error
      if (errorMessage.includes('token') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        toast.error('Authentication required', {
          description: 'Please login to apply for leave'
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (leaveId) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    
    try {
      await cancelLeave(leaveId); // Fixed: was deleteLeave, now cancelLeave
      toast.success('Leave request cancelled');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel leave');
    }
  };

  // Ensure leaves is always an array
  const leavesArray = Array.isArray(leaves) ? leaves : [];

  const formatMonthlyEquivalent = (annualDays) => {
    const monthly = Number(annualDays || 0) / 12;
    return Number.isInteger(monthly) ? monthly : Number(monthly.toFixed(1));
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">My Leaves</h1>
              <p className="text-muted-foreground mt-1">View and manage your leave requests.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              disabled={!balances.length}
              className="mr-14 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={20} />
              Apply Leave
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Leave Balance */}
          {balances.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {balances.map((balance) => {
                const leaveType = balance.policy?.leaveType;
                if (!leaveType) return null;
                const annualDays = Number(balance.totalDays ?? balance.policy?.totalDays ?? 0);
                const usedDays = Number(balance.usedDays || 0);
                return (
                  <div key={balance.id || leaveType} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="h-1 bg-gradient-to-r from-sky-500 to-primary" />
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">{formatLeaveType(typeLabels, leaveType)} Leave</p>
                          <p className="mt-2 text-3xl font-bold text-primary">{balance.remainingDays} <span className="text-base font-medium text-muted-foreground">days left</span></p>
                        </div>
                        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><CalendarRange size={20} /></div>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                        <div><p className="text-lg font-bold">{formatMonthlyEquivalent(annualDays)}</p><p className="text-[11px] text-muted-foreground">Per month*</p></div>
                        <div><p className="text-lg font-bold">{annualDays}</p><p className="text-[11px] text-muted-foreground">Per year</p></div>
                        <div><p className="text-lg font-bold">{usedDays}</p><p className="text-[11px] text-muted-foreground">Used</p></div>
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">*Monthly figure is the yearly allocation divided by 12; balance is granted yearly, not accrued monthly.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-muted-foreground">
              No leave policy or balance is configured for your account.
            </div>
          ) : null}

          {/* Leave Requests */}
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Leave Requests</h2>
                <p className="mt-1 text-sm text-muted-foreground">Track the status and policy review of your applications.</p>
              </div>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">{leavesArray.length} total</span>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-border bg-card/60" />)}
              </div>
            ) : leavesArray.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Inbox size={26} /></div>
                <h3 className="text-lg font-bold">No leave requests yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your submitted leave applications will appear here.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {leavesArray.map((leave) => {
                  // Handle different field name formats from backend
                  const leaveType = leave.leaveType || leave.leave_type || leave.type || 'N/A';
                  const startDate = leave.startDate || leave.start_date;
                  const endDate = leave.endDate || leave.end_date;
                  const status = leave.status || 'PENDING';
                  const reason = leave.reason || '';
                  const decision = leave.decisionExplanation;
                  const totalDays = leave.totalDays || leave.days || calculateDays(startDate, endDate);
                  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  }) : 'N/A';
                  
                  return (
                    <article key={leave.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
                      <div className={`h-1 ${status === 'APPROVED' ? 'bg-emerald-500' : status === 'REJECTED' ? 'bg-red-500' : status === 'CANCELLED' ? 'bg-muted' : 'bg-gradient-to-r from-sky-500 via-primary to-violet-500'}`} />
                      <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/25 to-violet-500/20 text-base font-bold text-sky-300 ring-1 ring-sky-400/20">
                            {formatLeaveType(typeLabels, leaveType).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{formatLeaveType(typeLabels, leaveType)} Leave</h3>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={13} /> {totalDays} {totalDays === 1 ? 'day' : 'days'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${
                            status === 'APPROVED' || status === 'Approved' ? 'border-green-500/20 bg-green-500/10 text-green-400' :
                            status === 'PENDING' || status === 'Pending' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' :
                            status === 'REJECTED' || status === 'Rejected' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                            'border-border bg-muted/20 text-muted-foreground'
                          }`}>
                            {status}
                          </span>
                          {(status === 'PENDING' || status === 'Pending') && (
                            <button
                              onClick={() => handleDelete(leave.id)}
                              className="rounded-lg border border-red-500/20 p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                              title="Cancel leave request"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="my-5 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Starts</p>
                          <p className="font-bold">{formatDate(startDate)}</p>
                        </div>
                        <ArrowRight className="hidden text-muted-foreground md:block" size={18} />
                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ends</p>
                          <p className="font-bold">{formatDate(endDate)}</p>
                        </div>
                      </div>
                      {reason && (
                        <div className="mb-4 flex gap-3 rounded-xl bg-muted/25 p-4">
                          <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your reason</p><p className="mt-1 text-sm">{reason}</p></div>
                        </div>
                      )}
                      {decision && (
                        <div className="flex gap-3 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4 text-sm">
                          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-sky-400" />
                          <div>
                            <p className="font-semibold">Policy check <span className="ml-2 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">{String(decision.decision || '').replaceAll('_', ' ')}</span></p>
                            <p className="mt-1 text-muted-foreground">{(decision.reasons || []).join('; ')}</p>
                          </div>
                        </div>
                      )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Apply Leave Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">Apply for Leave</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Leave Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    required
                  >
                    {configuredLeaveTypes.map((type) => (
                      <option key={type} value={type}>{formatLeaveType(typeLabels, type)} Leave</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                    placeholder="Enter reason for leave..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}
