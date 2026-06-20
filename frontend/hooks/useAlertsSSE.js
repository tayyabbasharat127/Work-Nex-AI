'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { alertsAPI } from '@/lib/api';

export function useAlertsSSE() {
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const url = alertsAPI.getStreamURL();
    if (!url.includes('token=')) return; // no auth token yet

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener('anomaly', (e) => {
      try {
        const data = JSON.parse(e.data);
        const alert = {
          id: data.id || `${Date.now()}-${Math.random()}`,
          ...data,
          receivedAt: new Date().toISOString(),
        };
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
      } catch { /* ignore malformed events */ }
    });

    es.addEventListener('alert', (e) => {
      try {
        const data = JSON.parse(e.data);
        const alert = {
          id: data.id || `${Date.now()}-${Math.random()}`,
          ...data,
          receivedAt: new Date().toISOString(),
        };
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      // Reconnect after 15s
      reconnectTimer.current = setTimeout(connect, 15000);
    };
  }, []);

  useEffect(() => {
    // Defer until after mount so auth token is available
    const timer = setTimeout(connect, 1000);
    return () => {
      clearTimeout(timer);
      clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      setConnected(false);
    };
  }, [connect]);

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => setAlerts([]), []);

  return { alerts, connected, dismiss, clearAll };
}
