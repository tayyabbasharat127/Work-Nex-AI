'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { notificationsAPI } from '@/lib/api';
import { Bell, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export default function AdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(normalizeArray(data));
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadNotifications, 0);
    return () => clearTimeout(timer);
  }, []);

  const markRead = async (id) => {
    await notificationsAPI.markAsRead(id);
    await loadNotifications();
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) await notificationsAPI.markAsRead(notification.id);
    const target = notification.metadata?.targetRoute || notification.metadata?.deepLink;
    if (typeof target === 'string' && target.startsWith('/dashboard/')) router.push(target);
    else await loadNotifications();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-20 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">Organization-scoped notifications from the backend.</p>
          </div>
          <button onClick={loadNotifications} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition">
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
          <div className="space-y-4 max-w-3xl">
            {notifications.length ? notifications.map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => openNotification(notif)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') openNotification(notif);
                }}
                className="bg-card border border-border rounded-lg p-4 flex items-start gap-4 hover:border-primary transition cursor-pointer"
              >
                <div className={`p-2 rounded-lg ${notif.type === 'ALERT' ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                  {notif.type === 'ALERT' ? (
                    <AlertCircle size={24} className="text-destructive" />
                  ) : (
                    <Bell size={24} className="text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'No timestamp'}
                  </p>
                </div>
                {!notif.isRead && (
                  <button onClick={(event) => { event.stopPropagation(); markRead(notif.id); }} className="text-muted-foreground hover:text-foreground" title="Mark as read">
                    <CheckCircle size={20} />
                  </button>
                )}
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
                {loading ? 'Loading notifications...' : 'No notifications found.'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
