'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, X } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { leaveAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function EmployeeLeaves() {
  const { leaves, loading, fetchMyLeaves, createLeave, cancelLeave } = useLeaves();
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
      setFormData({ startDate: '', endDate: '', type: 'ANNUAL', reason: '' });
      
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

  const balanceByType = Object.fromEntries(
    balances.map((balance) => [balance.policy?.leaveType, balance.remainingDays])
  );

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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus size={20} />
              Apply Leave
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Leave Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-muted-foreground text-sm mb-2">Casual Leave Balance</p>
              <p className="text-3xl font-bold text-primary">{balanceByType.CASUAL ?? 0} days</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-muted-foreground text-sm mb-2">Annual Leave Balance</p>
              <p className="text-3xl font-bold text-primary">{balanceByType.ANNUAL ?? 0} days</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-muted-foreground text-sm mb-2">Sick Leave Balance</p>
              <p className="text-3xl font-bold text-primary">{balanceByType.SICK ?? 0} days</p>
            </div>
          </div>

          {/* Leave Requests */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-6">Leave Requests</h2>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : leavesArray.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No leave requests found</div>
            ) : (
              <div className="space-y-4">
                {leavesArray.map((leave) => {
                  // Handle different field name formats from backend
                  const leaveType = leave.leaveType || leave.leave_type || leave.type || 'N/A';
                  const startDate = leave.startDate || leave.start_date;
                  const endDate = leave.endDate || leave.end_date;
                  const status = leave.status || 'PENDING';
                  const reason = leave.reason || '';
                  const decision = leave.decisionExplanation;
                  
                  return (
                    <div key={leave.id} className="p-6 border border-border rounded-lg hover:border-primary transition">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold capitalize">{leaveType.toLowerCase()}</h3>
                          <p className="text-sm text-muted-foreground">{reason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            status === 'APPROVED' || status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                            status === 'PENDING' || status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            status === 'REJECTED' || status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-muted/20 text-muted-foreground'
                          }`}>
                            {status}
                          </span>
                          {(status === 'PENDING' || status === 'Pending') && (
                            <button
                              onClick={() => handleDelete(leave.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition"
                              title="Cancel leave request"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">From</p>
                          <p className="font-semibold">
                            {startDate ? new Date(startDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : '---'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">To</p>
                          <p className="font-semibold">
                            {endDate ? new Date(endDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : '---'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Days</p>
                          <p className="font-semibold">
                            {leave.totalDays || leave.days || calculateDays(startDate, endDate)}
                          </p>
                        </div>
                      </div>
                      {decision && (
                        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                          <p className="font-semibold">Decision: {decision.decision}</p>
                          <p className="text-muted-foreground mt-1">{(decision.reasons || []).join('; ')}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="CASUAL">Casual Leave</option>
                    <option value="MATERNITY">Maternity Leave</option>
                    <option value="PATERNITY">Paternity Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
                    <option value="OTHER">Other</option>
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
