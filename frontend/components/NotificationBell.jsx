'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, CheckCheck, CalendarCheck, CalendarX, AlertTriangle, Info, Clock } from 'lucide-react';
import { useNotificationBell } from '@/hooks/useNotificationBell';

const TYPE_ICON = {
  LEAVE_APPLIED: CalendarCheck,
  LEAVE_APPROVED: CalendarCheck,
  LEAVE_REJECTED: CalendarX,
  ATTENDANCE_ALERT: AlertTriangle,
  REMINDER: Clock,
  SYSTEM: Info,
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return `${Math.max(0, Math.round(diff))}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export default function NotificationBell({ role }) {
  // Only the admin dashboard has a dedicated /notifications page today — for
  // other roles the dropdown itself is the full view, so skip the link
  // rather than point at a page that doesn't exist yet.
  const showViewAllLink = (role || '').toLowerCase() === 'admin';
  const [open, setOpen] = useState(false);
  const { unreadCount, notifications, loading, muted, setMuted, markAsRead, markAllAsRead } = useNotificationBell();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative p-2 rounded-lg hover:bg-muted transition text-foreground"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={15} />
                <span className="font-semibold text-sm">Notifications</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMuted(!muted)}
                  title={muted ? 'Unmute notification sound' : 'Mute notification sound'}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  {muted ? <BellOff size={14} /> : <Bell size={14} />}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] || Info;
                  return (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition ${n.isRead ? '' : 'bg-primary/5'}`}>
                      <Icon size={15} className="text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          title="Mark as read"
                          className="text-muted-foreground hover:text-foreground p-0.5 transition shrink-0"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {showViewAllLink && (
              <Link
                href="/dashboard/admin/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-medium text-primary py-2.5 border-t border-border hover:bg-muted/30 transition"
              >
                View all notifications
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
