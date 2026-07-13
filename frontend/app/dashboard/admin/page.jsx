'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI, attendanceAPI, etlAPI, notificationsAPI } from '@/lib/api';
import { getStoredUser } from '@/lib/authStorage';
import { useLeaveTypeLabels, formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { Users, Clock, CalendarX, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
    <div className="min-h-48 flex items-center justify-center border border-dashed border-border rounded-lg text-sm text-muted-foreground">
      {loading ? 'Loading...' : label}
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState(null);
  const [lateToday, setLateToday] = useState(0);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [departmentAttendance, setDepartmentAttendance] = useState([]);
  const [leaveDistribution, setLeaveDistribution] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [etlStatus, setEtlStatus] = useState(null);
  const { labels: typeLabels } = useLeaveTypeLabels();

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const now = new Date();
      const params = { month: now.getMonth() + 1, year: now.getFullYear() };
      const [kpiData, trendData, deptData, leaveTypeData, lateData, notificationData, etlData] = await Promise.allSettled([
        analyticsAPI.getDashboard(),
        analyticsAPI.getAttendanceTrends(params),
        analyticsAPI.getDepartmentAttendance(params),
        analyticsAPI.getLeaveByType({ year: now.getFullYear() }),
        attendanceAPI.getAll({ date: todayIso(), status: 'LATE', limit: 200 }),
        notificationsAPI.getAll({ limit: 5 }),
        etlAPI.getStatus(),
      ]);

      if (kpiData.status === 'fulfilled') setKpis(kpiData.value);
      if (trendData.status === 'fulfilled') setAttendanceTrend(normalizeArray(trendData.value));
      if (deptData.status === 'fulfilled') setDepartmentAttendance(normalizeArray(deptData.value));
      if (leaveTypeData.status === 'fulfilled') {
        setLeaveDistribution(normalizeArray(leaveTypeData.value).map((item, index) => ({
          name: item.leaveType ? formatLeaveType(typeLabels, item.leaveType) : 'Leave',
          value: item._sum?.totalDays || item.totalDays || item._count?.leaveType || item.count || 0,
          color: COLORS[index % COLORS.length],
        })).filter((item) => item.value > 0));
      }
      if (lateData.status === 'fulfilled') setLateToday(normalizeArray(lateData.value).length);
      if (notificationData.status === 'fulfilled') setNotifications(normalizeArray(notificationData.value));
      if (etlData.status === 'fulfilled') setEtlStatus(etlData.value);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      window.location.href = '/login';
      return;
    }
    setUser(storedUser);
    loadDashboard();
  }, []);

  if (!user) return null;

  const stats = [
    { label: 'Total Employees', value: kpis?.totalEmployees ?? 0, icon: Users, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-blue-500/20' },
    { label: 'Present Today', value: kpis?.activeToday ?? 0, icon: Clock, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/20' },
    { label: 'Absent Today', value: kpis?.absentToday ?? 0, icon: CalendarX, color: 'text-red-400', bg: 'from-red-500/20 to-rose-500/20' },
    { label: 'Late Today', value: lateToday, icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/20 to-yellow-500/20' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Organization activity from live backend data.</p>
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
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg}`}>
                      <Icon size={22} className={stat.color} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Monthly Attendance Trend</h2>
              {attendanceTrend.length ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceTrend} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey="PRESENT" name="Present" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ABSENT" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="LATE" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState loading={loading} label="No attendance records for this month" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Leave Utilization</h2>
              {leaveDistribution.length ? (
                <>
                  <div className="h-52 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leaveDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                          {leaveDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {leaveDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <EmptyState loading={loading} label="No approved leave utilization yet" />}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Department Attendance</h2>
              {departmentAttendance.length ? (
                <div className="h-64 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={departmentAttendance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="department" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="rate" name="Attendance %" stroke="#8b5cf6" fill="#8b5cf633" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState loading={loading} label="No department attendance data" />}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Recent Notifications</h2>
              {notifications.length ? (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/30">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : <EmptyState loading={loading} label="No recent notifications" />}
              <div className="mt-4 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                ETL status: <span className="font-medium text-foreground">{etlStatus?.status || (loading ? 'Loading...' : 'No recent ETL run')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
