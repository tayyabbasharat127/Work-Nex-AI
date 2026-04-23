'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Clock } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';

export default function EmployeeAttendance() {
  const { todayStatus, history, loading, error, fetchTodayStatus, fetchHistory, checkIn, checkOut } = useAttendance();
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchTodayStatus(),
        fetchHistory({ limit: 30 })
      ]);
    } catch (err) {
      toast.error('Failed to load attendance data');
    }
  };

  useEffect(() => {
    if (todayStatus) {
      console.log('Today status updated:', todayStatus);
      console.log('checkIn:', todayStatus.checkIn);
      console.log('checkOut:', todayStatus.checkOut);
      const checkedIn = todayStatus.checkIn && !todayStatus.checkOut;
      console.log('Is checked in:', checkedIn);
      setIsCheckedIn(checkedIn);
    } else {
      console.log('No today status');
      setIsCheckedIn(false);
    }
  }, [todayStatus]);

  const handleCheckIn = async () => {
    try {
      await checkIn();
      toast.success('Checked in successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      toast.success('Checked out successfully!');
      setIsCheckedIn(false);
    } catch (err) {
      toast.error(err.message || 'Failed to check out');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '---';
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '---';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '---';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '---';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground mt-1">View your attendance history and work hours.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Check In/Out Actions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-2">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">
                  {isCheckedIn ? 'You are currently checked in' : 'Start your work day'}
                </p>
              </div>
              <div className="flex gap-3">
                {!isCheckedIn ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg bg-success text-white font-semibold hover:bg-success/90 transition disabled:opacity-50"
                  >
                    Check In
                  </button>
                ) : (
                  <button
                    onClick={handleCheckOut}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg bg-destructive text-white font-semibold hover:bg-destructive/90 transition disabled:opacity-50"
                  >
                    Check Out
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-6">Today's Status</h2>
            {loading && !todayStatus ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/20">
                    <Clock className="text-success" size={24} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Check In</p>
                    <p className="text-2xl font-bold">
                      {formatTime(todayStatus?.checkIn)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/20">
                    <Clock className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Check Out</p>
                    <p className="text-2xl font-bold">
                      {formatTime(todayStatus?.checkOut)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <Clock className="text-accent" size={24} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Work Hours</p>
                    <p className="text-2xl font-bold">
                      {calculateHours(todayStatus?.checkIn, todayStatus?.checkOut)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Attendance Records */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-6">Attendance History (Last 30 Days)</h2>
            {loading && (!history || history.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !Array.isArray(history) || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Check In</th>
                      <th className="text-left py-3 px-4 font-semibold">Check Out</th>
                      <th className="text-left py-3 px-4 font-semibold">Work Hours</th>
                      <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.isArray(history) && history.map((record, idx) => (
                      <tr key={record.id || idx} className="hover:bg-background transition">
                        <td className="py-4 px-4 font-medium">{formatDate(record.check_in || record.checkIn)}</td>
                        <td className="py-4 px-4 text-muted-foreground">{formatTime(record.checkIn || record.check_in)}</td>
                        <td className="py-4 px-4 text-muted-foreground">{formatTime(record.checkOut || record.check_out)}</td>
                        <td className="py-4 px-4 font-medium">{calculateHours(record.checkIn || record.check_in, record.checkOut || record.check_out)}</td>
                        <td className="py-4 px-4 text-muted-foreground text-xs font-mono">
                          {record.ipAddress || '---'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.status === 'Present' ? 'bg-success/20 text-success' :
                            record.status === 'Absent' ? 'bg-destructive/20 text-destructive' :
                            record.status === 'Holiday' ? 'bg-primary/20 text-primary' :
                            'bg-muted/20 text-muted-foreground'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}