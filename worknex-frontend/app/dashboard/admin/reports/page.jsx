'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { reportsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Download, FileText, RefreshCw, BarChart3, Users, Calendar } from 'lucide-react';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [reports, setReports] = useState({ attendance: null, leave: null, performance: null, department: null });
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const loadReports = async () => {
    setLoading(true);
    try {
      const [attendance, leave, performance, department] = await Promise.all([
        reportsAPI.attendance({ month, year }),
        reportsAPI.leave({ year }),
        reportsAPI.performance({ month, year }),
        reportsAPI.department({ year }),
      ]);
      setReports({ attendance, leave, performance, department });
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadReports, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const exportCSV = (report) => {
    const rows = report?.rows || [];
    if (!rows.length) {
      toast.error('No data to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.reportType}_${year}_${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'leave', label: 'Leave', icon: FileText },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'department', label: 'Departments', icon: Users },
  ];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentReport = reports[activeTab];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground mt-1">Generate and export organization reports.</p>
            </div>
            <div className="flex items-center gap-3">
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="px-3 py-2 rounded-lg border border-border bg-input text-sm">
                {months.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
              </select>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="px-3 py-2 rounded-lg border border-border bg-input text-sm">
                {[2026, 2025, 2024].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button onClick={loadReports} disabled={loading} className="p-2 rounded-lg border border-border hover:bg-muted transition">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold capitalize">{activeTab} Report</h2>
              <p className="text-sm text-muted-foreground">{currentReport?.summary ? JSON.stringify(currentReport.summary) : 'No summary yet'}</p>
            </div>
            <button onClick={() => exportCSV(currentReport)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <ReportTable loading={loading} report={currentReport} />
        </div>
      </main>
    </div>
  );
}

function ReportTable({ loading, report }) {
  const rows = report?.rows || [];
  if (loading) {
    return <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground">Loading...</div>;
  }
  if (!rows.length) {
    return <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground">No report rows found</div>;
  }
  const headers = Object.keys(rows[0]);
  return (
    <div className="bg-card border border-border rounded-xl overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            {headers.map((header) => <th key={header} className="text-left py-3 px-4 font-semibold">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.slice(0, 100).map((row, index) => (
            <tr key={index} className="hover:bg-muted/30 transition">
              {headers.map((header) => <td key={header} className="py-3 px-4">{String(row[header] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
