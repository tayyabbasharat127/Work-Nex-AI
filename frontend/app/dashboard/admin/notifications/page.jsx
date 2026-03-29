'use client';

import Sidebar from '@/components/Sidebar';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminNotifications() {
  const notifications = [
    { id: 1, title: 'Leave Request Pending', message: 'John Doe has requested 3 days of leave', type: 'info', date: 'Today' },
    { id: 2, title: 'Attendance Alert', message: '5 employees are marked as absent today', type: 'alert', date: 'Today' },
    { id: 3, title: 'System Update', message: 'System maintenance scheduled for tonight', type: 'info', date: 'Yesterday' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">View all your notifications.</p>
        </div>

        <div className="p-6">
          <div className="space-y-4 max-w-2xl">
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-card border border-border rounded-lg p-4 flex items-start gap-4 hover:border-primary transition">
                <div className={`p-2 rounded-lg ${notif.type === 'alert' ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                  {notif.type === 'alert' ? (
                    <AlertCircle size={24} className={notif.type === 'alert' ? 'text-destructive' : 'text-primary'} />
                  ) : (
                    <Bell size={24} className="text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{notif.date}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <CheckCircle size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
