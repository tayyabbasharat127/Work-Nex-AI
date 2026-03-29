'use client';

import Sidebar from '@/components/Sidebar';
import { Database, RefreshCw } from 'lucide-react';

export default function AdminETL() {
  const jobs = [
    { id: 1, name: 'Daily Attendance Sync', status: 'Completed', lastRun: '2024-03-06 00:15 AM' },
    { id: 2, name: 'Weekly Report Generation', status: 'Scheduled', nextRun: '2024-03-07 12:00 PM' },
    { id: 3, name: 'Employee Data Backup', status: 'Running', progress: '45%' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Data Management</h1>
              <p className="text-muted-foreground mt-1">Manage ETL jobs and data synchronization.</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">
              <RefreshCw size={20} />
              Run All Jobs
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Database className="text-primary" size={24} />
                    <h3 className="font-semibold">{job.name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    job.status === 'Completed' ? 'bg-success/20 text-success' :
                    job.status === 'Running' ? 'bg-primary/20 text-primary' :
                    'bg-muted/20 text-muted-foreground'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {job.lastRun ? `Last run: ${job.lastRun}` : `Next run: ${job.nextRun}`}
                </p>
                {job.progress && (
                  <div className="mt-3 w-full bg-background rounded-full h-2">
                    <div className="bg-primary h-full rounded-full" style={{ width: job.progress }}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
