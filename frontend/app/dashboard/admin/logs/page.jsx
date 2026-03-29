'use client';

import Sidebar from '@/components/Sidebar';

export default function AdminLogs() {
  const logs = [
    { id: 1, user: 'Admin User', action: 'User added', timestamp: '2024-03-06 14:30' },
    { id: 2, user: 'Admin User', action: 'Leave approved', timestamp: '2024-03-06 13:15' },
    { id: 3, user: 'Manager User', action: 'Report generated', timestamp: '2024-03-06 11:45' },
    { id: 4, user: 'Admin User', action: 'Settings updated', timestamp: '2024-03-05 16:20' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-muted-foreground mt-1">View system activity and changes.</p>
        </div>

        <div className="p-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left py-3 px-6 font-semibold">User</th>
                  <th className="text-left py-3 px-6 font-semibold">Action</th>
                  <th className="text-left py-3 px-6 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-background transition">
                    <td className="py-4 px-6 font-medium">{log.user}</td>
                    <td className="py-4 px-6">{log.action}</td>
                    <td className="py-4 px-6 text-muted-foreground">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
