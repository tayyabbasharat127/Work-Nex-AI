'use client';

import Sidebar from '@/components/Sidebar';
import { TrendingUp, Star } from 'lucide-react';

export default function ManagerPerformance() {
  const performance = [
    { id: 1, name: 'John Doe', rating: 4.5, attendance: '95%', productivity: '92%', trend: 'up' },
    { id: 2, name: 'Jane Smith', rating: 4.8, attendance: '98%', productivity: '96%', trend: 'up' },
    { id: 3, name: 'Mike Johnson', rating: 3.9, attendance: '88%', productivity: '85%', trend: 'down' },
    { id: 4, name: 'Sarah Wilson', rating: 4.6, attendance: '96%', productivity: '94%', trend: 'up' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="manager" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Team Performance</h1>
          <p className="text-muted-foreground mt-1">Review team member performance metrics.</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {performance.map((member) => (
              <div key={member.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold">{member.name}</h3>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className={i < Math.floor(member.rating) ? 'fill-warning text-warning' : 'text-muted-foreground'}
                      />
                    ))}
                    <span className="ml-2 font-semibold">{member.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Attendance</p>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-success h-full rounded-full" style={{ width: member.attendance }}></div>
                    </div>
                    <p className="text-sm font-semibold mt-2">{member.attendance}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Productivity</p>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-primary h-full rounded-full" style={{ width: member.productivity }}></div>
                    </div>
                    <p className="text-sm font-semibold mt-2">{member.productivity}</p>
                  </div>
                  <div className="flex items-end">
                    <div className={`flex items-center gap-1 ${member.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                      <TrendingUp size={20} />
                      <span className="font-semibold">{member.trend === 'up' ? 'Up' : 'Down'}</span>
                    </div>
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
