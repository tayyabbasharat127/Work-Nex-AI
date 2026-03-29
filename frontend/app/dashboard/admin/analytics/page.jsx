'use client';

import Sidebar from '@/components/Sidebar';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalytics() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">View detailed analytics and insights.</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((item) => (
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
