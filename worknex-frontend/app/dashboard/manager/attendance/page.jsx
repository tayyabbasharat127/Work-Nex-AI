'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Calendar, Users, Clock } from 'lucide-react';
import { attendanceAPI } from '@/lib/api';
import { toast } from 'sonner';

const localDateInputValue = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

export default function ManagerAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(localDateInputValue());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const attendanceData = await attendanceAPI.getAll({ date: selectedDate });
      const attendanceArray = Array.isArray(attendanceData) 
        ? attendanceData 
        : (attendanceData?.records || attendanceData?.attendance || attendanceData?.data || []);

      const mappedAttendance = attendanceArray.map(a => {
        const user = a.user || {};
        return {
          ...a,
          userName: user.firstName || user.lastName
            ? `${user.firstName} ${user.lastName}` 
            : 'Unknown',
          userEmail: user.email || user.employeeId || '---'
        };
      });
      
      setAttendance(mappedAttendance);
      
      // Calculate stats
      const present = mappedAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absent = mappedAttendance.filter(a => a.status === 'ABSENT').length;
      const late = mappedAttendance.filter(a => a.status === 'LATE').length;
      const onLeave = mappedAttendance.filter(a => a.status === 'ON_LEAVE').length;
      
      setStats({ present, absent, late, onLeave });
      
    } catch (err) {
      console.error('Failed to load attendance:', err);
      toast.error('Failed to load attendance data');
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateTime) => {
    if (!dateTime) return '---';
    return new Date(dateTime).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatHours = (hours) => {
    if (!hours) return '---';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-500/20 text-green-400';
      case 'LATE': return 'bg-yellow-500/20 text-yellow-400';
      case 'ABSENT': return 'bg-red-500/20 text-red-400';
      case 'ON_LEAVE': return 'bg-blue-500/20 text-blue-400';
      case 'HALF_DAY': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Team Attendance</h1>
          <p className="text-muted-foreground mt-1">View your team&apos;s attendance records.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold text-green-400">{stats.present}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Users size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold text-red-400">{stats.absent}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.late}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.onLeave}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Attendance Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading attendance...</p>
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
                <p className="text-muted-foreground">
                  No attendance data found for your team members
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold">Employee</th>
                      <th className="text-left py-4 px-6 font-semibold">Date</th>
                      <th className="text-left py-4 px-6 font-semibold">Check In</th>
                      <th className="text-left py-4 px-6 font-semibold">Check Out</th>
                      <th className="text-left py-4 px-6 font-semibold">Work Hours</th>
                      <th className="text-left py-4 px-6 font-semibold">IP Address</th>
                      <th className="text-center py-4 px-6 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/30 transition">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium">{record.userName}</p>
                            <p className="text-xs text-muted-foreground">{record.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {record.date ? new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '---'}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {formatTime(record.checkIn)}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {formatTime(record.checkOut)}
                        </td>
                        <td className="py-4 px-6 font-medium">
                          {formatHours(record.workingHours)}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground text-xs font-mono">
                          {record.ipAddress || '---'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status.replace('_', ' ')}
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
