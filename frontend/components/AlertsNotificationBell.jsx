'use client';

import { useState } from 'react';
import { Bell, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAlertsSSE } from '@/hooks/useAlertsSSE';

function SeverityIcon({ severity }) {
  if (severity === 'HIGH') return <AlertTriangle size={13} className="text-red-400 shrink-0" />;
  if (severity === 'MEDIUM') return <AlertCircle size={13} className="text-yellow-400 shrink-0" />;
  return <Info size={13} className="text-blue-400 shrink-0" />;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

export default function AlertsNotificationBell() {
  const [open, setOpen] = useState(false);
  const { alerts, connected, dismiss, clearAll } = useAlertsSSE();
  const unread = alerts.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={connected ? 'Anomaly alerts (live)' : 'Anomaly alerts (connecting…)'}
        className="relative p-2 rounded-lg hover:bg-muted transition text-foreground"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        <span
          className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={15} />
                <span className="font-semibold text-sm">Anomaly Alerts</span>
                {connected && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">LIVE</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
              {alerts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  No active alerts
                  {!connected && (
                    <p className="text-xs mt-1 opacity-60">Connecting to alert stream…</p>
                  )}
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition">
                    <SeverityIcon severity={a.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {a.employeeName || a.userId || 'Unknown employee'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {a.message || a.type || a.anomalyType || 'Attendance anomaly detected'}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {timeAgo(a.detectedAt || a.receivedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(a.id)}
                      className="text-muted-foreground hover:text-foreground p-0.5 transition shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
