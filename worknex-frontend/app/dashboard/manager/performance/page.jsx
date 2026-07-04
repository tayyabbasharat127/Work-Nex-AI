'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { performanceAPI } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Star, RefreshCw, Award, Clock, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export default function ManagerPerformance() {
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamRes, leaderRes] = await Promise.allSettled([
        performanceAPI.getTeam(),
        performanceAPI.getLeaderboard(),
      ]);

      if (teamRes.status === 'fulfilled') {
        const d = teamRes.value;
        setTeamPerformance(Array.isArray(d) ? d : (d?.records || d?.data || d?.performance || []));
      }
      if (leaderRes.status === 'fulfilled') {
        const d = leaderRes.value;
        setLeaderboard(Array.isArray(d) ? d : (d?.leaderboard || d?.data || []));
      }
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Build chart data from team performance
  const chartData = teamPerformance.slice(0, 10).map(p => ({
    name: p.user ? `${p.user.firstName} ${p.user.lastName}`.slice(0, 10) : `Emp ${p.userId?.slice(0, 6)}`,
    attendance: p.attendanceScore || 0,
    leave: p.leaveScore || 0,
    overall: p.overallScore || 0,
  }));

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Team Performance</h1>
            <p className="text-muted-foreground mt-1">Review team member performance metrics.</p>
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          {teamPerformance.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/20"><Award size={18} className="text-green-400" /></div>
                  <p className="text-sm text-muted-foreground">Avg Overall Score</p>
                </div>
                <p className="text-3xl font-bold">
                  {(teamPerformance.reduce((s, p) => s + (p.overallScore || 0), 0) / teamPerformance.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/20"><Clock size={18} className="text-blue-400" /></div>
                  <p className="text-sm text-muted-foreground">Avg Attendance Score</p>
                </div>
                <p className="text-3xl font-bold">
                  {(teamPerformance.reduce((s, p) => s + (p.attendanceScore || 0), 0) / teamPerformance.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/20"><Calendar size={18} className="text-purple-400" /></div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                </div>
                <p className="text-3xl font-bold">{teamPerformance.length}</p>
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Team Performance Scores</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="attendance" fill="#3b82f6" name="Attendance" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leave" fill="#10b981" name="Leave" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overall" fill="#8b5cf6" name="Overall" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Team Performance Cards */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading performance data...</div>
          ) : teamPerformance.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Award size={48} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No performance records found</p>
              <p className="text-sm text-muted-foreground mt-1">Run ETL to generate performance data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamPerformance.map((member, i) => {
                const name = member.user
                  ? `${member.user.firstName} ${member.user.lastName}`
                  : `Employee ${i + 1}`;
                const overall = member.overallScore || 0;
                const attendance = member.attendanceScore || 0;
                const leave = member.leaveScore || 0;
                const avgHours = member.avgWorkingHours || 0;

                return (
                  <div key={member.id || i} className="bg-card border border-border rounded-xl p-6 hover:border-primary transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {member.month}/{member.year} • {member.presentDays || 0} days present
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(overall)}`}>{overall.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Overall Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Attendance Score</p>
                        <div className="w-full bg-muted rounded-full h-2 mb-1">
                          <div className={`h-full rounded-full ${getScoreBg(attendance)}`} style={{ width: `${attendance}%` }} />
                        </div>
                        <p className="text-sm font-semibold">{attendance.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Leave Score</p>
                        <div className="w-full bg-muted rounded-full h-2 mb-1">
                          <div className={`h-full rounded-full ${getScoreBg(leave)}`} style={{ width: `${leave}%` }} />
                        </div>
                        <p className="text-sm font-semibold">{leave.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Avg Hours/Day</p>
                        <p className="text-sm font-semibold">{avgHours.toFixed(1)} hrs</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Late Days</p>
                        <p className="text-sm font-semibold">{member.lateDays || 0} days</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Award size={20} className="text-yellow-400" />
                Performance Leaderboard
              </h2>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((emp, i) => {
                  const name = emp.user ? `${emp.user.firstName} ${emp.user.lastName}` : `Employee ${i + 1}`;
                  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{medals[i]}</span>
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{emp.user?.department?.name || ''}</p>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${getScoreColor(emp.overallScore || 0)}`}>
                        {(emp.overallScore || 0).toFixed(1)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
