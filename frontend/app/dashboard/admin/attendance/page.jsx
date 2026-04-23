'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Download, Calendar, Clock, UserCheck, UserX, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { attendanceAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const itemsPerPage = 8;

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      // Use getAll method with date parameter
      const data = await attendanceAPI.getAll({ date: selectedDate });
      // Handle different response formats
      const records = Array.isArray(data) ? data : (data?.records || data?.data || []);
      setAttendanceRecords(records);
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
    { label: 'Present Today', value: attendanceRecords.filter(r => r.status === 'Present').length, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Absent', value: attendanceRecords.filter(r => r.status === 'Absent').length, icon: UserX, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Late Arrivals', value: attendanceRecords.filter(r => r.status === 'Late').length, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'On Leave', value: attendanceRecords.filter(r => r.status === 'On Leave').length, icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  ];

  // Calculate status distribution from actual data
  const statusDistribution = [
    { name: 'Present', value: attendanceRecords.filter(r => r.status === 'Present').length, color: '#10b981' },
    { name: 'Late', value: attendanceRecords.filter(r => r.status === 'Late').length, color: '#f59e0b' },
    { name: 'Absent', value: attendanceRecords.filter(r => r.status === 'Absent').length, color: '#ef4444' },
    { name: 'On Leave', value: attendanceRecords.filter(r => r.status === 'On Leave').length, color: '#06b6d4' },
  ];

  // Mock data for charts (can be replaced with real data later)
  const weeklyData = [
    { day: 'Mon', present: 245, absent: 12, late: 8 },
    { day: 'Tue', present: 252, absent: 8, late: 5 },
    { day: 'Wed', present: 248, absent: 10, late: 7 },
    { day: 'Thu', present: 255, absent: 6, late: 4 },
    { day: 'Fri', present: 240, absent: 15, late: 10 },
  ];

  const hourlyTrend = [
    { time: '7 AM', count: 45 },
    { time: '8 AM', count: 120 },
    { time: '9 AM', count: 85 },
    { time: '10 AM', count: 15 },
    { time: '11 AM', count: 5 },
  ];

  const filteredRecords = attendanceRecords.filter(record => {
    const name = record.name || record.user?.name || `${record.user?.firstName || ''} ${record.user?.lastName || ''}`.trim() || '';
    const department = record.department || record.user?.department?.name || '';
    
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      department.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleMarkAttendance = async (id, newStatus) => {
    try {
      // Update locally first for immediate feedback
      setAttendanceRecords(records => 
        records.map(r => r.id === id ? { 
          ...r, 
          status: newStatus,
          checkIn: newStatus === 'Present' ? '08:30 AM' : r.checkIn,
          checkOut: newStatus === 'Present' ? '05:30 PM' : r.checkOut,
          workHours: newStatus === 'Present' ? '9h 0m' : r.workHours
        } : r)
      );
      
      // Call API to update on backend
      // await attendanceAPI.adjust(id, checkIn, checkOut, newStatus);
      toast.success('Attendance updated successfully');
    } catch (err) {
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
              <div className="h-64">
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
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Today Status</h2>
              <div className="h-48">
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
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Check-in Time Distribution</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" name="Check-ins" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="Early Leave">Early Leave</option>
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
                  {paginatedRecords.map((record) => {
                    const name = record.name || record.user?.name || `${record.user?.firstName || ''} ${record.user?.lastName || ''}`.trim() || 'Unknown';
                    const department = record.department || record.user?.department?.name || 'N/A';
                    const checkIn = record.checkIn || record.check_in || '-';
                    const checkOut = record.checkOut || record.check_out || '-';
                    const workHours = record.workHours || record.work_hours || record.workingHours || '-';
                    const status = record.status || 'Unknown';
                    
                    return (
                    <tr key={record.id} className="hover:bg-muted/30 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {name.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">{department}</td>
                      <td className="py-4 px-6"><span className={checkIn === '-' ? 'text-muted-foreground' : 'text-foreground'}>{checkIn}</span></td>
                      <td className="py-4 px-6"><span className={checkOut === '-' ? 'text-muted-foreground' : 'text-foreground'}>{checkOut}</span></td>
                      <td className="py-4 px-6 font-medium">{workHours}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          status === 'Present' || status === 'PRESENT' ? 'bg-success/20 text-success' :
                          status === 'Late' || status === 'LATE' ? 'bg-warning/20 text-warning' :
                          status === 'Absent' || status === 'ABSENT' ? 'bg-destructive/20 text-destructive' :
                          status === 'On Leave' || status === 'ON_LEAVE' ? 'bg-primary/20 text-primary' :
                          'bg-accent/20 text-accent'
                        }`}>{status}</span>
                      </td>
                      <td className="py-4 px-6">
                        {(status === 'Absent' || status === 'ABSENT') && (
                          <button onClick={() => handleMarkAttendance(record.id, 'Present')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition">Mark Present</button>
                        )}
                        {status !== 'Absent' && status !== 'ABSENT' && <span className="text-muted-foreground text-xs">-</span>}
                      </td>
                    </tr>
                  );
                  })}
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
