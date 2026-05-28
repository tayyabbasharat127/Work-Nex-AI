'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, X, Clock, Eye, Search, ChevronLeft, ChevronRight, FileText, Calendar, Users, TrendingUp, Filter } from 'lucide-react';
import { leaveAPI } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-muted/30',      text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' },
};

const TYPE_COLORS = {
  ANNUAL:    'bg-blue-500/15 text-blue-400',
  SICK:      'bg-red-500/15 text-red-400',
  CASUAL:    'bg-purple-500/15 text-purple-400',
  MATERNITY: 'bg-pink-500/15 text-pink-400',
  PATERNITY: 'bg-cyan-500/15 text-cyan-400',
  UNPAID:    'bg-orange-500/15 text-orange-400',
  OTHER:     'bg-muted/30 text-muted-foreground',
};

function getInitials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewingLeave, setViewingLeave] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [policyDocument, setPolicyDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { loadLeaves(); }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const data = await leaveAPI.getAll();
      // Backend returns { leaves: [...] } or array
      const arr = Array.isArray(data) ? data : (data?.leaves || data?.data || []);
      setLeaves(arr);
    } catch (err) {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await leaveAPI.approve(id, '');
      toast.success('Leave approved');
      loadLeaves();
      setViewingLeave(null);
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await leaveAPI.reject(id, '');
      toast.success('Leave rejected');
      loadLeaves();
      setViewingLeave(null);
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
  };

  const handlePolicyUpload = async () => {
    if (!policyFile) {
      toast.error('Choose a policy document first');
      return;
    }
    try {
      const uploaded = await leaveAPI.uploadPolicyDocument(policyFile);
      const extracted = await leaveAPI.extractPolicyDocument(uploaded.id);
      const parsed = await leaveAPI.aiParsePolicyDocument(extracted.id);
      setPolicyDocument(parsed);
      toast.success('Policy extracted. Review rules before activation.');
    } catch (err) {
      toast.error(err.message || 'Policy upload failed');
    }
  };

  const handleApprovePolicyRules = async () => {
    try {
      const approved = await leaveAPI.approvePolicyRules(policyDocument.id, policyDocument.parsedRules);
      setPolicyDocument(approved);
      toast.success('Policy rules approved and activated');
    } catch (err) {
      toast.error(err.message || 'Failed to approve rules');
    }
  };

  // Stats
  const stats = [
    { label: 'Total Requests', value: leaves.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/20' },
    { label: 'Pending', value: leaves.filter(l => l.status === 'PENDING').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
    { label: 'Approved', value: leaves.filter(l => l.status === 'APPROVED').length, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20' },
    { label: 'Rejected', value: leaves.filter(l => l.status === 'REJECTED').length, icon: X, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20' },
  ];

  // Filter
  const filtered = leaves.filter(l => {
    const emp = l.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const matchType = filterType === 'ALL' || l.leaveType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        {/* Header */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border px-8 py-5 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Review and manage employee leave requests</p>
            </div>
            <button onClick={loadLeaves} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition text-sm">
              Refresh
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1">
                <h2 className="font-bold">Policy Document Automation</h2>
                <p className="text-sm text-muted-foreground">Upload .txt, .pdf, or .docx. Extracted rules require admin approval before activation.</p>
              </div>
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={(event) => setPolicyFile(event.target.files?.[0] || null)}
                className="text-sm"
              />
              <button onClick={handlePolicyUpload} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                Extract Rules
              </button>
            </div>
            {policyDocument?.parsedRules && (
              <div className="rounded-xl bg-muted/30 border border-border p-4">
                <pre className="text-xs overflow-auto max-h-52">{JSON.stringify(policyDocument.parsedRules, null, 2)}</pre>
                {policyDocument.status !== 'APPROVED_RULES_ACTIVE' && (
                  <button onClick={handleApprovePolicyRules} className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                    Approve Rules
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`bg-card border ${s.border} rounded-2xl p-5 hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${s.bg}`}>
                      <Icon size={18} className={s.color} />
                    </div>
                    <span className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
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
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary min-w-[140px]">
              <option value="ALL">All Types</option>
              {['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY','UNPAID','OTHER'].map(t => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                Loading leave requests...
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-16 text-center">
                <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">No leave requests found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
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
                            {leave.leaveType ? leave.leaveType.charAt(0) + leave.leaveType.slice(1).toLowerCase() : '—'}
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
                            <button onClick={() => setViewingLeave(leave)}
                              className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
                              <Eye size={15} />
                            </button>
                            {status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(leave.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition text-xs font-medium">
                                  <Check size={13} /> Approve
                                </button>
                                <button onClick={() => handleReject(leave.id)}
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
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {viewingLeave && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <h2 className="text-lg font-bold">Leave Request Details</h2>
                <button onClick={() => setViewingLeave(null)} className="p-2 hover:bg-muted rounded-xl transition">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Employee Info */}
                {(() => {
                  const emp = viewingLeave.employee || {};
                  const firstName = emp.firstName || '';
                  const lastName = emp.lastName || '';
                  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Employee';
                  const status = viewingLeave.status || 'PENDING';
                  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                  const typeColor = TYPE_COLORS[viewingLeave.leaveType] || TYPE_COLORS.OTHER;

                  return (
                    <>
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
                            {viewingLeave.leaveType ? viewingLeave.leaveType.charAt(0) + viewingLeave.leaveType.slice(1).toLowerCase() : '—'}
                          </span>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Duration</p>
                          <p className="font-bold text-lg">{viewingLeave.totalDays || 0} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">From</p>
                          <p className="font-semibold text-sm">{formatDate(viewingLeave.startDate)}</p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">To</p>
                          <p className="font-semibold text-sm">{formatDate(viewingLeave.endDate)}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-muted/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-2">Reason</p>
                        <p className="text-sm leading-relaxed">{viewingLeave.reason || 'No reason provided'}</p>
                      </div>

                      {viewingLeave.approverNote && (
                        <div className="p-4 bg-muted/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2">Approver Note</p>
                          <p className="text-sm">{viewingLeave.approverNote}</p>
                        </div>
                      )}

                      {status === 'PENDING' && (
                        <div className="flex gap-3 pt-1">
                          <button onClick={() => handleApprove(viewingLeave.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition font-semibold">
                            <Check size={16} /> Approve
                          </button>
                          <button onClick={() => handleReject(viewingLeave.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition font-semibold">
                            <X size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
