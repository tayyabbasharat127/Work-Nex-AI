'use client';

import { Check, X } from 'lucide-react';
import { formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { STATUS_CONFIG, TYPE_COLORS } from '../constants';
import { getInitials, formatDate } from '../helpers';

export default function LeaveDetailModal({ leave, typeLabels, onClose, onApprove, onReject }) {
  if (!leave) return null;

  const emp = leave.employee || {};
  const firstName = emp.firstName || '';
  const lastName = emp.lastName || '';
  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Employee';
  const status = leave.status || 'PENDING';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const typeColor = TYPE_COLORS[leave.leaveType] || TYPE_COLORS.OTHER;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                {leave.leaveType ? formatLeaveType(typeLabels, leave.leaveType) : '—'}
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

          {leave.isSandwiched && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-xs font-medium text-amber-500 mb-1">Sandwich Rule Applied</p>
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

          {status === 'PENDING' && (
            <div className="flex gap-3 pt-1">
              <button onClick={() => onApprove(leave.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition font-semibold">
                <Check size={16} /> Approve
              </button>
              <button onClick={() => onReject(leave.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition font-semibold">
                <X size={16} /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
