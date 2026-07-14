'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { performanceAPI, goalsAPI, reviewsAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Award, Clock, Calendar, TrendingUp, RefreshCw, Target, Plus, MessageSquare, Star } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GOAL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'MISSED'];

export default function EmployeePerformance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', metric: '', dueDate: '' });
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    loadGoalsAndReviews();
  };

  const loadGoalsAndReviews = async () => {
    try {
      const [goalsData, reviewsData] = await Promise.all([goalsAPI.getMy(), reviewsAPI.getMy()]);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      if (user?.id) {
        const summaryData = await performanceAPI.getSummary(user.id);
        setSummary(summaryData);
      }
    } catch {
      // Goals/reviews are a secondary panel — a failure here shouldn't block
      // the primary attendance-score view above from rendering.
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    setSavingGoal(true);
    try {
      await goalsAPI.create({ ...goalForm, dueDate: goalForm.dueDate || null });
      toast.success('Goal created');
      setGoalForm({ title: '', metric: '', dueDate: '' });
      setShowGoalForm(false);
      loadGoalsAndReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to create goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const updateGoalField = async (goal, field, value) => {
    try {
      await goalsAPI.update(goal.id, { [field]: value });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, [field]: value } : g)));
    } catch (err) {
      toast.error(err.message || 'Failed to update goal');
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
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getBg = (score) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
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
          {/* Overall Performance — from goals + manager reviews, kept separate from the attendance score below */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} className="text-chart-4" />
              <p className="text-sm text-muted-foreground">Overall Performance</p>
            </div>
            {summary?.overallPerformanceScore != null ? (
              <>
                <p className={`text-3xl font-bold ${getColor(summary.overallPerformanceScore)}`}>{summary.overallPerformanceScore}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.avgGoalCompletion != null ? `${summary.avgGoalCompletion}% avg goal completion` : 'No goals yet'}
                  {summary.avgManagerRating != null ? ` · ${summary.avgManagerRating}/5 avg rating` : ' · no reviews yet'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Set a goal or wait for a manager review to see this.</p>
            )}
          </div>

          {/* Latest Month Summary */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={18} className="text-warning" />
                  <p className="text-sm text-muted-foreground">Attendance & Punctuality Score</p>
                </div>
                <p className={`text-3xl font-bold ${getColor(latest.overallScore)}`}>
                  {(latest.overallScore || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-info" />
                  <p className="text-sm text-muted-foreground">Attendance Score</p>
                </div>
                <p className={`text-3xl font-bold ${getColor(latest.attendanceScore)}`}>
                  {(latest.attendanceScore || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-success" />
                  <p className="text-sm text-muted-foreground">Present Days</p>
                </div>
                <p className="text-3xl font-bold">{latest.presentDays || 0}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-chart-4" />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="overall" stroke="var(--chart-4)" strokeWidth={3} name="Overall" dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="attendance" stroke="var(--chart-1)" strokeWidth={2} name="Attendance" />
                  <Line type="monotone" dataKey="leave" stroke="var(--success)" strokeWidth={2} name="Leave" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Goals */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target size={20} className="text-chart-4" />
                My Goals
              </h2>
              <button onClick={() => setShowGoalForm((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition text-sm">
                <Plus size={14} /> Add Goal
              </button>
            </div>

            {showGoalForm && (
              <form onSubmit={handleCreateGoal} className="mb-4 p-4 rounded-lg border border-dashed border-border space-y-3">
                <input
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder='Goal title, e.g. "Complete AWS certification"'
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={goalForm.metric}
                    onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value })}
                    placeholder="Target (optional)"
                    className="px-3 py-2 rounded-lg border border-border bg-input text-sm"
                  />
                  <input
                    type="date"
                    value={goalForm.dueDate}
                    onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-border bg-input text-sm"
                  />
                </div>
                <button type="submit" disabled={savingGoal} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {savingGoal ? 'Saving...' : 'Create Goal'}
                </button>
              </form>
            )}

            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No goals yet — add one to start tracking.</p>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{goal.title}</p>
                      <select
                        value={goal.status}
                        onChange={(e) => updateGoalField(goal, 'status', e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-border bg-input"
                      >
                        {GOAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    {goal.metric && <p className="text-xs text-muted-foreground mb-2">Target: {goal.metric}</p>}
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min="0" max="100" value={goal.progress}
                        onChange={(e) => updateGoalField(goal, 'progress', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold w-10 text-right">{goal.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manager Reviews — read-only; only the manager fills rating/comments */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-info" />
              My Reviews
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{review.cycle}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${review.status === 'SUBMITTED' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                        {review.status === 'SUBMITTED' ? 'Submitted' : 'In progress'}
                      </span>
                    </div>
                    {review.status === 'SUBMITTED' ? (
                      <>
                        <div className="flex items-center gap-1 my-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={14} className={n <= review.managerRating ? 'text-warning fill-yellow-400' : 'text-muted-foreground'} />
                          ))}
                        </div>
                        {review.managerComments && <p className="text-sm text-muted-foreground">{review.managerComments}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Your manager hasn&apos;t submitted this review yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
                      <td className="py-3 px-4 text-success">{r.presentDays}</td>
                      <td className="py-3 px-4 text-destructive">{r.absentDays}</td>
                      <td className="py-3 px-4 text-warning">{r.lateDays}</td>
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
