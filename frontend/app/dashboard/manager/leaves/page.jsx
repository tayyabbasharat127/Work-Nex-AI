'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, X } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { toast } from 'sonner';

export default function ManagerLeaves() {
  const { leaves, loading, fetchAllLeaves, updateLeaveStatus } = useLeaves();

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

  // Ensure leaves is always an array
  const leavesArray = Array.isArray(leaves) ? leaves : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Team Leaves</h1>
          <p className="text-muted-foreground mt-1">Approve or reject team member leave requests.</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : leavesArray.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leave requests found</div>
          ) : (
            <div className="space-y-4">
              {leavesArray.map((leave) => {
                const employeeName = leave.user?.name || leave.userName || 'Unknown';
                const leaveType = leave.leaveType || leave.type || 'N/A';
                const startDate = leave.startDate || leave.from || '';
                const endDate = leave.endDate || leave.to || '';
                
                return (
                  <div key={leave.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{employeeName}</h3>
                        <p className="text-sm text-muted-foreground">{leaveType}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        leave.status === 'Approved' ? 'bg-success/20 text-success' : 
                        leave.status === 'Rejected' ? 'bg-destructive/20 text-destructive' :
                        'bg-warning/20 text-warning'
                      }`}>
                        {leave.status}
                      </span>
                    </div>

                    <div className="flex gap-6 text-sm mb-6">
                      <div>
                        <p className="text-muted-foreground mb-1">From</p>
                        <p className="font-semibold">{startDate ? new Date(startDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">To</p>
                        <p className="font-semibold">{endDate ? new Date(endDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Days</p>
                        <p className="font-semibold">{leave.days || 'N/A'}</p>
                      </div>
                    </div>

                    {leave.status === 'Pending' && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleApprove(leave.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition font-medium"
                        >
                          <Check size={18} />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(leave.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition font-medium"
                        >
                          <X size={18} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
