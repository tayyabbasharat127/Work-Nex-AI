// Single source of truth for reading the locally-cached user object.
// Previously duplicated near-verbatim across RoleGate.jsx, useAuth.js,
// and 3 dashboard root pages (admin/manager/employee) — each with its own
// copy of "parse JSON, clear on corruption" logic.

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}
