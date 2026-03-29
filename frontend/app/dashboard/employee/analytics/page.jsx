'use client';

import Sidebar from '@/components/Sidebar';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function EmployeeAnalytics() {
  const stats = [
    { label: 'Average Check-in Time', value: '8:42 AM' },
    { label: 'Average Check-out Time', value: '5:38 PM' },
    { label: 'Days Present (This Month)', value: '18' },
    { label: 'Days Absent (This Month)', value: '1' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">My Analytics</h1>
          <p className="text-muted-foreground mt-1">View your performance metrics and trends.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground text-sm mb-2">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((item) => (
              <div key={item} className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold mb-6">Analytics Chart {item}</h2>
                <div className="h-64 bg-background rounded-lg flex items-center justify-center border border-dashed border-border">
                  <div className="text-center">
                    <BarChart3 size={48} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Chart visualization</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
