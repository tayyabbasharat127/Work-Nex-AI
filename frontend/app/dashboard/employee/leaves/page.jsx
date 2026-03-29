'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, X } from 'lucide-react';
import { useLeaves } from '@/hooks/useLeaves';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';

export default function EmployeeLeaves() {
  const { leaves, loading, fetchMyLeaves, createLeave, deleteLeave } = useLeaves();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'Annual',
    reason: ''
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      await fetchMyLeaves();
    } catch (err) {
      toast.error('Failed to load leaves');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login first to apply for leave', {
          description: 'You need to be logged in to perform this action',
          action: {
            label: 'Login',
            onClick: () => window.location.href = '/login'
          }
        });
        return;
      }
    }
    
    try {
      console.log('Submitting leave:', formData);
      
      const result = await createLeave({
        start_date: formData.startDate,
        end_date: formData.endDate,
        leave_type: formData.type,
        reason: formData.reason
      });
      
      console.log('Leave created:', result);
      
      toast.success('Leave application submitted successfully');
      setShowModal(false);
      setFormData({ startDate: '', endDate: '', type: 'Annual', reason: '' });
      
      // Force reload the leaves list
      await loadLeaves();
    } catch (err) {
      console.error('Leave submission error:', err);
      const errorMessage = err.message || 'Failed to apply for leave';
      
      // Check if it's an authentication error
      if (errorMessage.includes('token') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        toast.error('Authentication required', {
          description: 'Please login to apply for leave',
          action: {
            label: 'Login',
            onClick: () => window.location.href = '/login'
          }
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (leaveId) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    
    try {
      await deleteLeave(leaveId);
      toast.success('Leave request cancelled');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel leave');
    }
  };

  // Ensure leaves is always an array
  const leavesArray = Array.isArray(leaves) ? leaves : [];

  // Calculate leave balance (mock data - should come from API)
  const balance = { casual: 8, annual: 12, sick: 5 };

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
              <p className="text-3xl font-bold text-primary">{balance.casual} days</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-muted-foreground text-sm mb-2">Annual Leave Balance</p>
              <p className="text-3xl font-bold text-primary">{balance.annual} days</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-muted-foreground text-sm mb-2">Sick Leave Balance</p>
              <p className="text-3xl font-bold text-primary">{balance.sick} days</p>
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
                {leavesArray.map((leave) => (
                  <div key={leave.id} className="p-6 border border-border rounded-lg hover:border-primary transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{leave.leave_type || leave.type}</h3>
                        <p className="text-sm text-muted-foreground">{leave.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          leave.status === 'Approved' ? 'bg-success/20 text-success' :
                          leave.status === 'Pending' ? 'bg-warning/20 text-warning' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {leave.status}
                        </span>
                        {leave.status === 'Pending' && (
                          <button
                            onClick={() => handleDelete(leave.id)}
                            className="p-1 hover:bg-destructive/10 rounded text-destructive"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">From</p>
                        <p className="font-semibold">{formatDate(leave.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">To</p>
                        <p className="font-semibold">{formatDate(leave.end_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Days</p>
                        <p className="font-semibold">{leave.days || calculateDays(leave.start_date, leave.end_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
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
                    <option value="Annual">Annual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Personal">Personal Leave</option>
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
