'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Download, Calendar, UserCheck, UserX, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { attendanceAPI, organizationSettingsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

const localDateInputValue = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

function EmptyChart({ loading, label }) {
  return (
    <div className="min-h-48 flex items-center justify-center border border-dashed border-border rounded-lg text-sm text-muted-foreground">
      {loading ? 'Loading...' : label}
    </div>
  );
}

export default function AdminAttendance() {
  const [selectedDate, setSelectedDate] = useState(localDateInputValue());
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [ipConfigured, setIpConfigured] = useState(true);
  const itemsPerPage = 8;

  const statusLabel = (status) => (status || '').replace('_', ' ');
  const formatTime = (value) => value ? new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '---';
  const formatHours = (hours) => {
    if (hours === null || hours === undefined) return '---';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };
  const personName = (record) => {
    const user = record.user || {};
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
  };
  const departmentName = (record) => record.user?.department?.name || 'Unassigned';

  useEffect(() => {
    loadAttendance();
    organizationSettingsAPI.get().then((settings) => {
      const ranges = settings?.officeIpRanges;
      const hasRanges = Array.isArray(ranges) ? ranges.length > 0 : !!ranges;
      setIpConfigured(settings?.wifiVerificationEnabled === true && hasRanges);
    }).catch(() => setIpConfigured(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      // Use getAll method with date parameter
      const data = await attendanceAPI.getAll({ date: selectedDate });
      // Handle different response formats
      const records = Array.isArray(data) ? data : (data?.records || data?.data || []);
      setAttendanceRecords(records);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      toast.error('Failed to load attendance data');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from actual data
  const stats = [
    { label: 'Present Today', value: attendanceRecords.filter(r => ['PRESENT', 'LATE'].includes(r.status)).length, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Absent', value: attendanceRecords.filter(r => r.status === 'ABSENT').length, icon: UserX, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Late Arrivals', value: attendanceRecords.filter(r => r.status === 'LATE').length, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'On Leave', value: attendanceRecords.filter(r => r.status === 'ON_LEAVE').length, icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  ];

  // Calculate status distribution from actual data
  const statusDistribution = [
    { name: 'Present', value: attendanceRecords.filter(r => r.status === 'PRESENT').length, color: '#10b981' },
    { name: 'Late', value: attendanceRecords.filter(r => r.status === 'LATE').length, color: '#f59e0b' },
    { name: 'Absent', value: attendanceRecords.filter(r => r.status === 'ABSENT').length, color: '#ef4444' },
    { name: 'On Leave', value: attendanceRecords.filter(r => r.status === 'ON_LEAVE').length, color: '#06b6d4' },
  ].filter(item => item.value > 0);

  const weeklyData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
    day,
    present: attendanceRecords.filter(r => new Date(r.date).getDay() === index && ['PRESENT', 'LATE'].includes(r.status)).length,
    late: attendanceRecords.filter(r => new Date(r.date).getDay() === index && r.status === 'LATE').length,
    absent: attendanceRecords.filter(r => new Date(r.date).getDay() === index && r.status === 'ABSENT').length,
  })).filter(item => item.present || item.late || item.absent);

  const hourlyTrend = Array.from({ length: 6 }, (_, i) => 7 + i).map(hour => ({
    time: `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`,
    count: attendanceRecords.filter(r => r.checkIn && new Date(r.checkIn).getHours() === hour).length,
  })).filter(item => item.count > 0);

  const filteredRecords = attendanceRecords.filter(record => {
    const needle = search.toLowerCase();
    const matchesSearch = personName(record).toLowerCase().includes(needle) ||
      departmentName(record).toLowerCase().includes(needle);
    const matchesStatus = filterStatus === 'All' || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleMarkAttendance = async (id, newStatus) => {
    try {
      await attendanceAPI.update(id, { status: newStatus, notes: 'Admin correction from attendance dashboard' });
      await loadAttendance();
      toast.success('Attendance updated successfully');
    } catch {
      toast.error('Failed to update attendance');
      // Reload data on error
      loadAttendance();
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Attendance Management</h1>
              <p className="text-muted-foreground mt-1">Track and manage employee attendance</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary"
              />
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!ipConfigured && (
            <div className="flex items-start gap-3 px-5 py-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">IP-based attendance is not configured</p>
                <p className="text-amber-400/80 mt-0.5">
                  Attendance is being recorded without network verification. Configure your office IP ranges to enforce location-based check-in.
                </p>
              </div>
              <a
                href="/dashboard/admin/settings"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition"
              >
                <Settings size={13} />
                Configure Now
              </a>
            </div>
          )}

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Weekly Attendance Overview</h2>
              {weeklyData.length ? <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div> : <EmptyChart loading={loading} label="No weekly attendance data for this date" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Today Status</h2>
              {statusDistribution.length ? <div className="h-48 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div> : <EmptyChart loading={loading} label="No status data for this date" />}
              {statusDistribution.length > 0 && <div className="grid grid-cols-2 gap-2 mt-4">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Check-in Time Distribution</h2>
            {hourlyTrend.length ? <div className="h-48 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" name="Check-ins" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div> : <EmptyChart loading={loading} label="No check-in times recorded for this date" />}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search by name or department..."
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
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading attendance data...</div>
            ) : paginatedRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
            ) : (
              <>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold">Employee</th>
                    <th className="text-left py-4 px-6 font-semibold">Department</th>
                    <th className="text-left py-4 px-6 font-semibold">Check In</th>
                    <th className="text-left py-4 px-6 font-semibold">Check Out</th>
                    <th className="text-left py-4 px-6 font-semibold">Work Hours</th>
                    <th className="text-left py-4 px-6 font-semibold">Status</th>
                    <th className="text-left py-4 px-6 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {personName(record).split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium">{personName(record)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">{departmentName(record)}</td>
                      <td className="py-4 px-6"><span className={!record.checkIn ? 'text-muted-foreground' : 'text-foreground'}>{formatTime(record.checkIn)}</span></td>
                      <td className="py-4 px-6"><span className={!record.checkOut ? 'text-muted-foreground' : 'text-foreground'}>{formatTime(record.checkOut)}</span></td>
                      <td className="py-4 px-6 font-medium">{formatHours(record.workingHours)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          record.status === 'PRESENT' ? 'bg-success/20 text-success' :
                          record.status === 'LATE' ? 'bg-warning/20 text-warning' :
                          record.status === 'ABSENT' ? 'bg-destructive/20 text-destructive' :
                          record.status === 'ON_LEAVE' ? 'bg-primary/20 text-primary' :
                          'bg-accent/20 text-accent'
                        }`}>{statusLabel(record.status)}</span>
                      </td>
                      <td className="py-4 px-6">
                        {record.status === 'ABSENT' && (
                          <button onClick={() => handleMarkAttendance(record.id, 'PRESENT')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition">Mark Present</button>
                        )}
                        {record.status !== 'ABSENT' && <span className="text-muted-foreground text-xs">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition"><ChevronRight size={16} /></button>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
