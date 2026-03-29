'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, X, Clock, Eye, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { toast } from 'sonner';

export default function AdminLeaves() {
  const { leaves, loading, fetchAllLeaves, updateLeaveStatus } = useLeaves();
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const leaveTypes = ['Sick Leave', 'Annual Leave', 'Casual Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave'];

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      await fetchAllLeaves();
    } catch (err) {
      toast.error('Failed to load leaves');
    }
  };

  // Ensure leaves is always an array
  const leavesArray = Array.isArray(leaves) ? leaves : [];

  const stats = [
    { label: 'Total Requests', value: leavesArray.length, icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Pending', value: leavesArray.filter(l => l.status === 'Pending').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Approved', value: leavesArray.filter(l => l.status === 'Approved').length, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Rejected', value: leavesArray.filter(l => l.status === 'Rejected').length, icon: X, color: 'text-red-400', bg: 'bg-red-500/20' },
  ];

  const filteredLeaves = leavesArray.filter(leave => {
    const matchesSearch = (leave.user?.name || leave.user_name || leave.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (leave.user?.email || leave.user_email || leave.userEmail || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || leave.status === filterStatus;
    const matchesType = filterType === 'All' || leave.leave_type === filterType || leave.leaveType === filterType || leave.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const paginatedLeaves = filteredLeaves.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleApprove = async (id) => {
    try {
      await updateLeaveStatus(id, 'Approved', '');
      toast.success('Leave approved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id) => {
    try {
      await updateLeaveStatus(id, 'Rejected', '');
      toast.success('Leave rejected successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to reject leave');
    }
  };

  const handleView = (leave) => {
    setViewingLeave(leave);
    setShowViewModal(true);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div>
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground mt-1">Review and approve employee leave requests</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                      <Icon size={24} className={stat.color} />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary"
            >
              <option value="All">All Types</option>
              {leaveTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          {/* Leave Requests */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : paginatedLeaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leave requests found</div>
          ) : (
            <div className="space-y-4">
              {paginatedLeaves.map((leave) => {
                const userName = leave.user?.name || leave.user_name || leave.userName || 'Unknown';
                const userEmail = leave.user?.email || leave.user_email || leave.userEmail || '';
                const department = leave.user?.department || leave.department || 'N/A';
                const leaveType = leave.leave_type || leave.leaveType || leave.type || 'N/A';
                const startDate = leave.start_date || leave.startDate || leave.from || '';
                const endDate = leave.end_date || leave.endDate || leave.to || '';
                const reason = leave.reason || 'No reason provided';
                const days = leave.duration_days || leave.days || 'N/A';
                
                return (
                  <div key={leave.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {userName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{userName}</h3>
                          <p className="text-muted-foreground text-sm">{department} - {leaveType}</p>
                        </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-lg text-xs font-medium self-start ${
                        leave.status === 'Approved' ? 'bg-success/20 text-success' :
                        leave.status === 'Rejected' ? 'bg-destructive/20 text-destructive' :
                        'bg-warning/20 text-warning'
                      }`}>
                        {leave.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">From</p>
                        <p className="font-semibold text-sm">{startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">To</p>
                        <p className="font-semibold text-sm">{endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Duration</p>
                        <p className="font-semibold text-sm">{days} day{days > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Type</p>
                        <p className="font-semibold text-sm">{leaveType}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleView(leave)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition font-medium text-sm"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                      {leave.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(leave.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition font-medium text-sm"
                          >
                            <Check size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(leave.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition font-medium text-sm"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition"><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        {/* View Modal */}
        {showViewModal && viewingLeave && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold">Leave Request Details</h2>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-muted rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {(viewingLeave.user?.name || viewingLeave.user_name || viewingLeave.userName || 'U').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{viewingLeave.user?.name || viewingLeave.user_name || viewingLeave.userName || 'Unknown'}</h3>
                    <p className="text-muted-foreground">{viewingLeave.user?.email || viewingLeave.user_email || viewingLeave.userEmail || ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">Department</p>
                    <p className="font-semibold">{viewingLeave.user?.department || viewingLeave.department || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">Leave Type</p>
                    <p className="font-semibold">{viewingLeave.leave_type || viewingLeave.leaveType || viewingLeave.type || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">From</p>
                    <p className="font-semibold">{viewingLeave.start_date || viewingLeave.startDate || viewingLeave.from ? new Date(viewingLeave.start_date || viewingLeave.startDate || viewingLeave.from).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground text-xs mb-1">To</p>
                    <p className="font-semibold">{viewingLeave.end_date || viewingLeave.endDate || viewingLeave.to ? new Date(viewingLeave.end_date || viewingLeave.endDate || viewingLeave.to).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">Reason</p>
                  <p className="font-medium">{viewingLeave.reason || 'No reason provided'}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    viewingLeave.status === 'Approved' ? 'bg-success/20 text-success' :
                    viewingLeave.status === 'Rejected' ? 'bg-destructive/20 text-destructive' :
                    'bg-warning/20 text-warning'
                  }`}>{viewingLeave.status}</span>
                </div>
                {viewingLeave.status === 'Pending' && (
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { handleApprove(viewingLeave.id); setShowViewModal(false); }} className="flex-1 px-4 py-3 rounded-xl bg-success/20 text-success hover:bg-success/30 transition font-medium">Approve</button>
                    <button onClick={() => { handleReject(viewingLeave.id); setShowViewModal(false); }} className="flex-1 px-4 py-3 rounded-xl bg-destructive/20 text-destructive hover:bg-destructive/30 transition font-medium">Reject</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
