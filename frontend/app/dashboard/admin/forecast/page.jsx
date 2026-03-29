'use client';

import Sidebar from '@/components/Sidebar';
import { TrendingUp } from 'lucide-react';

export default function AdminForecast() {
  const forecasts = [
    { id: 1, metric: 'Expected Absences (April)', value: '45 days', trend: '+12%' },
    { id: 2, metric: 'Predicted Leave Requests', value: '230 days', trend: '+8%' },
    { id: 3, metric: 'Estimated Overtime Hours', value: '850 hours', trend: '-5%' },
    { id: 4, metric: 'Projected Headcount', value: '2,580 employees', trend: '+2%' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Forecasts</h1>
          <p className="text-muted-foreground mt-1">View predicted HR metrics and trends.</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {forecasts.map((forecast) => (
              <div key={forecast.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                <p className="text-muted-foreground text-sm mb-4">{forecast.metric}</p>
                <h3 className="text-2xl font-bold mb-3">{forecast.value}</h3>
                <div className="flex items-center gap-2 text-success">
                  <TrendingUp size={18} />
                  <span className="text-sm font-semibold">{forecast.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
