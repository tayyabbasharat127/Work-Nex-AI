'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Clock, Calendar, TrendingUp, CheckCircle, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      window.location.href = '/login';
    } else {
      setUser(JSON.parse(userData));
    }
    
    // Load check-in state from localStorage
    const savedCheckInState = localStorage.getItem('isCheckedIn');
    const savedCheckInTime = localStorage.getItem('checkInTime');
    if (savedCheckInState === 'true' && savedCheckInTime) {
      setIsCheckedIn(true);
      setCheckInTime(new Date(savedCheckInTime));
    }
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'Days Present', value: '22', subtext: 'This month', icon: CheckCircle, gradient: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-400' },
    { label: 'Leave Balance', value: '12', subtext: 'Days remaining', icon: Calendar, gradient: 'from-cyan-500/20 to-blue-500/20', iconColor: 'text-cyan-400' },
    { label: 'Avg. Work Hours', value: '8.5h', subtext: 'Per day', icon: Clock, gradient: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400' },
    { label: 'Attendance Rate', value: '96%', subtext: '+2% this month', icon: TrendingUp, gradient: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-400' }
  ];

  const weeklyHours = [
    { day: 'Mon', hours: 8.5 },
    { day: 'Tue', hours: 9.0 },
    { day: 'Wed', hours: 8.0 },
    { day: 'Thu', hours: 8.5 },
    { day: 'Fri', hours: 7.5 },
  ];

  const monthlyAttendance = [
    { week: 'Week 1', present: 5, absent: 0 },
    { week: 'Week 2', present: 4, absent: 1 },
    { week: 'Week 3', present: 5, absent: 0 },
    { week: 'Week 4', present: 5, absent: 0 },
  ];

  const leaveBalance = [
    { name: 'Used', value: 8, color: '#06b6d4' },
    { name: 'Remaining', value: 12, color: '#10b981' },
  ];

  const recentActivity = [
    { id: 1, action: 'Checked In', date: 'Today', time: '08:30 AM', status: 'success' },
    { id: 2, action: 'Checked Out', date: 'Yesterday', time: '05:45 PM', status: 'success' },
    { id: 3, action: 'Leave Applied', date: 'Mar 5', time: '10:00 AM', status: 'pending' },
    { id: 4, action: 'Leave Approved', date: 'Mar 3', time: '02:30 PM', status: 'approved' },
    { id: 5, action: 'Late Check-In', date: 'Mar 1', time: '09:15 AM', status: 'warning' },
  ];

  const handleCheckIn = () => {
    const now = new Date();
    setIsCheckedIn(true);
    setCheckInTime(now);
    // Persist check-in state
    localStorage.setItem('isCheckedIn', 'true');
    localStorage.setItem('checkInTime', now.toISOString());
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    setCheckInTime(null);
    // Clear check-in state
    localStorage.removeItem('isCheckedIn');
    localStorage.removeItem('checkInTime');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
    return null;
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-6 z-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome, {user.name || 'Employee'}!
              </h1>
              <p className="text-muted-foreground mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-4xl font-bold text-primary font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Check In/Out Card */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">
                  {isCheckedIn ? 'You are currently checked in' : 'Ready to start your day?'}
                </h2>
                <p className="text-muted-foreground">
                  {isCheckedIn 
                    ? `Checked in at ${checkInTime?.toLocaleTimeString()}` 
                    : 'Click the button to check in for today'}
                </p>
              </div>
              {isCheckedIn ? (
                <button
                  onClick={handleCheckOut}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition font-semibold shadow-lg"
                >
                  <LogOut size={20} />
                  Check Out
                </button>
              ) : (
                <button
                  onClick={handleCheckIn}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition font-semibold shadow-lg shadow-primary/25"
                >
                  <LogIn size={20} />
                  Check In
                </button>
              )}
            </div>
          </div>

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
                      <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
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
            {/* Weekly Hours Chart */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Weekly Work Hours</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyHours}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="hours" name="Hours" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leave Balance */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Leave Balance</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leaveBalance} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {leaveBalance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {leaveBalance.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Attendance & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Monthly Attendance</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="week" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-success' :
                        activity.status === 'warning' ? 'bg-warning' :
                        activity.status === 'approved' ? 'bg-primary' :
                        'bg-muted-foreground'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.date}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Announcements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex gap-3">
                  <AlertCircle className="text-primary flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold">Company Holiday</p>
                    <p className="text-sm text-muted-foreground mt-1">Independence Day celebration on March 10th</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex gap-3">
                  <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold">System Maintenance</p>
                    <p className="text-sm text-muted-foreground mt-1">Scheduled on March 15th from 2:00 AM to 4:00 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
