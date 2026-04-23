'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Users, Clock, CalendarX, TrendingUp, Check, X, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ManagerDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      window.location.href = '/login';
    } else {
      setUser(JSON.parse(userData));
    }
  }, []);

  const stats = [
    { label: 'Team Members', value: '12', change: '+2', trend: 'up', icon: Users, gradient: 'from-cyan-500/20 to-blue-500/20', iconColor: 'text-cyan-400' },
    { label: 'Present Today', value: '11', change: '+1', trend: 'up', icon: Clock, gradient: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-400' },
    { label: 'On Leave', value: '1', change: '-1', trend: 'down', icon: CalendarX, gradient: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-400' },
    { label: 'Team Attendance', value: '91.7%', change: '+2.1%', trend: 'up', icon: TrendingUp, gradient: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400' }
  ];

  const [pendingLeaves, setPendingLeaves] = useState([
    { id: 1, employee: 'John Doe', type: 'Sick Leave', from: '2024-03-10', to: '2024-03-12', days: 3, reason: 'Medical appointment' },
    { id: 2, employee: 'Sarah Wilson', type: 'Casual Leave', from: '2024-03-15', to: '2024-03-15', days: 1, reason: 'Personal work' },
    { id: 3, employee: 'Mike Johnson', type: 'Annual Leave', from: '2024-03-20', to: '2024-03-25', days: 6, reason: 'Family vacation' },
  ]);

  const teamMembers = [
    { id: 1, name: 'John Doe', role: 'Developer', status: 'Present', checkIn: '08:30 AM', hours: '8h 45m' },
    { id: 2, name: 'Jane Smith', role: 'Designer', status: 'Present', checkIn: '08:45 AM', hours: '8h 30m' },
    { id: 3, name: 'Mike Johnson', role: 'Developer', status: 'On Leave', checkIn: '-', hours: '-' },
    { id: 4, name: 'Sarah Wilson', role: 'QA', status: 'Present', checkIn: '09:00 AM', hours: '8h 15m' },
    { id: 5, name: 'Robert Brown', role: 'Developer', status: 'Late', checkIn: '09:30 AM', hours: '7h 45m' },
  ];

  const teamPerformance = [
    { name: 'John', attendance: 95, tasks: 88 },
    { name: 'Jane', attendance: 98, tasks: 92 },
    { name: 'Mike', attendance: 85, tasks: 78 },
    { name: 'Sarah', attendance: 92, tasks: 95 },
    { name: 'Robert', attendance: 88, tasks: 82 },
  ];

  const weeklyAttendance = [
    { day: 'Mon', present: 11, absent: 1 },
    { day: 'Tue', present: 12, absent: 0 },
    { day: 'Wed', present: 10, absent: 2 },
    { day: 'Thu', present: 11, absent: 1 },
    { day: 'Fri', present: 11, absent: 1 },
  ];

  const teamStatus = [
    { name: 'Present', value: 9, color: '#10b981' },
    { name: 'Late', value: 2, color: '#f59e0b' },
    { name: 'On Leave', value: 1, color: '#06b6d4' },
  ];

  const handleApprove = (id) => {
    setPendingLeaves(pendingLeaves.filter(leave => leave.id !== id));
  };

  const handleReject = (id) => {
    setPendingLeaves(pendingLeaves.filter(leave => leave.id !== id));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.dataKey === 'attendance' || entry.dataKey === 'tasks' ? '%' : ''}
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
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Team Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your team attendance and performance</p>
            </div>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">{stat.label}</p>
                      <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                      <div className={`flex items-center gap-1 text-sm mt-1 ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stat.change}
                        {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                      <Icon size={22} className={stat.iconColor} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Attendance */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Weekly Team Attendance</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyAttendance} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Team Status */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Today Status</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={teamStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {teamStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {teamStatus.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Performance */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Team Performance</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="attendance" name="Attendance %" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={15} />
                  <Bar dataKey="tasks" name="Tasks %" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Leave Requests */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Pending Leave Requests ({pendingLeaves.length})</h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingLeaves.length > 0 ? (
                  pendingLeaves.map((leave) => (
                    <div key={leave.id} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{leave.employee}</h3>
                          <p className="text-sm text-muted-foreground">{leave.type} - {leave.days} day{leave.days > 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-warning/20 text-warning">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{leave.reason}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(leave.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition font-medium text-sm">
                          <Check size={16} /> Approve
                        </button>
                        <button onClick={() => handleReject(leave.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition font-medium text-sm">
                          <X size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarX size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No pending leave requests</p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Team Members</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        member.status === 'Present' ? 'bg-success/20 text-success' :
                        member.status === 'Late' ? 'bg-warning/20 text-warning' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {member.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{member.checkIn !== '-' ? `In: ${member.checkIn}` : '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
