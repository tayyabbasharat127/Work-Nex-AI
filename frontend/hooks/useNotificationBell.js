import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsAPI } from '@/lib/api';

const POLL_INTERVAL_MS = 20000;
const MUTE_STORAGE_KEY = 'wnx_notifications_muted';

// Synthesizes a short two-tone chime with the Web Audio API instead of
// shipping an audio file — no asset to bundle/host, no network fetch, and it
// works identically across browsers. A single AudioContext is created lazily
// on first use and reused, since browsers only allow audio after a user
// gesture has unlocked it once per page session.
let sharedAudioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
  return sharedAudioCtx;
}

function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Ascending two-note chime (A5 -> C#6) — the classic "ding-ding" notification sound.
    [880, 1108.73].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  } catch {
    // Audio blocked/unsupported — the visual badge still updates regardless.
  }
}

export function useNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMutedState] = useState(false);

  const prevCountRef = useRef(null); // null until the first successful fetch
  const pollRef = useRef(null);
  // The interval below is set up once on mount, so `refresh` must read
  // `muted` via a ref rather than closing over the state value directly —
  // otherwise a later mute toggle would never be seen by the running poll.
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    try {
      setMutedState(localStorage.getItem(MUTE_STORAGE_KEY) === '1');
    } catch {
      // localStorage unavailable (private mode etc.) — default to unmuted.
    }
    // Warm up the AudioContext on the first user gesture anywhere on the
    // page, so a later poll-triggered chime isn't silently blocked by the
    // browser's autoplay policy.
    const unlock = () => getAudioContext();
    document.addEventListener('click', unlock, { once: true });
    return () => document.removeEventListener('click', unlock);
  }, []);

  const setMuted = useCallback((value) => {
    setMutedState(value);
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Ignore — mute preference just won't persist across reloads.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        notificationsAPI.getUnreadCount(),
        notificationsAPI.getAll({ limit: 8 }),
      ]);
      const count = countRes?.count ?? 0;
      const list = Array.isArray(listRes) ? listRes : (listRes?.notifications || listRes?.data || []);

      if (prevCountRef.current !== null && count > prevCountRef.current && !mutedRef.current) {
        playChime();
      }
      prevCountRef.current = count;

      setUnreadCount(count);
      setNotifications(list);
    } catch {
      // Silent — the bell just keeps showing its last known state until the next poll succeeds.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationsAPI.markAsRead(id);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsAPI.markAllAsRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  return { unreadCount, notifications, loading, muted, setMuted, markAsRead, markAllAsRead, refresh };
}
