'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI, attendanceAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Download, FileText, RefreshCw, Filter, BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [leaveTrends, setLeaveTrends] = useState([]);
  const [headcount, setHeadcount] = useState(null);
  const [turnover, setTurnover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadReports();
  }, [month, year]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [attRes, leaveRes, headRes, turnRes] = await Promise.allSettled([
        analyticsAPI.getAttendanceTrends({ month, year }),
        analyticsAPI.getLeaveTrends({ year }),
        analyticsAPI.getHeadcount(),
        analyticsAPI.getTurnover({ year }),
      ]);

      if (attRes.status === 'fulfilled') {
        const d = attRes.value;
        setAttendanceSummary(Array.isArray(d) ? d : (d?.trends || d?.data || []));
      }
      if (leaveRes.status === 'fulfilled') {
        const d = leaveRes.value;
        setLeaveTrends(Array.isArray(d) ? d : (d?.trends || d?.data || []));
      }
      if (headRes.status === 'fulfilled') setHeadcount(headRes.value);
      if (turnRes.status === 'fulfilled') setTurnover(turnRes.value);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${year}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported!');
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'leave', label: 'Leave', icon: FileText },
    { id: 'workforce', label: 'Workforce', icon: Users },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground mt-1">Generate and export organization reports.</p>
            </div>
            <div className="flex items-center gap-3">
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-border bg-input text-sm">
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-border bg-input text-sm">
                {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={loadReports} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Attendance Report */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Attendance Report — {months[month - 1]} {year}</h2>
                <button onClick={() => exportCSV(attendanceSummary, 'attendance_report')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm">
                  <Download size={16} />
                  Export CSV
                </button>
              </div>

              {attendanceSummary.length > 0 ? (
                <>
                  <div className="bg-card border border-border rounded-xl p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attendanceSummary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="PRESENT" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ABSENT" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="LATE" fill="#f59e0b" name="Late" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-green-400">Present</th>
                          <th className="text-left py-3 px-4 font-semibold text-red-400">Absent</th>
                          <th className="text-left py-3 px-4 font-semibold text-yellow-400">Late</th>
                          <th className="text-left py-3 px-4 font-semibold text-orange-400">Half Day</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendanceSummary.slice(0, 20).map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition">
                            <td className="py-3 px-4 font-medium">{row.date}</td>
                            <td className="py-3 px-4 text-green-400">{row.PRESENT || 0}</td>
                            <td className="py-3 px-4 text-red-400">{row.ABSENT || 0}</td>
                            <td className="py-3 px-4 text-yellow-400">{row.LATE || 0}</td>
                            <td className="py-3 px-4 text-orange-400">{row.HALF_DAY || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <EmptyState loading={loading} label="No attendance data for this period" />
              )}
            </div>
          )}

          {/* Leave Report */}
          {activeTab === 'leave' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Leave Trends — {year}</h2>
                <button onClick={() => exportCSV(leaveTrends, 'leave_report')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm">
                  <Download size={16} />
                  Export CSV
                </button>
              </div>

              {leaveTrends.length > 0 ? (
                <>
                  <div className="bg-card border border-border rounded-xl p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={leaveTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="total_requests" fill="#3b82f6" name="Leave Requests" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_days" fill="#10b981" name="Total Days" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold">Month</th>
                          <th className="text-left py-3 px-4 font-semibold">Leave Requests</th>
                          <th className="text-left py-3 px-4 font-semibold">Total Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leaveTrends.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition">
                            <td className="py-3 px-4 font-medium">{row.month}</td>
                            <td className="py-3 px-4 text-blue-400">{row.total_requests}</td>
                            <td className="py-3 px-4 text-green-400">{row.total_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <EmptyState loading={loading} label="No leave trend data" />
              )}
            </div>
          )}

          {/* Workforce Report */}
          {activeTab === 'workforce' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Workforce Overview — {year}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Headcount</h3>
                  {headcount ? (
                    <div className="space-y-3">
                      {Object.entries(headcount).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState loading={loading} label="No headcount data" />
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Turnover Rate</h3>
                  {turnover ? (
                    <div className="space-y-3">
                      {Object.entries(turnover).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState loading={loading} label="No turnover data" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ loading, label }) {
  return (
    <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-xl">
      <div className="text-center">
        <BarChart3 size={36} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm">{loading ? 'Loading...' : label}</p>
      </div>
    </div>
  );
}
