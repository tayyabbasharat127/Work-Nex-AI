'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { Users, Clock, CalendarX, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      window.location.href = '/login';
    } else {
      setUser(JSON.parse(userData));
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch real data from API
      // For now, show empty state for new accounts
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // TODO: Replace with actual API calls
      // const users = await userAPI.getAll();
      // const attendance = await attendanceAPI.getToday();
      // Calculate stats from real data
      
      setStats({
        totalEmployees: 0,
        presentToday: 0,
        onLeave: 0,
        attendanceRate: 0
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsDisplay = [
    {
      label: 'Total Employees',
      value: loading ? '...' : stats.totalEmployees.toString(),
      change: '+0%',
      trend: 'up',
      icon: Users,
      gradient: 'from-cyan-500/20 to-blue-500/20',
      iconColor: 'text-cyan-400'
    },
    {
      label: 'Present Today',
      value: loading ? '...' : stats.presentToday.toString(),
      change: '+0%',
      trend: 'up',
      icon: Clock,
      gradient: 'from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-400'
    },
    {
      label: 'On Leave',
      value: loading ? '...' : stats.onLeave.toString(),
      change: '0%',
      trend: 'down',
      icon: CalendarX,
      gradient: 'from-amber-500/20 to-yellow-500/20',
      iconColor: 'text-amber-400'
    },
    {
      label: 'Attendance Rate',
      value: loading ? '...' : `${stats.attendanceRate}%`,
      change: '+0%',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-400'
    }
  ];

  // Weekly attendance data
  const weeklyData = [
    { day: 'Mon', present: 2180, absent: 120, late: 45 },
    { day: 'Tue', present: 2210, absent: 95, late: 38 },
    { day: 'Wed', present: 2190, absent: 110, late: 52 },
    { day: 'Thu', present: 2234, absent: 88, late: 31 },
    { day: 'Fri', present: 2150, absent: 145, late: 48 },
    { day: 'Sat', present: 1850, absent: 280, late: 23 },
    { day: 'Sun', present: 1200, absent: 450, late: 12 },
  ];

  // Monthly trend data
  const monthlyTrend = [
    { month: 'Jan', rate: 85 },
    { month: 'Feb', rate: 87 },
    { month: 'Mar', rate: 84 },
    { month: 'Apr', rate: 89 },
    { month: 'May', rate: 91 },
    { month: 'Jun', rate: 88 },
  ];

  // Leave distribution
  const leaveDistribution = [
    { name: 'Sick Leave', value: 35, color: '#06b6d4' },
    { name: 'Annual Leave', value: 45, color: '#8b5cf6' },
    { name: 'Casual Leave', value: 15, color: '#10b981' },
    { name: 'Other', value: 5, color: '#f59e0b' },
  ];

  // Department attendance
  const departmentData = [
    { dept: 'IT', attendance: 94 },
    { dept: 'HR', attendance: 91 },
    { dept: 'Sales', attendance: 88 },
    { dept: 'Finance', attendance: 92 },
    { dept: 'Marketing', attendance: 86 },
    { dept: 'Operations', attendance: 89 },
  ];

  const recentActivities = [
    { id: 1, user: 'John Doe', action: 'Checked In', time: '08:30 AM', type: 'checkin', avatar: 'JD' },
    { id: 2, user: 'Jane Smith', action: 'Applied for Leave', time: '09:15 AM', type: 'leave', avatar: 'JS' },
    { id: 3, user: 'Mike Johnson', action: 'Checked Out', time: '05:45 PM', type: 'checkout', avatar: 'MJ' },
    { id: 4, user: 'Sarah Wilson', action: 'Leave Approved', time: '10:20 AM', type: 'approved', avatar: 'SW' },
    { id: 5, user: 'Robert Brown', action: 'Late Check-In', time: '09:05 AM', type: 'alert', avatar: 'RB' },
  ];

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

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        {/* Header */}
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome back, {user?.name || 'Admin'}!
              </h1>
              <p className="text-muted-foreground mt-1">Here is what is happening in your organization today.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsDisplay.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={index} 
                  className="relative overflow-hidden bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                        <Icon size={24} className={stat.iconColor} />
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stat.change}
                        {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">{stat.label}</p>
                    <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State for New Accounts */}
          {!loading && stats.totalEmployees === 0 && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Welcome to WorkNex AI!</h3>
                <p className="text-muted-foreground mb-6">
                  Your organization dashboard is ready. Start by adding employees and departments to see analytics and insights.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/dashboard/admin/users" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium">
                    Add Employees
                  </Link>
                  <Link href="/dashboard/admin/departments" className="px-6 py-3 rounded-xl border border-border hover:bg-muted transition font-medium">
                    Setup Departments
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row 1 - Only show if there's data */}
          {!loading && stats.totalEmployees > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Attendance Chart */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Weekly Attendance</h2>
                  <p className="text-sm text-muted-foreground">Employee attendance breakdown by day</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="present" name="Present" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leave Distribution */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Leave Distribution</h2>
                <p className="text-sm text-muted-foreground">Current month breakdown</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {leaveDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {leaveDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Charts Row 2 - Only show if there's data */}
          {!loading && stats.totalEmployees > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Attendance Rate Trend</h2>
                <p className="text-sm text-muted-foreground">Monthly attendance percentage</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[80, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="rate" name="Attendance %" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Performance */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Department Performance</h2>
                <p className="text-sm text-muted-foreground">Attendance by department</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <YAxis type="category" dataKey="dept" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="attendance" name="Attendance %" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          )}

          {/* Recent Activities - Only show if there's data */}
          {!loading && stats.totalEmployees > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-6">Recent Activities</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-muted/50 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {activity.avatar}
                          </div>
                          <span className="font-medium">{activity.user}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">{activity.action}</td>
                      <td className="py-4 px-4 text-muted-foreground">{activity.time}</td>
                      <td className="py-4 px-4">
                        {activity.type === 'alert' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                            <AlertCircle size={14} />
                            Alert
                          </span>
                        ) : activity.type === 'checkin' || activity.type === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                            Info
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
