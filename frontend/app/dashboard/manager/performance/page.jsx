'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { performanceAPI, goalsAPI, reviewsAPI, userAPI } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Star, RefreshCw, Award, Clock, Calendar, Target, Plus, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export default function ManagerPerformance() {
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeGoals, setEmployeeGoals] = useState([]);
  const [employeeReviews, setEmployeeReviews] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', metric: '', dueDate: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ cycle: '', managerRating: 5, managerComments: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    loadTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) loadEmployeeGoalsAndReviews(selectedEmployeeId);
  }, [selectedEmployeeId]);

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

  const loadTeamMembers = async () => {
    try {
      const data = await userAPI.getAll();
      const list = Array.isArray(data) ? data : (data?.users || data?.data || []);
      setTeamMembers(list);
      if (list.length && !selectedEmployeeId) setSelectedEmployeeId(list[0].id);
    } catch {
      // Non-fatal — the Team Goals/Reviews panel just stays empty.
    }
  };

  const loadEmployeeGoalsAndReviews = async (userId) => {
    try {
      const [goalsData, reviewsData] = await Promise.all([goalsAPI.getUser(userId), reviewsAPI.getUser(userId)]);
      setEmployeeGoals(Array.isArray(goalsData) ? goalsData : []);
      setEmployeeReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load goals/reviews for this employee');
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim() || !selectedEmployeeId) return;
    setSaving(true);
    try {
      await goalsAPI.create({ ...goalForm, userId: selectedEmployeeId, dueDate: goalForm.dueDate || null });
      toast.success('Goal created');
      setGoalForm({ title: '', metric: '', dueDate: '' });
      setShowGoalForm(false);
      loadEmployeeGoalsAndReviews(selectedEmployeeId);
    } catch (err) {
      toast.error(err.message || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.cycle.trim() || !selectedEmployeeId) return;
    setSaving(true);
    try {
      await reviewsAPI.create({ ...reviewForm, userId: selectedEmployeeId });
      toast.success('Review created as draft');
      setReviewForm({ cycle: '', managerRating: 5, managerComments: '' });
      setShowReviewForm(false);
      loadEmployeeGoalsAndReviews(selectedEmployeeId);
    } catch (err) {
      toast.error(err.message || 'Failed to create review');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async (review) => {
    if (!review.managerRating) {
      toast.error('Set a rating before submitting');
      return;
    }
    try {
      await reviewsAPI.submit(review.id);
      toast.success('Review submitted');
      loadEmployeeGoalsAndReviews(selectedEmployeeId);
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
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
                  <div className="p-2 rounded-lg bg-success/20"><Award size={18} className="text-success" /></div>
                  <p className="text-sm text-muted-foreground">Avg Attendance & Punctuality Score</p>
                </div>
                <p className="text-3xl font-bold">
                  {(teamPerformance.reduce((s, p) => s + (p.overallScore || 0), 0) / teamPerformance.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-info/20"><Clock size={18} className="text-info" /></div>
                  <p className="text-sm text-muted-foreground">Avg Attendance Score</p>
                </div>
                <p className="text-3xl font-bold">
                  {(teamPerformance.reduce((s, p) => s + (p.attendanceScore || 0), 0) / teamPerformance.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-chart-4/20"><Calendar size={18} className="text-chart-4" /></div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="attendance" fill="var(--chart-1)" name="Attendance" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leave" fill="var(--success)" name="Leave" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overall" fill="var(--chart-4)" name="Overall" radius={[4, 4, 0, 0]} />
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
                        <p className="text-xs text-muted-foreground">Attendance & Punctuality Score</p>
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
                <Award size={20} className="text-warning" />
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

          {/* Team Goals & Reviews */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target size={20} className="text-chart-4" />
                Team Goals & Reviews
              </h2>
              {teamMembers.length > 0 && (
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-input text-sm"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              )}
            </div>

            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No direct reports found.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Goals */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Goals</h3>
                    <button onClick={() => setShowGoalForm((v) => !v)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition text-xs">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {showGoalForm && (
                    <form onSubmit={handleCreateGoal} className="mb-3 p-3 rounded-lg border border-dashed border-border space-y-2">
                      <input
                        value={goalForm.title}
                        onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                        placeholder="Goal title"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-input text-sm"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={goalForm.metric}
                          onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value })}
                          placeholder="Target (optional)"
                          className="px-3 py-1.5 rounded-lg border border-border bg-input text-sm"
                        />
                        <input
                          type="date"
                          value={goalForm.dueDate}
                          onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-border bg-input text-sm"
                        />
                      </div>
                      <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                        {saving ? 'Saving...' : 'Create Goal'}
                      </button>
                    </form>
                  )}
                  {employeeGoals.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No goals for this employee yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {employeeGoals.map((goal) => (
                        <div key={goal.id} className="p-3 rounded-lg border border-border text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{goal.title}</p>
                            <span className="text-xs text-muted-foreground">{goal.status.replace('_', ' ')}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                            <div className="h-full rounded-full bg-chart-4" style={{ width: `${goal.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reviews */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5"><MessageSquare size={14} /> Reviews</h3>
                    <button onClick={() => setShowReviewForm((v) => !v)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition text-xs">
                      <Plus size={12} /> Start Review
                    </button>
                  </div>
                  {showReviewForm && (
                    <form onSubmit={handleCreateReview} className="mb-3 p-3 rounded-lg border border-dashed border-border space-y-2">
                      <input
                        value={reviewForm.cycle}
                        onChange={(e) => setReviewForm({ ...reviewForm, cycle: e.target.value })}
                        placeholder='Cycle, e.g. "Q1 2026"'
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-input text-sm"
                        required
                      />
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button type="button" key={n} onClick={() => setReviewForm({ ...reviewForm, managerRating: n })}>
                            <Star size={18} className={n <= reviewForm.managerRating ? 'text-warning fill-yellow-400' : 'text-muted-foreground'} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewForm.managerComments}
                        onChange={(e) => setReviewForm({ ...reviewForm, managerComments: e.target.value })}
                        placeholder="Comments"
                        rows={2}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-input text-sm"
                      />
                      <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save as Draft'}
                      </button>
                    </form>
                  )}
                  {employeeReviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No reviews for this employee yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {employeeReviews.map((review) => (
                        <div key={review.id} className="p-3 rounded-lg border border-border text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">{review.cycle}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${review.status === 'SUBMITTED' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                              {review.status === 'SUBMITTED' ? 'Submitted' : 'Draft'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={12} className={n <= (review.managerRating || 0) ? 'text-warning fill-yellow-400' : 'text-muted-foreground'} />
                            ))}
                          </div>
                          {review.status !== 'SUBMITTED' && (
                            <button onClick={() => handleSubmitReview(review)} className="text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground mt-1">
                              Submit
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
