'use client';

import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, X } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { toast } from 'sonner';

export default function ManagerLeaves() {
  const { leaves, loading, fetchPendingLeaves, updateLeaveStatus } = useLeaves();

  async function loadLeaves() {
    try {
      await fetchPendingLeaves(); // Changed to fetch only pending leaves
    } catch (err) {
      toast.error('Failed to load leaves');
    }
  }

  useEffect(() => {
    loadLeaves();
  }, []);

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
                
                return (
                  <div key={leave.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{employeeName}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{leaveType.toLowerCase()}</p>
                        {reason && <p className="text-sm text-muted-foreground mt-1">{reason}</p>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        status === 'APPROVED' || status === 'Approved' ? 'bg-green-500/20 text-green-400' : 
                        status === 'REJECTED' || status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="flex gap-6 text-sm mb-6">
                      <div>
                        <p className="text-muted-foreground mb-1">From</p>
                        <p className="font-semibold">
                          {startDate ? new Date(startDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">To</p>
                        <p className="font-semibold">
                          {endDate ? new Date(endDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Days</p>
                        <p className="font-semibold">{totalDays}</p>
                      </div>
                    </div>

                    {decision && (
                      <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                        <p className="font-semibold">Rule decision: {decision.decision}</p>
                        <p className="text-muted-foreground mt-1">{(decision.reasons || []).join('; ')}</p>
                      </div>
                    )}

                    {(status === 'PENDING' || status === 'Pending') && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleApprove(leave.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition font-medium"
                        >
                          <Check size={18} />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(leave.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition font-medium"
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
