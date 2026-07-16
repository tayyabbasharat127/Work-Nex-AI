'use client';

import { Check, ShieldAlert, X, Sparkles, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { STATUS_CONFIG, TYPE_COLORS } from '../constants';
import { getInitials, formatDate } from '../helpers';

const AI_RECOMMENDATION_META = {
  APPROVE: { label: 'Approve', icon: CheckCircle2, className: 'bg-success/15 text-success border-success/25' },
  REJECT: { label: 'Reject', icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/25' },
  REVIEW: { label: 'Needs review', icon: AlertTriangle, className: 'bg-warning/15 text-warning border-warning/25' },
};

export default function LeaveDetailModal({ leave, typeLabels, onClose, onApprove, onReject }) {
  if (!leave) return null;

  const emp = leave.employee || {};
  const firstName = emp.firstName || '';
  const lastName = emp.lastName || '';
  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Employee';
  const status = leave.status || 'PENDING';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const typeColor = TYPE_COLORS[leave.leaveType] || TYPE_COLORS.OTHER;
  const canAdminAct = status === 'PENDING_ADMIN' || (status === 'PENDING' && !emp.managerId);
  const leaveTypeLabel = leave.leaveType === 'OTHER' && leave.otherLeaveName
    ? leave.otherLeaveName
    : formatLeaveType(typeLabels, leave.leaveType);

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-bold">Leave Request Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {getInitials(firstName, lastName)}
            </div>
            <div>
              <p className="text-lg font-bold">{fullName}</p>
              <p className="text-sm text-muted-foreground">{emp.employeeId || ''}</p>
            </div>
            <div className="ml-auto">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${typeColor}`}>
                {leave.leaveType ? leaveTypeLabel : '—'}
              </span>
            </div>
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="font-bold text-lg">{leave.totalDays || 0} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <p className="font-semibold text-sm">{formatDate(leave.startDate)}</p>
            </div>
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">To</p>
              <p className="font-semibold text-sm">{formatDate(leave.endDate)}</p>
            </div>
          </div>

          {leave.leaveType === 'EMERGENCY' && (
            <div className="flex gap-3 rounded-xl border border-orange-500/25 bg-orange-500/10 p-4">
              <ShieldAlert className="mt-0.5 shrink-0 text-orange-400" size={19} />
              <div>
                <p className="text-sm font-semibold text-orange-300">Emergency direct-admin request</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manager review was bypassed. Final approval deducts Casual balance and may create a negative advance recovered by future entitlement.
                </p>
                {leave.emergencyRecoveryDate && (
                  <p className="mt-2 text-xs text-orange-300/90">
                    Recovery starts {new Date(leave.emergencyRecoveryDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}.
                  </p>
                )}
              </div>
            </div>
          )}

          {leave.isSandwiched && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
              <p className="text-xs font-medium text-warning mb-1">Sandwich Rule Applied</p>
              <p className="text-sm">+{leave.sandwichExtraDays} day(s) added — a weekend/holiday between this leave and an unapproved absence was swallowed into the deduction.</p>
            </div>
          )}

          <div className="p-4 bg-muted/20 rounded-xl">
            <p className="text-xs text-muted-foreground mb-2">Reason</p>
            <p className="text-sm leading-relaxed">{leave.reason || 'No reason provided'}</p>
          </div>

          {leave.approverNote && (
            <div className="p-4 bg-muted/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-2">Approver Note</p>
              <p className="text-sm">{leave.approverNote}</p>
            </div>
          )}

          {leave.managerReviewedAt && (
            <div className="p-4 border border-success/20 bg-success/10 rounded-xl">
              <p className="text-xs font-semibold text-success mb-1">Manager review completed</p>
              <p className="text-sm">
                {leave.managerApprover ? `${leave.managerApprover.firstName} ${leave.managerApprover.lastName}` : 'Manager'}
                {leave.managerNote ? ` — ${leave.managerNote}` : ''}
              </p>
            </div>
          )}

          {leave.aiRecommendation && (() => {
            const meta = AI_RECOMMENDATION_META[leave.aiRecommendation] || AI_RECOMMENDATION_META.REVIEW;
            const RecIcon = meta.icon;
            return (
              <div className="p-4 rounded-xl border border-violet-500/25 bg-violet-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-violet-400" />
                  <p className="text-sm font-semibold text-violet-300">AI Recommendation</p>
                  <span className="ml-auto text-[11px] text-muted-foreground">Advisory only — read-only</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${meta.className}`}>
                    <RecIcon size={14} /> {meta.label}
                  </span>
                  {Number.isFinite(leave.aiConfidence) && (
                    <span className="text-xs text-muted-foreground">{leave.aiConfidence}% confidence</span>
                  )}
                </div>
                {Array.isArray(leave.aiReasoning) && leave.aiReasoning.length > 0 && (
                  <ul className="mb-3 space-y-1 text-sm">
                    {leave.aiReasoning.map((reason, i) => (
                      <li key={i} className="flex gap-2"><span className="text-violet-400">•</span><span>{reason}</span></li>
                    ))}
                  </ul>
                )}
                {Array.isArray(leave.aiPolicyObservations) && leave.aiPolicyObservations.length > 0 && (
                  <div className="border-t border-violet-500/15 pt-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Policy Notes</p>
                    <ul className="space-y-1 text-sm">
                      {leave.aiPolicyObservations.map((note, i) => (
                        <li key={i} className="flex gap-2"><span className="text-violet-400">•</span><span>{note}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
                  {leave.aiGeneratedAt && <span>Generated {new Date(leave.aiGeneratedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                  {leave.aiModel && <span>Model: {leave.aiModel}</span>}
                </div>
              </div>
            );
          })()}

          {canAdminAct && (
            <div className="flex gap-3 pt-1">
              <button onClick={() => onApprove(leave.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-success/15 text-success hover:bg-success/25 transition font-semibold">
                <Check size={16} /> Final approve
              </button>
              <button onClick={() => onReject(leave.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 transition font-semibold">
                <X size={16} /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
