'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI } from '@/lib/api';
import {
  AlertCircle, BarChart3, RefreshCw, TrendingUp, Users, CalendarX,
  Clock, Upload, CheckCircle2, XCircle, Info, Database,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, LineChart, Line,
} from 'recharts';

const LEAVE_COLORS = {
  ANNUAL: '#06b6d4',
  SICK: '#f59e0b',
  CASUAL: '#10b981',
  UNPAID: '#ef4444',
};

export default function PowerBIPage() {
  const reportRef = useRef(null);

  // Power BI embed state
  const [embedState, setEmbedState] = useState('idle'); // idle | loading | embedded | setup
  const [embedMsg, setEmbedMsg] = useState('');
  const [embedToken, setEmbedToken] = useState(null);

  // Push dataset state
  const [pushState, setPushState] = useState('idle'); // idle | loading | success | error
  const [pushResult, setPushResult] = useState(null);

  // Real analytics data
  const [kpis, setKpis] = useState(null);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [leaveByType, setLeaveByType] = useState([]);
  const [deptAttendance, setDeptAttendance] = useState([]);
  const [headcount, setHeadcount] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  // Load real analytics data
  const loadAnalyticsData = useCallback(async () => {
    setDataLoading(true);
    setDataError('');
    try {
      const [kpiData, trend, byType, dept, hc] = await Promise.allSettled([
        analyticsAPI.getDashboard(),
        analyticsAPI.getAttendanceTrends({ month, year }),
        analyticsAPI.getLeaveByType({ year }),
        analyticsAPI.getDepartmentAttendance({ month, year }),
        analyticsAPI.getHeadcount(),
      ]);

      if (kpiData.status === 'fulfilled') setKpis(kpiData.value);
      if (trend.status === 'fulfilled') setAttendanceTrend(Array.isArray(trend.value) ? trend.value : []);
      if (byType.status === 'fulfilled') {
        const raw = Array.isArray(byType.value) ? byType.value : [];
        setLeaveByType(raw.map((r) => ({
          name: r.leaveType || r._count,
          value: Number(r._count?.leaveType || r._count || 0),
          color: LEAVE_COLORS[r.leaveType] || '#8884d8',
        })));
      }
      if (dept.status === 'fulfilled') setDeptAttendance(Array.isArray(dept.value) ? dept.value : []);
      if (hc.status === 'fulfilled') setHeadcount(hc.value);
    } catch (err) {
      setDataError('Failed to load analytics data. Ensure backend is running.');
    } finally {
      setDataLoading(false);
    }
  }, [month, year]);

  // Load Power BI embed token
  const loadEmbed = useCallback(async () => {
    setEmbedState('loading');
    setEmbedMsg('');
    try {
      const data = await analyticsAPI.getPowerBIEmbedToken();
      setEmbedToken(data);
      if (!data?.embedToken || !data?.embedUrl || !data?.reportId) {
        setEmbedState('setup');
        setEmbedMsg('Embed token received but POWERBI_REPORT_ID or POWERBI_EMBED_URL is not configured.');
        return;
      }
      const pbi = typeof window !== 'undefined' ? window.powerbi : null;
      if (pbi?.embed && pbi?.models) {
        pbi.embed(reportRef.current, {
          type: 'report',
          id: data.reportId,
          embedUrl: data.embedUrl,
          accessToken: data.embedToken,
          tokenType: pbi.models.TokenType.Embed,
          settings: { panes: { filters: { visible: false }, pageNavigation: { visible: true } } },
        });
        setEmbedState('embedded');
      } else {
        setEmbedState('setup');
        setEmbedMsg(
          data.rlsApplied
            ? `RLS embed token generated for ${data.userEmail} (${data.userRole}). Load powerbi-client JS to render.`
            : 'Embed token ready. Load powerbi-client JS to render the report.',
        );
      }
    } catch (err) {
      setEmbedState('setup');
      setEmbedMsg(err?.message || 'Power BI credentials not configured on the backend.');
    }
  }, []);

  // Push data to Power BI
  const handlePushData = async () => {
    setPushState('loading');
    setPushResult(null);
    try {
      const result = await analyticsAPI.pushDataToPowerBI();
      setPushResult(result);
      setPushState('success');
    } catch (err) {
      setPushResult({ error: err?.message || 'Push failed' });
      setPushState('error');
    }
  };

  useEffect(() => {
    loadAnalyticsData();
    loadEmbed();
  }, [loadAnalyticsData, loadEmbed]);

  const kpiCards = kpis
    ? [
        { label: 'Total Employees', value: kpis.totalEmployees ?? '—', detail: 'Active workforce', icon: Users },
        { label: 'Attendance Rate', value: kpis.attendanceRate != null ? `${kpis.attendanceRate}%` : '—', detail: 'Today', icon: Clock },
        { label: 'Present Today', value: kpis.activeToday ?? '—', detail: `${kpis.absentToday ?? 0} absent`, icon: TrendingUp },
        { label: 'Pending Leaves', value: kpis.pendingLeaves ?? '—', detail: 'Awaiting approval', icon: CalendarX },
      ]
    : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">

        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Power BI Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Live workforce data · embedded reports · real-time push dataset
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAnalyticsData}
              disabled={dataLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition text-sm"
            >
              <RefreshCw size={15} className={dataLoading ? 'animate-spin' : ''} />
              Refresh data
            </button>
            <button
              onClick={loadEmbed}
              disabled={embedState === 'loading'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition text-sm"
            >
              <RefreshCw size={15} className={embedState === 'loading' ? 'animate-spin' : ''} />
              Reload embed
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Power BI Embed Section ── */}
          {embedState === 'setup' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-400 mt-0.5 shrink-0" size={20} />
                <div className="space-y-2">
                  <h2 className="font-semibold">Power BI embed not configured</h2>
                  <p className="text-sm text-muted-foreground">{embedMsg}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs font-mono mt-2">
                    {['POWERBI_CLIENT_ID', 'POWERBI_CLIENT_SECRET', 'POWERBI_TENANT_ID',
                      'POWERBI_WORKSPACE_ID', 'POWERBI_REPORT_ID', 'POWERBI_EMBED_URL', 'POWERBI_DATASET_ID'].map((k) => (
                      <span key={k} className="bg-muted px-2 py-1 rounded">{k}</span>
                    ))}
                  </div>
                  {embedToken?.rlsApplied === false && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info size={12} /> Set POWERBI_DATASET_ID to enable per-user RLS in embed tokens.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {embedState === 'loading' && (
            <div className="h-32 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
              <RefreshCw size={16} className="animate-spin mr-2" /> Fetching Power BI embed token…
            </div>
          )}

          {/* Embedded report */}
          <div className={embedState === 'embedded' ? 'h-[720px] rounded-xl border border-border bg-card overflow-hidden' : 'hidden'}>
            <div ref={reportRef} className="w-full h-full" />
          </div>

          {/* RLS token info when embed is ready but no JS SDK */}
          {embedState === 'setup' && embedToken?.embedToken && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-300">Embed token generated</span>
                {' — '}
                <span className="text-muted-foreground">
                  {embedToken.rlsApplied
                    ? `RLS applied for ${embedToken.userEmail} (${embedToken.userRole}). Expires: ${embedToken.expiration}`
                    : `Token ready. Load powerbi-client to render. Expires: ${embedToken.expiration}`}
                </span>
              </div>
            </div>
          )}

          {/* ── Push Dataset Section ── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-primary" />
                <div>
                  <h2 className="font-semibold">Push Dataset to Power BI</h2>
                  <p className="text-sm text-muted-foreground">
                    Sync live WorkNex data (attendance, leaves, performance, employees) into your Power BI Push Dataset.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePushData}
                disabled={pushState === 'loading'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 text-sm font-medium"
              >
                {pushState === 'loading'
                  ? <><RefreshCw size={15} className="animate-spin" /> Pushing…</>
                  : <><Upload size={15} /> Push Data</>}
              </button>
            </div>

            {pushState === 'success' && pushResult && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 size={15} /> Push successful — {pushResult.totalRowsPushed?.toLocaleString()} rows synced
                </div>
                <div className="text-muted-foreground text-xs">
                  Dataset: <span className="font-mono">{pushResult.datasetName}</span> · {new Date(pushResult.pushedAt).toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pushResult.tables?.map((t) => (
                    <span key={t.table} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                      {t.table}: {t.pushed} rows
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pushState === 'error' && pushResult && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm flex items-start gap-2">
                <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <span className="text-red-300">{pushResult.error}</span>
              </div>
            )}
          </div>

          {/* ── Live KPI Cards (real data) ── */}
          {dataError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm flex items-center gap-2 text-red-300">
              <AlertCircle size={15} /> {dataError}
            </div>
          )}

          {kpiCards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon size={16} /> {item.label}
                    </div>
                    <p className="mt-3 text-3xl font-bold">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          )}

          {dataLoading && !kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* ── Attendance Trend Chart ── */}
          {attendanceTrend.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4">
                Attendance Trend — {new Date().toLocaleString('default', { month: 'long' })} {year}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#283142" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273244', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="PRESENT" stackId="a" fill="#06b6d4" name="Present" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="LATE" stackId="a" fill="#f59e0b" name="Late" />
                  <Bar dataKey="ABSENT" stackId="a" fill="#ef4444" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Leave by Type */}
            {leaveByType.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Leave by Type — {year}</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={leaveByType} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {leaveByType.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273244', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                  {leaveByType.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      {entry.name}: {entry.value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Department Attendance */}
            {deptAttendance.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Department Attendance Rate</h2>
                <div className="space-y-3">
                  {deptAttendance.slice(0, 8).map((item) => (
                    <div key={item.department}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{item.department}</span>
                        <span className="font-semibold tabular-nums">{item.rate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${item.rate}%`,
                            backgroundColor: item.rate >= 90 ? '#10b981' : item.rate >= 75 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Headcount summary */}
          {headcount && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4">Workforce Headcount</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { label: 'Total', value: headcount.total },
                  { label: 'Active', value: headcount.totalActive },
                  { label: 'Inactive', value: headcount.totalInactive },
                  { label: 'Employees', value: headcount.EMPLOYEE_active || 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-bold">{item.value ?? '—'}</p>
                    <p className="text-muted-foreground text-xs mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground flex items-start gap-2">
            <BarChart3 size={14} className="mt-0.5 shrink-0" />
            All charts above show live data from your WorkNex backend.
            Use <strong>Push Data</strong> to stream this data into your Power BI Push Dataset for custom DAX measures and scheduled refresh.
            Set <code>POWERBI_DATASET_ID</code> to enable Row-Level Security in embed tokens.
          </div>

        </div>
      </main>
    </div>
  );
}
