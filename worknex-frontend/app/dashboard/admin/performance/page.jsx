'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import RoleGate from '@/components/RoleGate';
import { aiAPI, analyticsAPI, performanceAPI, reportsAPI, userAPI } from '@/lib/api';
import { Award, BarChart3, Brain, RefreshCw, ShieldAlert, Users } from 'lucide-react';

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.users)) return value.users;
  if (Array.isArray(value?.leaderboard)) return value.leaderboard;
  if (Array.isArray(value?.performance)) return value.performance;
  return [];
}

function employeeName(record, fallback = 'Employee') {
  const user = record?.user || record;
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return full || user?.name || user?.email || fallback;
}

function scoreClass(score) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function AdminPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');
  const [team, setTeam] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [report, setReport] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamRes, boardRes, usersRes, analyticsRes, reportRes] = await Promise.allSettled([
        performanceAPI.getTeam(),
        performanceAPI.getLeaderboard(),
        userAPI.getAll({ limit: 200 }),
        analyticsAPI.getDashboard(),
        reportsAPI.performance({ limit: 50 }),
      ]);

      if (teamRes.status === 'fulfilled') setTeam(toArray(teamRes.value));
      if (boardRes.status === 'fulfilled') setLeaderboard(toArray(boardRes.value));
      if (usersRes.status === 'fulfilled') setUsers(toArray(usersRes.value).filter((u) => u.role === 'EMPLOYEE' || u.role_id === 3));
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (reportRes.status === 'fulfilled') setReport(reportRes.value);

      const rejected = [teamRes, boardRes, usersRes].find((item) => item.status === 'rejected');
      if (rejected) setError(rejected.reason?.message || 'Some performance data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const avg = (key) => {
      if (!team.length) return 0;
      return team.reduce((sum, item) => sum + Number(item?.[key] || 0), 0) / team.length;
    };
    return {
      employees: users.length || team.length,
      overall: avg('overallScore'),
      attendance: avg('attendanceScore'),
      highRisk: leaderboard.filter((item) => Number(item.overallScore || 0) < 60).length,
    };
  }, [leaderboard, team, users]);

  const runPrediction = async () => {
    if (!selectedUserId) return;
    setPredicting(true);
    setPrediction(null);
    setSelectedPerformance(null);
    try {
      const [perfRes, predRes] = await Promise.allSettled([
        performanceAPI.getUser(selectedUserId),
        aiAPI.predictPerformance(selectedUserId),
      ]);
      if (perfRes.status === 'fulfilled') setSelectedPerformance(toArray(perfRes.value)[0] || perfRes.value);
      if (predRes.status === 'fulfilled') setPrediction(predRes.value);
      if (predRes.status === 'rejected') setError(predRes.reason?.message || 'Prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <RoleGate allow={['ADMIN', 'SUPER_ADMIN']}>
      <div className="flex h-screen bg-background">
        <Sidebar role="admin" />
        <main className="flex-1 overflow-auto md:ml-64">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card p-6">
            <div>
              <h1 className="text-3xl font-bold">Performance</h1>
              <p className="text-muted-foreground mt-1">Organization-scoped performance, leaderboard, and AI risk prediction.</p>
            </div>
            <button onClick={loadData} disabled={loading} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-muted disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                ['Employees', kpis.employees, Users],
                ['Avg Overall', kpis.overall.toFixed(1), Award],
                ['Avg Attendance', kpis.attendance.toFixed(1), BarChart3],
                ['Low Score Flags', kpis.highRisk, ShieldAlert],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon size={18} />{label}</div>
                  <p className="mt-3 text-3xl font-bold">{loading ? '...' : value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <section className="xl:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
                <div className="border-b border-border p-4">
                  <h2 className="font-semibold">Leaderboard</h2>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading leaderboard...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No leaderboard records. Run ETL to generate performance data.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left">Rank</th>
                          <th className="px-4 py-3 text-left">Employee</th>
                          <th className="px-4 py-3 text-left">Department</th>
                          <th className="px-4 py-3 text-left">Overall</th>
                          <th className="px-4 py-3 text-left">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leaderboard.map((item, index) => (
                          <tr key={item.id || item.userId || index} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold">{index + 1}</td>
                            <td className="px-4 py-3">{employeeName(item, `Employee ${index + 1}`)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.user?.department?.name || item.department?.name || 'Unassigned'}</td>
                            <td className={`px-4 py-3 font-bold ${scoreClass(Number(item.overallScore || 0))}`}>{Number(item.overallScore || 0).toFixed(1)}</td>
                            <td className="px-4 py-3">{Number(item.attendanceScore || 0).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain size={20} className="text-primary" />
                  <h2 className="font-semibold">Employee Prediction</h2>
                </div>
                <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2">
                  <option value="">Select employee</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{employeeName(user)}</option>
                  ))}
                </select>
                <button onClick={runPrediction} disabled={!selectedUserId || predicting} className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
                  {predicting ? 'Predicting...' : 'Run Prediction'}
                </button>

                {prediction ? (
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted Score</p>
                        <p className="text-2xl font-bold">{prediction.predictedScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Level</p>
                        <p className="text-2xl font-bold">{prediction.riskLevel}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{prediction.fallback ? 'Deterministic fallback response' : 'AI service model response'} {prediction.modelVersion ? `- ${prediction.modelVersion}` : ''}</p>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {(prediction.reasons || []).map((reason, index) => <li key={index}>{reason}</li>)}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Select an employee to request a backend prediction.
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold mb-3">Team Performance Records</h2>
              {loading ? (
                <div className="text-muted-foreground">Loading records...</div>
              ) : team.length === 0 ? (
                <div className="text-muted-foreground">No team records returned by the performance API.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {team.slice(0, 9).map((item, index) => (
                    <div key={item.id || index} className="rounded-lg border border-border p-4">
                      <p className="font-semibold">{employeeName(item, `Employee ${index + 1}`)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.month || '-'} / {item.year || '-'}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <span>Overall <b className={scoreClass(Number(item.overallScore || 0))}>{Number(item.overallScore || 0).toFixed(1)}</b></span>
                        <span>Late <b>{item.lateDays || 0}</b></span>
                        <span>Hours <b>{Number(item.avgWorkingHours || 0).toFixed(1)}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Analytics source: {analytics ? 'dashboard API loaded' : 'dashboard API unavailable'}; report source: {report ? 'performance report API loaded' : 'performance report unavailable'}.
                {selectedPerformance ? ' Selected employee history loaded.' : ''}
              </p>
            </section>
          </div>
        </main>
      </div>
    </RoleGate>
  );
}
