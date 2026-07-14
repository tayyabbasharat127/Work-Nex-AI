'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { attendanceAPI, leaveAPI, performanceAPI } from '@/lib/api';
import { useLeaveTypeLabels, formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { BarChart3, TrendingUp, Clock, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function monthParams() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear(), limit: 100 };
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
}

function EmptyChart({ loading, label }) {
  return (
    <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
      <div className="text-center">
        <BarChart3 size={40} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm">{loading ? 'Loading...' : label}</p>
      </div>
    </div>
  );
}

export default function EmployeeAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [balances, setBalances] = useState([]);
  const [performance, setPerformance] = useState([]);
  const { labels: typeLabels } = useLeaveTypeLabels();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [attendanceData, balanceData, performanceData] = await Promise.allSettled([
        attendanceAPI.getMy(monthParams()),
        leaveAPI.getMyBalances(),
        performanceAPI.getMy({ year: new Date().getFullYear() }),
      ]);

      if (attendanceData.status === 'fulfilled') setAttendance(normalizeArray(attendanceData.value));
      if (balanceData.status === 'fulfilled') setBalances(normalizeArray(balanceData.value));
      if (performanceData.status === 'fulfilled') setPerformance(normalizeArray(performanceData.value));
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, []);

  const workedRows = attendance.filter((item) => Number(item.workingHours) > 0);
  const present = attendance.filter((item) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(item.status)).length;
  const absent = attendance.filter((item) => item.status === 'ABSENT').length;
  const late = attendance.filter((item) => item.status === 'LATE').length;
  const avgHours = workedRows.length ? (workedRows.reduce((sum, item) => sum + Number(item.workingHours || 0), 0) / workedRows.length).toFixed(1) : '0.0';
  const attendanceRate = attendance.length ? ((present / attendance.length) * 100).toFixed(1) : '0.0';
  const latestPerformance = performance[0];

  const workHours = [...attendance]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-14)
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: Number(item.workingHours || 0),
      checkIn: formatTime(item.checkIn),
      checkOut: formatTime(item.checkOut),
    }));

  const monthlyAttendance = Object.values(attendance.reduce((acc, item) => {
    const date = new Date(item.date);
    const week = `Week ${Math.ceil(date.getDate() / 7)}`;
    if (!acc[week]) acc[week] = { week, present: 0, absent: 0, late: 0 };
    if (item.status === 'ABSENT') acc[week].absent += 1;
    else if (item.status === 'LATE') acc[week].late += 1;
    else acc[week].present += 1;
    return acc;
  }, {}));

  const leaveDistribution = balances.flatMap((item, index) => {
    const label = item.policy?.leaveType ? formatLeaveType(typeLabels, item.policy.leaveType) : 'Leave';
    return [
      { name: `${label} used`, value: Number(item.usedDays || 0), color: index % 2 ? 'var(--chart-4)' : 'var(--chart-1)' },
      { name: `${label} remaining`, value: Number(item.remainingDays || 0), color: index % 2 ? 'var(--success)' : 'var(--info)' },
    ];
  }).filter((item) => item.value > 0);

  const performanceTrend = [...performance]
    .sort((a, b) => (a.year - b.year) || (a.month - b.month))
    .map((item) => ({
      period: `${item.month}/${item.year}`,
      score: item.overallScore ?? item.score ?? 0,
    }));

  const stats = [
    { label: 'Average Work Hours', value: `${avgHours} hrs`, icon: Clock, color: 'text-info' },
    { label: 'Days Present', value: present, icon: Calendar, color: 'text-success' },
    { label: 'Days Absent', value: absent, icon: AlertCircle, color: 'text-destructive' },
    { label: 'Late Days', value: late, icon: TrendingUp, color: 'text-warning' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Analytics</h1>
            <p className="text-muted-foreground mt-1">Self-scoped attendance, leave, and performance trends.</p>
          </div>
          <button onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <Icon size={20} className={stat.color} />
                  </div>
                  <p className="text-3xl font-bold">{loading ? '...' : stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Work Hours</h2>
              {workHours.length ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="hours" fill="var(--chart-1)" name="Hours Worked" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart loading={loading} label="No attendance history found" />}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Monthly Attendance</h2>
              {monthlyAttendance.length ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyAttendance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="present" stroke="var(--success)" strokeWidth={2} name="Present" />
                      <Line type="monotone" dataKey="absent" stroke="var(--destructive)" strokeWidth={2} name="Absent" />
                      <Line type="monotone" dataKey="late" stroke="var(--warning)" strokeWidth={2} name="Late" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart loading={loading} label="No attendance breakdown found" />}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Leave Balance</h2>
              {leaveDistribution.length ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leaveDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                        {leaveDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart loading={loading} label="No leave balance data found" />}
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Performance Score</h2>
              {performanceTrend.length ? (
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="var(--chart-4)" strokeWidth={3} name="Performance Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart loading={loading} label="No performance records found" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Metric icon={TrendingUp} label="Attendance Rate" value={`${attendanceRate}%`} detail={`${attendance.length} recorded day${attendance.length === 1 ? '' : 's'}`} color="text-success" />
            <Metric icon={Clock} label="Avg. Work Hours/Day" value={`${avgHours} hrs`} detail="Based on completed records" color="text-info" />
            <Metric icon={BarChart3} label="Performance Score" value={latestPerformance ? `${latestPerformance.overallScore ?? latestPerformance.score ?? 0}/100` : 'No record'} detail={latestPerformance ? `${latestPerformance.month}/${latestPerformance.year}` : 'Awaiting evaluation'} color="text-chart-4" />
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-4">
        <Icon className={color} size={24} />
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}
