'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI, attendanceAPI, leaveAPI, notificationsAPI, performanceAPI, userAPI } from '@/lib/api';
import { Users, Clock, CalendarX, TrendingUp, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = { present: '#10b981', absent: '#ef4444', late: '#f59e0b', leave: '#06b6d4' };


function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function employeeName(user) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Employee';
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
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

function EmptyState({ label, loading }) {
  return (
    <div className="min-h-40 flex items-center justify-center border border-dashed border-border rounded-lg text-sm text-muted-foreground">
      {loading ? 'Loading...' : label}
    </div>
  );
}

export default function ManagerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const now = new Date();
      const params = { month: now.getMonth() + 1, year: now.getFullYear() };
      const [kpiData, usersData, attendanceData, leavesData, trendData, performanceData, notificationData] = await Promise.allSettled([
        analyticsAPI.getDashboard(),
        userAPI.getAll({ isActive: true, limit: 100 }),
        attendanceAPI.getAll({ date: todayIso(), limit: 100 }),
        leaveAPI.getPending(),
        analyticsAPI.getAttendanceTrends(params),
        performanceAPI.getTeam(params),
        notificationsAPI.getAll({ limit: 5 }),
      ]);

      if (kpiData.status === 'fulfilled') setKpis(kpiData.value);
      if (usersData.status === 'fulfilled') setTeamMembers(normalizeArray(usersData.value));
      if (attendanceData.status === 'fulfilled') setTodayAttendance(normalizeArray(attendanceData.value));
      if (leavesData.status === 'fulfilled') setPendingLeaves(normalizeArray(leavesData.value));
      if (trendData.status === 'fulfilled') setAttendanceTrend(normalizeArray(trendData.value));
      if (performanceData.status === 'fulfilled') setPerformanceRows(normalizeArray(performanceData.value));
      if (notificationData.status === 'fulfilled') setNotifications(normalizeArray(notificationData.value));
    } catch (err) {
      setError(err.message || 'Failed to load team dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('user');
      if (!raw) { window.location.href = '/login'; return; }
      setUser(JSON.parse(raw));
    } catch {
      window.location.href = '/login';
      return;
    }
    const timer = setTimeout(loadDashboard, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleApprove = async (id) => {
    await leaveAPI.approve(id, 'Approved from manager dashboard');
    await loadDashboard();
  };

  const handleReject = async (id) => {
    await leaveAPI.reject(id, 'Rejected from manager dashboard');
    await loadDashboard();
  };

  if (!mounted) return null;

  const present = todayAttendance.filter((item) => ['PRESENT', 'LATE'].includes(item.status)).length;
  const late = todayAttendance.filter((item) => item.status === 'LATE').length;
  const absent = todayAttendance.filter((item) => item.status === 'ABSENT').length;
  const onLeave = pendingLeaves.filter((item) => item.status === 'PENDING').length;
  const teamStatus = [
    { name: 'Present', value: present, color: COLORS.present },
    { name: 'Late', value: late, color: COLORS.late },
    { name: 'Absent', value: absent, color: COLORS.absent },
    { name: 'Pending Leave', value: onLeave, color: COLORS.leave },
  ].filter((item) => item.value > 0);

  const memberRows = teamMembers.map((member) => {
    const attendance = todayAttendance.find((item) => item.userId === member.id);
    return {
      id: member.id,
      name: employeeName(member),
      role: member.designation || member.role || 'Team member',
      status: attendance?.status || 'No record',
      checkIn: attendance?.checkIn ? new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    };
  });

  const performanceChart = performanceRows.map((row) => ({
    name: employeeName(row.user || row),
    attendance: row.attendanceScore ?? row.attendance ?? row.overallScore ?? 0,
    score: row.overallScore ?? row.score ?? 0,
  }));

  const stats = [
    { label: 'Team Members', value: teamMembers.length || kpis?.totalEmployees || 0, icon: Users, color: 'text-cyan-400' },
    { label: 'Present Today', value: present || kpis?.activeToday || 0, icon: Clock, color: 'text-emerald-400' },
    { label: 'Absent Today', value: absent || kpis?.absentToday || 0, icon: CalendarX, color: 'text-red-400' },
    { label: 'Attendance Rate', value: `${kpis?.attendanceRate ?? 0}%`, icon: TrendingUp, color: 'text-violet-400' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Team Dashboard</h1>
              <p className="text-muted-foreground mt-1">Team-scoped attendance, leave, and performance data.</p>
            </div>
            <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">{stat.label}</p>
                      <h3 className="text-2xl font-bold mt-1">{loading ? '...' : stat.value}</h3>
                    </div>
                    <Icon size={22} className={stat.color} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Team Attendance Trend</h2>
              {attendanceTrend.length ? (
                <div className="h-64 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceTrend} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey="PRESENT" name="Present" fill={COLORS.present} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ABSENT" name="Absent" fill={COLORS.absent} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="LATE" name="Late" fill={COLORS.late} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState loading={loading} label="No team attendance records this month" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Today Status</h2>
              {teamStatus.length ? (
                <>
                  <div className="h-48 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={teamStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                          {teamStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {teamStatus.map((item) => (
                      <span key={item.name} className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                    ))}
                  </div>
                </>
              ) : <EmptyState loading={loading} label="No attendance recorded today" />}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Team Performance</h2>
            {performanceChart.length ? (
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChart} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="attendance" name="Attendance" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={15} />
                    <Bar dataKey="score" name="Overall Score" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState loading={loading} label="No team performance records" />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Pending Team Leaves ({pendingLeaves.length})</h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingLeaves.length ? pendingLeaves.map((leave) => (
                  <div key={leave.id} className="p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{employeeName(leave.employee)}</h3>
                        <p className="text-sm text-muted-foreground">{leave.leaveType} - {leave.totalDays} day{leave.totalDays === 1 ? '' : 's'}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-lg bg-warning/20 text-warning">Pending</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{leave.reason || 'No reason provided'}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(leave.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition font-medium text-sm">
                        <Check size={16} /> Approve
                      </button>
                      <button onClick={() => handleReject(leave.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition font-medium text-sm">
                        <X size={16} /> Reject
                      </button>
                    </div>
                  </div>
                )) : <EmptyState loading={loading} label="No pending team leave requests" />}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Team Members</h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {memberRows.length ? memberRows.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">{member.status}</span>
                      <p className="text-xs text-muted-foreground mt-1">In: {member.checkIn}</p>
                    </div>
                  </div>
                )) : <EmptyState loading={loading} label="No direct subordinates found" />}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Notifications</h2>
            {notifications.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {notifications.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/30">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                  </div>
                ))}
              </div>
            ) : <EmptyState loading={loading} label="No recent notifications" />}
          </div>
        </div>
      </main>
    </div>
  );
}
