'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { ArrowRight, CalendarDays, Check, Clock3, FileText, Inbox, ShieldCheck, UserRound, X } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { useLeaveTypeLabels, formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { toast } from 'sonner';

export default function ManagerLeaves() {
  const { leaves, loading, fetchPendingLeaves, updateLeaveStatus } = useLeaves();
  const { labels: typeLabels } = useLeaveTypeLabels();
  const [processingId, setProcessingId] = useState(null);
  const fetchPendingLeavesRef = useRef(fetchPendingLeaves);

  useEffect(() => {
    fetchPendingLeavesRef.current().catch(() => toast.error('Failed to load leaves'));
  }, []);

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      await updateLeaveStatus(id, 'Approved', '');
      toast.success('Leave approved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to approve leave');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setProcessingId(id);
      await updateLeaveStatus(id, 'Rejected', '');
      toast.success('Leave rejected successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to reject leave');
    } finally {
      setProcessingId(null);
    }
  };

  // Ensure leaves is always an array
  const leavesArray = Array.isArray(leaves) ? leaves : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-5 z-20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Team Leaves</h1>
              <p className="text-muted-foreground mt-1">Review requests and keep your team covered.</p>
            </div>
            <div className="mr-14 hidden sm:flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <Clock3 size={20} className="text-amber-400" />
              <div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
                <p className="text-xl font-bold leading-none text-amber-400">{leavesArray.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {loading ? (
            <div className="mx-auto max-w-5xl space-y-4">
              {[1, 2].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-card/60" />
              ))}
            </div>
          ) : leavesArray.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border bg-card/40 px-8 py-20 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Inbox size={30} />
              </div>
              <h2 className="text-xl font-bold">You&apos;re all caught up</h2>
              <p className="mt-2 text-sm text-muted-foreground">There are no pending team leave requests to review.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl space-y-5">
              {leavesArray.map((leave) => {
                // Extract employee name from backend response
                const employee = leave.employee || {};
                const employeeName = employee.firstName && employee.lastName 
                  ? `${employee.firstName} ${employee.lastName}`
                  : employee.firstName || employee.lastName || 'Unknown';
                
                const leaveType = leave.leaveType || leave.type || 'N/A';
                const startDate = leave.startDate || leave.from || '';
                const endDate = leave.endDate || leave.to || '';
                const totalDays = leave.totalDays || leave.days || 0;
                const reason = leave.reason || '';
                const status = leave.status || 'PENDING';
                const decision = leave.decisionExplanation;
                const initials = employeeName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                }) : 'N/A';
                
                return (
                  <article key={leave.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
                    <div className="h-1 bg-gradient-to-r from-sky-500 via-primary to-violet-500" />
                    <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/25 to-violet-500/20 text-base font-bold text-sky-300 ring-1 ring-sky-400/20">
                          {initials || <UserRound size={22} />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold">{employeeName}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{formatLeaveType(typeLabels, leaveType)}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays size={13} /> {totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`h-fit rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${
                        status === 'APPROVED' || status === 'Approved' ? 'bg-green-500/20 text-green-400' : 
                        status === 'REJECTED' || status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                        'border-amber-500/20 bg-amber-500/10 text-amber-400'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="my-5 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Starts</p>
                        <p className="font-bold">{formatDate(startDate)}</p>
                      </div>
                      <ArrowRight className="hidden text-muted-foreground md:block" size={18} />
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Returns after</p>
                        <p className="font-bold">{formatDate(endDate)}</p>
                      </div>
                    </div>

                    {reason && (
                      <div className="mb-4 flex gap-3 rounded-xl bg-muted/25 p-4">
                        <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee reason</p><p className="mt-1 text-sm">{reason}</p></div>
                      </div>
                    )}

                    {decision && (
                      <div className="mb-5 flex gap-3 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4 text-sm">
                        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-sky-400" />
                        <div>
                          <p className="font-semibold">Policy check <span className="ml-2 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">{String(decision.decision || '').replaceAll('_', ' ')}</span></p>
                          <p className="mt-1 text-muted-foreground">{(decision.reasons || []).join('; ')}</p>
                        </div>
                      </div>
                    )}

                    {(status === 'PENDING' || status === 'Pending') && (
                      <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
                        <button 
                          onClick={() => handleApprove(leave.id)}
                          disabled={processingId === leave.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                        >
                          <Check size={18} />
                          {processingId === leave.id ? 'Processing...' : 'Approve request'}
                        </button>
                        <button 
                          onClick={() => handleReject(leave.id)}
                          disabled={processingId === leave.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 font-semibold text-red-400 transition hover:border-red-500/40 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                        >
                          <X size={18} />
                          Reject request
                        </button>
                      </div>
                    )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
