'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { performanceAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Award, Clock, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function EmployeePerformance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await performanceAPI.getMy();
      const arr = Array.isArray(data) ? data : (data?.records || data?.data || data?.performance || []);
      // Sort by year/month descending
      arr.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
      setRecords(arr);
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = [...records].reverse().map(r => ({
    period: `${months[r.month]} ${r.year}`,
    attendance: r.attendanceScore || 0,
    leave: r.leaveScore || 0,
    overall: r.overallScore || 0,
  }));

  const latest = records[0];

  const getColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Performance</h1>
            <p className="text-muted-foreground mt-1">Track your performance metrics over time.</p>
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Latest Month Summary */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={18} className="text-yellow-400" />
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>
                <p className={`text-3xl font-bold ${getColor(latest.overallScore)}`}>
                  {(latest.overallScore || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-blue-400" />
                  <p className="text-sm text-muted-foreground">Attendance Score</p>
                </div>
                <p className={`text-3xl font-bold ${getColor(latest.attendanceScore)}`}>
                  {(latest.attendanceScore || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-green-400" />
                  <p className="text-sm text-muted-foreground">Present Days</p>
                </div>
                <p className="text-3xl font-bold">{latest.presentDays || 0}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-purple-400" />
                  <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                </div>
                <p className="text-3xl font-bold">{(latest.avgWorkingHours || 0).toFixed(1)}</p>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {chartData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Performance Trend</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="overall" stroke="#8b5cf6" strokeWidth={3} name="Overall" dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} name="Attendance" />
                  <Line type="monotone" dataKey="leave" stroke="#10b981" strokeWidth={2} name="Leave" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Records */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Award size={48} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No performance records yet</p>
              <p className="text-sm text-muted-foreground mt-1">Records are generated monthly by the ETL pipeline</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold">Monthly Breakdown</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Period</th>
                    <th className="text-left py-3 px-4 font-semibold">Present</th>
                    <th className="text-left py-3 px-4 font-semibold">Absent</th>
                    <th className="text-left py-3 px-4 font-semibold">Late</th>
                    <th className="text-left py-3 px-4 font-semibold">Avg Hours</th>
                    <th className="text-left py-3 px-4 font-semibold">Attendance</th>
                    <th className="text-left py-3 px-4 font-semibold">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition">
                      <td className="py-3 px-4 font-medium">{months[r.month]} {r.year}</td>
                      <td className="py-3 px-4 text-green-400">{r.presentDays}</td>
                      <td className="py-3 px-4 text-red-400">{r.absentDays}</td>
                      <td className="py-3 px-4 text-yellow-400">{r.lateDays}</td>
                      <td className="py-3 px-4">{(r.avgWorkingHours || 0).toFixed(1)}h</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getBg(r.attendanceScore)}`} style={{ width: `${r.attendanceScore}%` }} />
                          </div>
                          <span className={getColor(r.attendanceScore)}>{(r.attendanceScore || 0).toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${getColor(r.overallScore)}`}>{(r.overallScore || 0).toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
