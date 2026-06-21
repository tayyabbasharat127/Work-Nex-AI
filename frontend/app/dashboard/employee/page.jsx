'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { attendanceAPI, leaveAPI, notificationsAPI, performanceAPI, userAPI } from '@/lib/api';
import { Clock, Calendar, TrendingUp, CheckCircle, LogIn, LogOut, AlertCircle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function displayName(user) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Employee';
}

function monthParams() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear(), limit: 60 };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color || '#06b6d4' }}>
          {entry.name}: {entry.value}{entry.dataKey === 'hours' ? 'h' : ''}
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

export default function EmployeeDashboard() {
  const [storedUser] = useState(getStoredUser);
  const [user, setUser] = useState(storedUser);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, todayData, historyData, balanceData, leaveData, performanceData, notificationData] = await Promise.allSettled([
        userAPI.getMe(),
        attendanceAPI.getToday(),
        attendanceAPI.getMy(monthParams()),
        leaveAPI.getMyBalances(),
        leaveAPI.getMy({ limit: 5 }),
        performanceAPI.getMy({ year: new Date().getFullYear() }),
        notificationsAPI.getAll({ limit: 5 }),
      ]);

      if (profileData.status === 'fulfilled') setUser(profileData.value);
      if (todayData.status === 'fulfilled') setToday(todayData.value || null);
      if (historyData.status === 'fulfilled') setHistory(normalizeArray(historyData.value));
      if (balanceData.status === 'fulfilled') setBalances(normalizeArray(balanceData.value));
      if (leaveData.status === 'fulfilled') setLeaves(normalizeArray(leaveData.value));
      if (performanceData.status === 'fulfilled') setPerformance(normalizeArray(performanceData.value));
      if (notificationData.status === 'fulfilled') setNotifications(normalizeArray(notificationData.value));
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storedUser) {
      window.location.href = '/login';
      return;
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadDashboard();
    return () => clearInterval(timer);
  }, [storedUser]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      await attendanceAPI.checkIn();
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      await attendanceAPI.checkOut();
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!storedUser) return null;

  const presentDays = history.filter((item) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(item.status)).length;
  const absentDays = history.filter((item) => item.status === 'ABSENT').length;
  const workedRows = history.filter((item) => Number(item.workingHours) > 0);
  const avgHours = workedRows.length ? (workedRows.reduce((sum, item) => sum + Number(item.workingHours || 0), 0) / workedRows.length).toFixed(1) : '0.0';
  const attendanceRate = history.length ? Math.round((presentDays / history.length) * 100) : 0;
  const remainingLeave = balances.reduce((sum, item) => sum + Number(item.remainingDays || 0), 0);
  const usedLeave = balances.reduce((sum, item) => sum + Number(item.usedDays || 0), 0);
  const isCheckedIn = Boolean(today?.checkIn && !today?.checkOut);
  const checkInLabel = today?.checkIn ? new Date(today.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  const weeklyHours = [...history]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map((item) => ({
      day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: Number(item.workingHours || 0),
    }));

  const weeklyAttendance = history.reduce((acc, item) => {
    const date = new Date(item.date);
    const week = `Week ${Math.ceil(date.getDate() / 7)}`;
    if (!acc[week]) acc[week] = { week, present: 0, absent: 0 };
    if (item.status === 'ABSENT') acc[week].absent += 1;
    else acc[week].present += 1;
    return acc;
  }, {});

  const leaveBalance = [
    { name: 'Used', value: usedLeave, color: '#06b6d4' },
    { name: 'Remaining', value: remainingLeave, color: '#10b981' },
  ].filter((item) => item.value > 0);

  const latestPerformance = performance[0];
  const stats = [
    { label: 'Days Present', value: presentDays, subtext: 'This month', icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Leave Balance', value: remainingLeave, subtext: 'Days remaining', icon: Calendar, color: 'text-cyan-400' },
    { label: 'Avg. Work Hours', value: `${avgHours}h`, subtext: 'Recorded days', icon: Clock, color: 'text-violet-400' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, subtext: `${absentDays} absent day${absentDays === 1 ? '' : 's'}`, icon: TrendingUp, color: 'text-amber-400' },
  ];

  const activity = [
    ...history.slice(0, 3).map((item) => ({
      id: `attendance-${item.id}`,
      action: item.status === 'ABSENT' ? 'Marked absent' : item.checkOut ? 'Checked out' : 'Checked in',
      detail: new Date(item.date).toLocaleDateString(),
      time: item.checkOut || item.checkIn ? new Date(item.checkOut || item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    })),
    ...leaves.slice(0, 2).map((item) => ({
      id: `leave-${item.id}`,
      action: `${item.leaveType} leave ${item.status?.toLowerCase() || 'updated'}`,
      detail: `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`,
      time: item.appliedAt ? new Date(item.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    })),
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {displayName(user)}!</h1>
              <p className="text-muted-foreground mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <div className="text-3xl font-bold text-primary font-mono">{currentTime.toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">{isCheckedIn ? 'You are currently checked in' : 'Attendance status'}</h2>
                <p className="text-muted-foreground">{checkInLabel ? `Checked in at ${checkInLabel}` : (today?.status || 'No attendance record for today')}</p>
              </div>
              {isCheckedIn ? (
                <button onClick={handleCheckOut} disabled={actionLoading} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition font-semibold">
                  <LogOut size={20} /> Check Out
                </button>
              ) : (
                <button onClick={handleCheckIn} disabled={actionLoading || Boolean(today?.checkIn)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition font-semibold disabled:opacity-50">
                  <LogIn size={20} /> Check In
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">{stat.label}</p>
                      <h3 className="text-2xl font-bold mt-1">{loading ? '...' : stat.value}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                    </div>
                    <Icon size={22} className={stat.color} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Recent Work Hours</h2>
              {weeklyHours.length ? (
                <div className="h-64 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 12]} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="hours" name="Hours" stroke="#06b6d4" strokeWidth={3} fill="#06b6d433" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState loading={loading} label="No attendance history yet" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Leave Balance</h2>
              {leaveBalance.length ? (
                <div className="h-48 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leaveBalance} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                        {leaveBalance.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState loading={loading} label="No leave balances found" />}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Monthly Attendance</h2>
              {Object.values(weeklyAttendance).length ? (
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.values(weeklyAttendance)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="week" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState loading={loading} label="No monthly attendance data" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
              {activity.length ? (
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.time}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState loading={loading} label="No recent activity" />}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Performance Snapshot</h2>
              {latestPerformance ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-muted-foreground">Overall Score</p>
                    <p className="text-2xl font-bold">{latestPerformance.overallScore ?? latestPerformance.score ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-muted-foreground">Period</p>
                    <p className="text-2xl font-bold">{latestPerformance.month}/{latestPerformance.year}</p>
                  </div>
                </div>
              ) : <EmptyState loading={loading} label="No performance record yet" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Notifications</h2>
              {notifications.length ? (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/30">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : <EmptyState loading={loading} label="No notifications" />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
