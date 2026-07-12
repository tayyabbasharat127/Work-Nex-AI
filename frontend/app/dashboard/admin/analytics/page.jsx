'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI } from '@/lib/api';
import { useLeaveTypeLabels, formatLeaveType } from '@/hooks/useLeaveTypeLabels';
import { toast } from 'sonner';
import { Users, TrendingUp, Clock, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminAnalytics() {
  const [kpis, setKpis] = useState(null);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState([]);
  const [leaveByType, setLeaveByType] = useState([]);
  const [deptAttendance, setDeptAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const { labels: typeLabels } = useLeaveTypeLabels();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [kpiData, trendsData, leaveSum, leaveType, deptData, headData] = await Promise.allSettled([
        analyticsAPI.getDashboard(),
        analyticsAPI.getAttendanceTrends({ month, year }),
        analyticsAPI.getLeaveSummary({ year }),
        analyticsAPI.getLeaveByType({ year }),
        analyticsAPI.getDepartmentAttendance({ month, year }),
        analyticsAPI.getHeadcount(),
      ]);

      if (kpiData.status === 'fulfilled') setKpis(kpiData.value);

      if (trendsData.status === 'fulfilled') {
        const raw = trendsData.value;
        const arr = Array.isArray(raw) ? raw : (raw?.data || []);
        setAttendanceTrends(arr.map((row) => ({
          date: row.date,
          PRESENT: row.PRESENT || 0,
          ABSENT: row.ABSENT || 0,
          LATE: row.LATE || 0,
        })));
      }

      // Leave summary: backend returns [{status, _count, _sum}]
      if (leaveSum.status === 'fulfilled') {
        const raw = leaveSum.value;
        const arr = Array.isArray(raw) ? raw : (raw?.data || []);
        // Convert to monthly-style for chart
        setLeaveSummary(arr.map(r => ({
          status: r.status,
          count: r._count?.status || r.count || 0,
          days: r._sum?.totalDays || r.totalDays || 0,
        })));
      }

      // Leave by type: backend returns [{leaveType, _count, _sum}]
      if (leaveType.status === 'fulfilled') {
        const raw = leaveType.value;
        const arr = Array.isArray(raw) ? raw : (raw?.data || []);
        setLeaveByType(arr.map(r => ({
          leaveType: r.leaveType,
          label: formatLeaveType(typeLabels, r.leaveType),
          count: r._count?.leaveType || r.count || 0,
          days: r._sum?.totalDays || r.totalDays || 0,
        })));
      }

      // Dept attendance: backend now returns [{department, present, absent, total, rate}]
      if (deptData.status === 'fulfilled') {
        const raw = deptData.value;
        setDeptAttendance(Array.isArray(raw) ? raw : (raw?.data || []));
      }

      if (headData.status === 'fulfilled') {
        // Kept in the load set so this page exercises the active headcount contract.
      }
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Employees', value: kpis?.totalEmployees ?? '—', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Present Today', value: kpis?.activeToday ?? '—', icon: Clock, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Pending Leaves', value: kpis?.pendingLeaves ?? '—', icon: Calendar, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { label: 'Attendance Rate', value: kpis?.attendanceRate != null ? `${kpis.attendanceRate}%` : '—', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time workforce insights and trends.</p>
          </div>
          <button onClick={loadAll} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <div className={`p-2 rounded-lg ${s.bg}`}><Icon size={18} className={s.color} /></div>
                  </div>
                  <p className="text-3xl font-bold">{loading ? '...' : s.value}</p>
                </div>
              );
            })}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trends */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Attendance Trends</h2>
              {attendanceTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="PRESENT" stroke="#10b981" fill="#10b98120" name="Present" />
                    <Area type="monotone" dataKey="ABSENT" stroke="#ef4444" fill="#ef444420" name="Absent" />
                    <Area type="monotone" dataKey="LATE" stroke="#f59e0b" fill="#f59e0b20" name="Late" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart loading={loading} label="No attendance trend data" />
              )}
            </div>

            {/* Department Attendance */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Department Attendance Rate</h2>
              {deptAttendance.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptAttendance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" domain={[0, 100]} />
                    <YAxis type="category" dataKey="department" stroke="#9ca3af" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                    <Bar dataKey="rate" fill="#3b82f6" name="Rate %" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart loading={loading} label="No department data" />
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave by Type */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Leave Distribution by Type</h2>
              {leaveByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={leaveByType} cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="label"
                      label={({ label, count }) => `${label}: ${count}`}>
                      {leaveByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart loading={loading} label="No leave type data" />
              )}
            </div>

            {/* Leave Summary */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Leave Summary by Status</h2>
              {leaveSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={leaveSummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="status" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Requests" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="days" fill="#10b981" name="Total Days" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart loading={loading} label="No leave summary data" />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
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
