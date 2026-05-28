'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI } from '@/lib/api';
import { AlertCircle, BarChart3, RefreshCw, TrendingUp, Users, CalendarX, Clock } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const demoKpis = [
  { label: 'Headcount', value: '128', detail: '+12 this quarter', icon: Users },
  { label: 'Attendance Rate', value: '94.6%', detail: 'Demo average', icon: Clock },
  { label: 'Leave Utilization', value: '61%', detail: 'Across active policies', icon: CalendarX },
  { label: 'Performance Index', value: '78.4', detail: '+4.2 vs last month', icon: TrendingUp },
];

const attendanceTrend = [
  { month: 'Jan', present: 91, late: 8, absent: 3 },
  { month: 'Feb', present: 93, late: 6, absent: 2 },
  { month: 'Mar', present: 89, late: 10, absent: 4 },
  { month: 'Apr', present: 95, late: 5, absent: 2 },
  { month: 'May', present: 96, late: 4, absent: 1 },
  { month: 'Jun', present: 94, late: 6, absent: 2 },
];

const leaveMix = [
  { name: 'Annual', value: 42, color: '#06b6d4' },
  { name: 'Sick', value: 24, color: '#f59e0b' },
  { name: 'Casual', value: 27, color: '#10b981' },
  { name: 'Unpaid', value: 7, color: '#ef4444' },
];

const departmentPerformance = [
  { department: 'HR', score: 82 },
  { department: 'Engineering', score: 79 },
  { department: 'Finance', score: 75 },
  { department: 'Operations', score: 73 },
  { department: 'Support', score: 77 },
];

export default function PowerBIPage() {
  const reportRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const loadConfig = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const data = await analyticsAPI.getPowerBIToken();
      setConfig(data);
      if (!data?.accessToken || !data?.embedUrl || !data?.reportId) {
        setStatus('setup');
        setMessage('Power BI credentials are present, but POWERBI_REPORT_ID or POWERBI_EMBED_URL is missing.');
        return;
      }

      const powerbi = typeof window !== 'undefined' ? window.powerbi : null;
      if (powerbi?.embed && powerbi?.models) {
        powerbi.embed(reportRef.current, {
          type: 'report',
          id: data.reportId,
          embedUrl: data.embedUrl,
          accessToken: data.accessToken,
          tokenType: powerbi.models.TokenType.Embed,
          settings: { panes: { filters: { visible: false }, pageNavigation: { visible: true } } },
        });
        setStatus('embedded');
      } else {
        setStatus('setup');
        setMessage('Install/load powerbi-client in the frontend to render the embedded report. The backend token route is configured.');
      }
    } catch (err) {
      setConfig(null);
      setStatus('setup');
      setMessage(err.message || 'Power BI is not configured on the backend.');
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadConfig, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Power BI</h1>
            <p className="text-muted-foreground mt-1">Embedded analytics from the configured Power BI report.</p>
          </div>
          <button onClick={loadConfig} disabled={status === 'loading'} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Role behavior: admins view organization analytics where the Power BI report supports it. Manager/team and employee/self RLS identities are documented as a future backend enhancement; this page does not fake RLS.
          </div>

          {status === 'setup' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-400 mt-1" size={22} />
                <div>
                  <h2 className="font-semibold text-lg">Power BI setup required</h2>
                  <p className="text-sm text-muted-foreground mt-1">{message}</p>
                  <div className="mt-4 grid gap-2 text-sm">
                    <code>POWERBI_CLIENT_ID</code>
                    <code>POWERBI_CLIENT_SECRET</code>
                    <code>POWERBI_TENANT_ID</code>
                    <code>POWERBI_WORKSPACE_ID</code>
                    <code>POWERBI_REPORT_ID</code>
                    <code>POWERBI_EMBED_URL</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="h-[640px] rounded-xl border border-dashed border-border bg-card flex items-center justify-center text-muted-foreground">
              Loading Power BI configuration...
            </div>
          )}

          <div className={status === 'embedded' ? 'h-[720px] rounded-xl border border-border bg-card overflow-hidden' : 'hidden'}>
            <div ref={reportRef} className="w-full h-full" />
          </div>

          {status !== 'embedded' && status !== 'loading' && (
            <>
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <BarChart3 size={34} />
                  <div>
                    <p className="font-semibold text-foreground">Demo analytics preview</p>
                    <p className="text-sm">This is random sample data for presentation only. No embedded Power BI report is rendered until real configuration is available.</p>
                    {config?.rls?.note && <p className="text-xs mt-2">{config.rls.note}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {demoKpis.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon size={18} />
                        {item.label}
                      </div>
                      <p className="mt-3 text-3xl font-bold">{item.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 rounded-xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-4">Demo Attendance Trend</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#283142" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273244', borderRadius: 8 }} />
                      <Bar dataKey="present" stackId="a" fill="#06b6d4" name="Present %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late %" />
                      <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-4">Demo Leave Mix</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={leaveMix} dataKey="value" nameKey="name" innerRadius={64} outerRadius={104} paddingAngle={3}>
                        {leaveMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #273244', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {leaveMix.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: {entry.value}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Demo Department Performance</h2>
                <div className="space-y-4">
                  {departmentPerformance.map((item) => (
                    <div key={item.department}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{item.department}</span>
                        <span className="font-semibold">{item.score}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
