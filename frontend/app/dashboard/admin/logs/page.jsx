'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { analyticsAPI } from '@/lib/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function actorName(log) {
  const name = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim();
  return name || log.user?.email || 'System';
}

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyticsAPI.getAuditLogs({ limit: 50 });
      setLogs(normalizeArray(data));
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadLogs, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Logs</h1>
            <p className="text-muted-foreground mt-1">Organization-scoped audit activity.</p>
          </div>
          <button onClick={loadLogs} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left py-3 px-6 font-semibold">User</th>
                  <th className="text-left py-3 px-6 font-semibold">Action</th>
                  <th className="text-left py-3 px-6 font-semibold">Entity</th>
                  <th className="text-left py-3 px-6 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length ? logs.map((log) => (
                  <tr key={log.id} className="hover:bg-background transition">
                    <td className="py-4 px-6 font-medium">{actorName(log)}</td>
                    <td className="py-4 px-6">{log.action}</td>
                    <td className="py-4 px-6">{log.entity}</td>
                    <td className="py-4 px-6 text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center text-muted-foreground">
                      {loading ? 'Loading audit logs...' : 'No audit logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
