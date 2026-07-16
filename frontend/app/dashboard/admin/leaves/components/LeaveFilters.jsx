'use client';

import { Search } from 'lucide-react';
import { formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { REQUEST_LEAVE_TYPES } from '../constants';

export default function LeaveFilters({
  search, setSearch,
  filterStatus, setFilterStatus,
  filterType, setFilterType,
  setCurrentPage,
  typeLabels,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search employee name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary transition"
        />
      </div>
      <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary min-w-[140px]">
        <option value="ALL">All Status</option>
        <option value="PENDING">All Pending</option>
        <option value="PENDING_MANAGER">Awaiting Manager</option>
        <option value="PENDING_ADMIN">Awaiting Admin</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
        className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary min-w-[140px]">
        <option value="ALL">All Types</option>
        {REQUEST_LEAVE_TYPES.map(t => (
          <option key={t} value={t}>{formatLeaveType(typeLabels, t)}</option>
        ))}
      </select>
    </div>
  );
}
