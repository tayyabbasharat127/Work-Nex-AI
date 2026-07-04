'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { etlAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Play, RefreshCw, Database, CheckCircle, XCircle, Clock, AlertCircle, Activity } from 'lucide-react';

export default function ETLManagementPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await etlAPI.getLogs();
      setLogs(Array.isArray(response) ? response : []);
    } catch (error) {
      toast.error('Failed to fetch ETL logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRunETL = async () => {
    if (running) return;
    if (!confirm(`Run ETL for ${months[selectedMonth - 1]} ${selectedYear}?\n\nThis will process attendance, leave, and performance data.`)) return;

    try {
      setRunning(true);
      toast.info('ETL pipeline started...');
      const result = await etlAPI.runETL(selectedMonth, selectedYear);
      
      if (result?.success || result?.status === 'SUCCESS') {
        toast.success(`ETL completed! Processed ${result?.totalRecords || 0} records.`);
      } else if (result?.status === 'PARTIAL') {
        toast.warning(`ETL partially completed. Check logs for details.`);
      } else {
        toast.error(`ETL failed: ${result?.error || 'Unknown error'}`);
      }
      
      setTimeout(fetchLogs, 1000);
    } catch (error) {
      toast.error(`ETL failed: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle size={16} className="text-green-400" />;
      case 'FAILED': return <XCircle size={16} className="text-red-400" />;
      case 'PARTIAL': return <AlertCircle size={16} className="text-yellow-400" />;
      default: return <Clock size={16} className="text-blue-400" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/20 text-green-400';
      case 'FAILED': return 'bg-red-500/20 text-red-400';
      case 'PARTIAL': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const formatDuration = (start, end) => {
    if (!end) return 'Running...';
    const s = (new Date(end) - new Date(start)) / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${(s / 60).toFixed(1)}m`;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ETL Pipeline</h1>
            <p className="text-muted-foreground mt-1">Extract, Transform, Load — process workforce data for analytics.</p>
          </div>
          <button onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats from latest log */}
          {logs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Last Run Status</p>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(logs[0]?.status)}
                  <span className="font-bold">{logs[0]?.status || '—'}</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Records Processed</p>
                <p className="text-2xl font-bold mt-2">{logs[0]?.recordsOut || 0}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Last Run</p>
                <p className="text-sm font-semibold mt-2">{formatDate(logs[0]?.startedAt)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Total Runs</p>
                <p className="text-2xl font-bold mt-2">{logs.length}</p>
              </div>
            </div>
          )}

          {/* Manual Trigger */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Database size={20} className="text-blue-400" />
              <h2 className="text-lg font-bold">Manual ETL Execution</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Run the ETL pipeline for a specific month to process attendance, leave, and performance data.
              This generates analytics-ready records used by all dashboards.
            </p>

            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} disabled={running}
                  className="px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary">
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} disabled={running}
                  className="px-4 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={handleRunETL} disabled={running}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 font-medium">
                {running ? (
                  <><RefreshCw size={16} className="animate-spin" /> Running...</>
                ) : (
                  <><Play size={16} /> Run ETL</>
                )}
              </button>
            </div>

            {running && (
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-400">
                  <Activity size={16} className="animate-pulse" />
                  <span className="text-sm">Processing attendance → leave → performance data...</span>
                </div>
              </div>
            )}
          </div>

          {/* ETL Pipeline Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Step 1: Attendance ETL', desc: 'Aggregates daily attendance records, calculates present/absent/late counts and working hours per employee.', color: 'border-blue-500/30 bg-blue-500/5' },
              { title: 'Step 2: Leave ETL', desc: 'Processes approved leave requests, calculates leave days used and updates leave scores per employee.', color: 'border-green-500/30 bg-green-500/5' },
              { title: 'Step 3: Performance ETL', desc: 'Combines attendance and leave data to compute overall performance scores for each employee.', color: 'border-purple-500/30 bg-purple-500/5' },
            ].map((step, i) => (
              <div key={i} className={`rounded-xl p-5 border ${step.color}`}>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Execution Logs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-bold">Execution History</h2>
              <span className="text-sm text-muted-foreground">{logs.length} runs</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw size={32} className="animate-spin mx-auto mb-2" />
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Database size={48} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No ETL runs yet</p>
                <p className="text-sm text-muted-foreground mt-1">Run your first ETL job above to populate analytics data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Source</th>
                      <th className="text-left py-3 px-4 font-semibold">Records In</th>
                      <th className="text-left py-3 px-4 font-semibold">Records Out</th>
                      <th className="text-left py-3 px-4 font-semibold">Duration</th>
                      <th className="text-left py-3 px-4 font-semibold">Started</th>
                      <th className="text-left py-3 px-4 font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(log.status)}`}>
                            {getStatusIcon(log.status)}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded bg-muted text-xs font-mono">{log.source}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">{log.recordsIn || 0}</td>
                        <td className="py-3 px-4 font-mono">{log.recordsOut || 0}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDuration(log.startedAt, log.completedAt)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatDate(log.startedAt)}</td>
                        <td className="py-3 px-4">
                          {log.errorLog ? (
                            <span className="text-xs text-red-400 truncate max-w-xs block" title={log.errorLog}>
                              {log.errorLog.slice(0, 60)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
