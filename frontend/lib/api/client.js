// Shared API client: base URL, token storage, and the core fetch wrapper
// every domain module (auth.js, users.js, ...) builds on top of.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// The backend's own address (not the frontend's window.location.origin) —
// used to display the real webhook URL a biometric device should push to.
export const WEBHOOK_BASE_URL = `${API_BASE_URL}/attendance/tms-webhook`;

// Real ZKTeco/uFace firmware only accepts a bare Server Address + Server
// Port in its "Comm -> Cloud Server Setting" menu (no path field) — it
// always talks to /iclock/cdata, /iclock/getrequest itself. Derived from
// the same backend URL so it stays correct wherever the backend is hosted.
const _backendUrl = (() => {
  try { return new URL(API_BASE_URL.replace(/\/api\/v1\/?$/, '')); } catch { return null; }
})();
export const ICLOCK_SERVER_ADDRESS = _backendUrl?.hostname || 'localhost';
export const ICLOCK_SERVER_PORT = _backendUrl?.port || '5000';

// Restore access token from localStorage so page refreshes don't wipe the session
let inMemoryAccessToken = typeof window !== 'undefined'
  ? localStorage.getItem('accessToken') || null
  : null;

export const getAuthToken = () => {
  return inMemoryAccessToken;
};

// A same-origin, non-httpOnly marker cookie — NOT the real access token,
// just a presence flag so middleware.js (which runs server-side and can't
// see localStorage, nor the backend's cross-origin httpOnly refresh cookie)
// has something to check before letting a request through to /dashboard/*.
// Real authorization still happens via the Bearer token on every API call.
const SESSION_MARKER = 'wn_session';

const setSessionMarker = () => {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_MARKER}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
};

const clearSessionMarker = () => {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_MARKER}=; path=/; max-age=0; SameSite=Lax`;
};

// Existing sessions (from before this marker existed, or a fresh page load
// with a still-valid localStorage token) need the marker set retroactively —
// otherwise middleware.js would bounce an already-logged-in user to /login.
if (inMemoryAccessToken) setSessionMarker();

// Persist both tokens so they survive page refreshes
export const setTokens = (accessToken, refreshToken) => {
  inMemoryAccessToken = accessToken || null;
  if (typeof window !== 'undefined') {
    if (accessToken) { localStorage.setItem('accessToken', accessToken); setSessionMarker(); }
    else localStorage.removeItem('accessToken');
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  }
};

export const setPending2FAUserId = (userId) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pending2FAUserId', userId);
  }
};

export const getPending2FAUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pending2FAUserId');
  }
  return null;
};

export const clearPending2FA = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pending2FAUserId');
  }
};

export const clearTokens = () => {
  inMemoryAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('pending2FAUserId');
    clearSessionMarker();
  }
};

// Base fetch wrapper with auth-header injection, silent 401 refresh+retry,
// and consistent JSON parsing/error throwing — every API module calls this.
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const { skipAuthRefresh = false, ...fetchOptions } = options;

  const config = {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle 401 — attempt silent token refresh then retry
    if (response.status === 401 && !skipAuthRefresh && endpoint !== '/auth/refresh-token') {
      try {
        const storedRefreshToken = typeof window !== 'undefined'
          ? localStorage.getItem('refreshToken')
          : null;
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshJson = await refreshResponse.json();
          const newAccessToken = refreshJson.data?.accessToken || refreshJson.accessToken;
          const newRefreshToken = refreshJson.data?.refreshToken || refreshJson.refreshToken;
          if (!newAccessToken) throw new Error('Token refresh missing access token');
          setTokens(newAccessToken, newRefreshToken);

          config.headers.Authorization = `Bearer ${newAccessToken}`;
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
          const retryData = await retryResponse.json();
          if (!retryResponse.ok) throw new Error(retryData.message || 'Request failed');
          return retryData;
        } else {
          clearTokens();
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
      } catch (error) {
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw error;
      }
    }

    const data = await response.json();

    if (!response.ok) {
      const apiError = new Error(data.message || data.error || 'Something went wrong');
      apiError.status = response.status;
      throw apiError;
    }

    return data;
  } catch (error) {
    // Only log unexpected failures (network/parsing errors). Handled API error
    // responses (4xx/5xx with a status) are already surfaced by callers via
    // toasts or silent retries and shouldn't spam the console / dev overlay.
    if (!error.status) {
      console.error('API Error:', error);
    }
    throw error;
  }
}
