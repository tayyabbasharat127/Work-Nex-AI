'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

function readStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [initialized, setInit]    = useState(false);
  const router = useRouter();

  // ── Session restoration on every page load ─────────────────────────────────
  // 1. Read user profile from localStorage (survives refresh).
  // 2. sessionStorage already has the access token if the tab was never closed.
  // 3. If localStorage has a user but sessionStorage has NO token, the tab was
  //    closed/reopened — use the HttpOnly refresh cookie to get a fresh token.
  // 4. If refresh also fails the session truly expired → send to login.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      await Promise.resolve();
      if (!active) return;

      const storedUser = readStoredUser();

      if (!storedUser) {
        // No stored session at all — nothing to restore.
        setInit(true);
        return;
      }

      const hasToken = Boolean(
        typeof window !== 'undefined' && sessionStorage.getItem('wn_access_token')
      );

      if (hasToken) {
        // Token is already in sessionStorage (same tab refresh) — restore immediately.
        setUser(storedUser);
        setInit(true);
        return;
      }

      // Tab was reopened or token missing — try the refresh cookie.
      authAPI.refreshToken()
        .then(() => {
          if (active) setUser(storedUser);
        })
        .catch(() => {
          // Refresh cookie expired or missing — true session expiry.
          localStorage.removeItem('user');
          if (active) setUser(null);
        })
        .finally(() => {
          if (active) setInit(true);
        });
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const loggedInUser = response.data?.user || response.user;
    if (loggedInUser) {
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    } else if (response.data?.requires2FA) {
      setUser(null);
    }
    return response;
  };

  const superAdminLogin = async (email, password) => {
    const response = await authAPI.superAdminLogin(email, password);
    const loggedInUser = response.data?.user || response.user;
    if (loggedInUser) {
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    }
    return response;
  };

  const signup = async (userData) => authAPI.signup(userData);

  const logout = async () => {
    await authAPI.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading: !initialized,
      initialized,
      login,
      superAdminLogin,
      signup,
      logout,
      updateUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
  return context;
}
