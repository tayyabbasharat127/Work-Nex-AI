'use client';

import Sidebar from '@/components/Sidebar';
import { Star, TrendingUp } from 'lucide-react';

export default function EmployeePerformance() {
  const metrics = [
    { label: 'Overall Rating', value: 4.5, icon: Star },
    { label: 'Attendance Score', value: '95%', icon: TrendingUp },
    { label: 'Productivity Score', value: '92%', icon: TrendingUp },
    { label: 'Punctuality Score', value: '88%', icon: TrendingUp },
  ];

  const reviews = [
    { id: 1, date: 'Feb 2024', manager: 'John Smith', rating: 4.5, comment: 'Great performance and dedication' },
    { id: 2, date: 'Nov 2023', manager: 'John Smith', rating: 4.3, comment: 'Good work on the project' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="employee" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">My Performance</h1>
          <p className="text-muted-foreground mt-1">View your performance reviews and metrics.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, idx) => (
              <div key={idx} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                <p className="text-muted-foreground text-sm mb-3">{metric.label}</p>
                <p className="text-3xl font-bold text-primary">{metric.value}</p>
              </div>
            ))}
          </div>

          {/* Performance Reviews */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-6">Performance Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{review.manager}</p>
                      <p className="text-sm text-muted-foreground">{review.date}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < review.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
