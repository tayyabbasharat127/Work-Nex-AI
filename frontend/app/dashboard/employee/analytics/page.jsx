'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { BarChart3, TrendingUp, Clock, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function EmployeeAnalytics() {
  const stats = [
    { label: 'Average Check-in Time', value: '8:42 AM', icon: Clock, color: 'text-blue-400' },
    { label: 'Average Check-out Time', value: '5:38 PM', icon: Clock, color: 'text-purple-400' },
    { label: 'Days Present (This Month)', value: '18', icon: Calendar, color: 'text-green-400' },
    { label: 'Days Absent (This Month)', value: '1', icon: TrendingUp, color: 'text-red-400' },
  ];

  // Sample data for attendance trend (last 7 days)
  const attendanceTrendData = [
    { day: 'Mon', hours: 8.5, checkIn: '8:30', checkOut: '5:00' },
    { day: 'Tue', hours: 9.0, checkIn: '8:15', checkOut: '5:15' },
    { day: 'Wed', hours: 8.2, checkIn: '8:45', checkOut: '5:00' },
    { day: 'Thu', hours: 9.5, checkIn: '8:00', checkOut: '5:30' },
    { day: 'Fri', hours: 8.8, checkIn: '8:20', checkOut: '5:05' },
    { day: 'Sat', hours: 4.0, checkIn: '9:00', checkOut: '1:00' },
    { day: 'Sun', hours: 0, checkIn: '-', checkOut: '-' },
  ];

  // Sample data for monthly attendance
  const monthlyAttendanceData = [
    { month: 'Jan', present: 20, absent: 2, late: 3 },
    { month: 'Feb', present: 18, absent: 1, late: 2 },
    { month: 'Mar', present: 22, absent: 0, late: 1 },
    { month: 'Apr', present: 18, absent: 1, late: 2 },
  ];

  // Sample data for leave distribution
  const leaveDistributionData = [
    { name: 'Annual Leave', value: 5, color: '#3b82f6' },
    { name: 'Sick Leave', value: 2, color: '#ef4444' },
    { name: 'Casual Leave', value: 3, color: '#10b981' },
    { name: 'Remaining', value: 10, color: '#6b7280' },
  ];

  // Sample data for performance score
  const performanceData = [
    { month: 'Jan', score: 85 },
    { month: 'Feb', score: 88 },
    { month: 'Mar', score: 92 },
    { month: 'Apr', score: 90 },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">My Analytics</h1>
          <p className="text-muted-foreground mt-1">View your performance metrics and trends.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <Icon size={20} className={stat.color} />
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Work Hours */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Weekly Work Hours</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Hours Worked" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Attendance Trend */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Monthly Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyAttendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Distribution */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Leave Distribution (This Year)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leaveDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Score */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-6">Performance Score Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    name="Performance Score"
                    dot={{ fill: '#8b5cf6', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <TrendingUp className="text-green-400" size={24} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Attendance Rate</p>
                  <p className="text-2xl font-bold">94.7%</p>
                  <p className="text-xs text-green-400 mt-1">+2.3% from last month</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Clock className="text-blue-400" size={24} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Avg. Work Hours/Day</p>
                  <p className="text-2xl font-bold">8.6 hrs</p>
                  <p className="text-xs text-blue-400 mt-1">Target: 8 hrs</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <BarChart3 className="text-purple-400" size={24} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Performance Score</p>
                  <p className="text-2xl font-bold">90/100</p>
                  <p className="text-xs text-purple-400 mt-1">Excellent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
