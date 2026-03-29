'use client';

import Sidebar from '@/components/Sidebar';
import { Download, FileText } from 'lucide-react';

export default function AdminReports() {
  const reports = [
    { id: 1, name: 'Monthly Attendance Report', date: '2024-03-06', type: 'Attendance' },
    { id: 2, name: 'Leave Summary Report', date: '2024-02-28', type: 'Leave' },
    { id: 3, name: 'Department Performance', date: '2024-02-20', type: 'Performance' },
    { id: 4, name: 'Year-End Review', date: '2024-01-31', type: 'Annual' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Access and manage organization reports.</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/20">
                    <FileText className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{report.name}</h3>
                    <p className="text-sm text-muted-foreground">{report.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {report.type}
                  </span>
                  <button className="p-2 hover:bg-background rounded-lg transition">
                    <Download className="text-primary" size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
