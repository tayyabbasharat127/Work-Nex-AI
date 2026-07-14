'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingDown, AlertTriangle, Users, RefreshCw, ShieldAlert, UserMinus,
} from 'lucide-react';

const RISK_COLORS = { HIGH: 'var(--destructive)', MEDIUM: 'var(--warning)', LOW: 'var(--success)' };

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function RiskBadge({ label }) {
  const cls = {
    HIGH: 'bg-destructive/20 text-destructive',
    MEDIUM: 'bg-warning/20 text-warning',
    LOW: 'bg-success/20 text-success',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls[label] || 'bg-muted text-muted-foreground'}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(score, 100)}%`, backgroundColor: RISK_COLORS[label] || 'var(--muted-foreground)' }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right">{Math.round(score)}%</span>
    </div>
  );
}

export default function AttritionPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getAttritionAnalytics(month, year);
      setData(res);
    } catch {
      toast.error('Failed to load attrition data');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const riskChartData = data?.summary
    ? ['HIGH', 'MEDIUM', 'LOW'].map((label) => ({ label, count: data.summary[label]?.count || 0 }))
    : [];

  const avgRisk = data?.all?.length
    ? Math.round(data.all.reduce((s, r) => s + r.riskScore, 0) / data.all.length)
    : 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingDown size={28} className="text-destructive" />
              Attrition Risk
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              ML-predicted employee retention risk based on attendance, performance, and leave patterns.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition text-sm"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Month / Year filter */}
          <div className="flex items-center gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:border-primary"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:border-primary"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Risk Level Legend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <div className="w-3 h-3 rounded-full bg-destructive mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-destructive text-sm">HIGH Risk (&gt;60%)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Elevated attrition signals present. Recommend a proactive manager check-in.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
              <div className="w-3 h-3 rounded-full bg-warning mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-warning text-sm">MEDIUM Risk (30–60%)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Early warning signs detected. Monitor attendance, leaves, and performance closely.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl border border-success/30 bg-success/5">
              <div className="w-3 h-3 rounded-full bg-success mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-success text-sm">LOW Risk (&lt;30%)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Employee appears stable. No significant attrition signals detected at this time.</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={32} className="animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.totalAnalyzed === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <UserMinus size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No attrition data for {MONTHS[month - 1]} {year}</p>
              <p className="text-sm mt-1">Run the ETL pipeline first to generate attrition records.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-info" />
                    <p className="text-sm text-muted-foreground">Analyzed</p>
                  </div>
                  <p className="text-3xl font-bold">{data.totalAnalyzed}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-warning" />
                    <p className="text-sm text-muted-foreground">At Risk</p>
                  </div>
                  <p className="text-3xl font-bold text-warning">{data.atRiskCount ?? 0}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={16} className="text-destructive" />
                    <p className="text-sm text-muted-foreground">Critical (HIGH)</p>
                  </div>
                  <p className="text-3xl font-bold text-destructive">{data.summary?.HIGH?.count ?? 0}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={16} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  </div>
                  <p className="text-3xl font-bold">{avgRisk}%</p>
                </div>
              </div>

              {/* Chart + Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk distribution bar chart */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h2 className="font-bold mb-4 text-sm">Risk Distribution</h2>
                  {riskChartData.some((d) => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={riskChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {riskChartData.map((entry) => (
                            <Cell key={entry.label} fill={RISK_COLORS[entry.label] || 'var(--muted-foreground)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      No chart data
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-col gap-1.5 mt-4">
                    {riskChartData.map(({ label, count }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[label] }} />
                          <span className="text-muted-foreground">{label}</span>
                        </div>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* At-risk employee table */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-bold">At-Risk Employees</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Sorted by risk score — highest first</p>
                  </div>

                  {!data.atRiskEmployees?.length ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No at-risk employees this period
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold">Employee</th>
                            <th className="text-left py-3 px-4 font-semibold w-36">Risk Score</th>
                            <th className="text-left py-3 px-4 font-semibold">Level</th>
                            <th className="text-left py-3 px-4 font-semibold">Leave Prob.</th>
                            <th className="text-left py-3 px-4 font-semibold">Key Factors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(data.atRiskEmployees || []).map((emp) => (
                            <tr key={emp.userId} className="hover:bg-muted/30 transition">
                              <td className="py-3 px-4">
                                <p className="font-medium">{emp.name || emp.userId}</p>
                                <p className="text-xs text-muted-foreground">{emp.department || '—'}</p>
                              </td>
                              <td className="py-3 px-4">
                                <ScoreBar score={emp.riskScore} label={emp.riskLabel} />
                              </td>
                              <td className="py-3 px-4">
                                <RiskBadge label={emp.riskLabel} />
                              </td>
                              <td className="py-3 px-4 font-mono text-sm">
                                {emp.willLeaveProb != null
                                  ? `${Math.round(emp.willLeaveProb * 100)}%`
                                  : '—'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {(emp.factors || []).slice(0, 3).map((f) => (
                                    <span key={f} className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Full list (collapsed by default) */}
              {data.all && data.all.length > data.atRiskEmployees?.length && (
                <details className="bg-card border border-border rounded-xl overflow-hidden">
                  <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/30 transition select-none text-sm">
                    All Employees ({data.all.length} records)
                  </summary>
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-2.5 px-4 font-semibold">Employee</th>
                          <th className="text-left py-2.5 px-4 font-semibold">Department</th>
                          <th className="text-left py-2.5 px-4 font-semibold w-36">Risk Score</th>
                          <th className="text-left py-2.5 px-4 font-semibold">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.all.map((emp) => (
                          <tr key={emp.userId} className="hover:bg-muted/20 transition">
                            <td className="py-2.5 px-4 font-medium">{emp.name || emp.userId}</td>
                            <td className="py-2.5 px-4 text-sm text-muted-foreground">{emp.department || '—'}</td>
                            <td className="py-2.5 px-4">
                              <ScoreBar score={emp.riskScore} label={emp.riskLabel} />
                            </td>
                            <td className="py-2.5 px-4">
                              <RiskBadge label={emp.riskLabel} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
