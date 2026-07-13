'use client';

import { Check, X, Eye, FileText } from 'lucide-react';
import { formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { STATUS_CONFIG, TYPE_COLORS } from '../constants';
import { getInitials, formatDate } from '../helpers';

export default function LeaveTable({ loading, paginated, typeLabels, onView, onApprove, onReject }) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-12 text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          Loading leave requests...
        </div>
      </div>
    );
  }

  if (paginated.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-16 text-center">
          <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">No leave requests found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
            <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
            <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
            <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</th>
            <th className="text-left py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-right py-3.5 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paginated.map(leave => {
            const emp = leave.employee || {};
            const firstName = emp.firstName || '';
            const lastName = emp.lastName || '';
            const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Employee';
            const empId = emp.employeeId || '';
            const status = leave.status || 'PENDING';
            const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
            const typeColor = TYPE_COLORS[leave.leaveType] || TYPE_COLORS.OTHER;
            const days = leave.totalDays || 0;

            return (
              <tr key={leave.id} className="hover:bg-muted/20 transition group">
                {/* Employee */}
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      {getInitials(firstName, lastName)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{fullName}</p>
                      {empId && <p className="text-xs text-muted-foreground">{empId}</p>}
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="py-4 px-5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${typeColor}`}>
                    {leave.leaveType ? formatLeaveType(typeLabels, leave.leaveType) : '—'}
                  </span>
                </td>

                {/* Duration */}
                <td className="py-4 px-5">
                  <span className="text-sm font-semibold">{days}</span>
                  <span className="text-xs text-muted-foreground ml-1">{days === 1 ? 'day' : 'days'}</span>
                </td>

                {/* Dates */}
                <td className="py-4 px-5">
                  <p className="text-sm">{formatDate(leave.startDate)}</p>
                  <p className="text-xs text-muted-foreground">to {formatDate(leave.endDate)}</p>
                </td>

                {/* Status */}
                <td className="py-4 px-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-4 px-5">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onView(leave)}
                      className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
                      <Eye size={15} />
                    </button>
                    {status === 'PENDING' && (
                      <>
                        <button onClick={() => onApprove(leave.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition text-xs font-medium">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => onReject(leave.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition text-xs font-medium">
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
