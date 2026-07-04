# WorkNexAI — Website Test Issues

> Tested: 2026-06-18 | Branch: `Development_RevampedFrontend` | Tool: Playwright Chromium (headless)
> Backend was offline during test — API call failures are expected and excluded from this report.

---

## Issue Index

| # | Severity | Title | Page(s) |
|---|----------|-------|---------|
| [001](#001) | 🔴 HIGH | Auth guard missing on 27 sub-pages — direct URL bypasses login | All dashboard sub-pages |
| [002](#002) | 🔴 HIGH | No RBAC enforcement — any logged-in user can access any role's pages | All dashboard sub-pages |
| [003](#003) | 🟡 MEDIUM | `bg-linear-to-r` / `bg-linear-to-br` are invalid Tailwind classes — gradient broken | `/register` |
| [004](#004) | 🟡 MEDIUM | Terms of Service and Privacy Policy links are dead placeholders (`#`) | `/register` |
| [005](#005) | 🟡 MEDIUM | Forgot Password page visually inconsistent with Login / Register | `/forgot-password` |
| [006](#006) | 🟡 MEDIUM | React hydration error on admin performance page | `/dashboard/admin/performance` |
| [007](#007) | 🟡 MEDIUM | Sidebar 288px wide on 390px mobile — no hamburger / collapsible menu | All dashboard pages |
| [008](#008) | 🟢 LOW | Login empty-submit shows loading spinner before validation error | `/login` |
| [009](#009) | 🟢 LOW | Register password requirements checklist does not appear when typing | `/register` |
| [010](#010) | 🟢 LOW | Default Next.js 404 page — no branded "not found" screen | Any 404 route |
| [011](#011) | 🟢 LOW | Unhandled API errors logged to console on every dashboard page | All dashboard pages |

---

## Issues

---

### 001

**🔴 HIGH — Auth guard missing on 27 sub-pages**

**Pages affected:** Every dashboard sub-page except the three role home pages:
- `app/dashboard/admin/users/page.jsx`
- `app/dashboard/admin/attendance/page.jsx`
- `app/dashboard/admin/leaves/page.jsx`
- `app/dashboard/admin/departments/page.jsx`
- `app/dashboard/admin/performance/page.jsx`
- `app/dashboard/admin/analytics/page.jsx`
- `app/dashboard/admin/roles/page.jsx`
- `app/dashboard/admin/reports/page.jsx`
- `app/dashboard/admin/notifications/page.jsx`
- `app/dashboard/admin/settings/page.jsx`
- `app/dashboard/admin/ai-chat/page.jsx`
- `app/dashboard/admin/forecast/page.jsx`
- `app/dashboard/admin/etl/page.jsx`
- `app/dashboard/admin/logs/page.jsx`
- `app/dashboard/admin/powerbi/page.jsx`
- `app/dashboard/manager/attendance/page.jsx`
- `app/dashboard/manager/leaves/page.jsx`
- `app/dashboard/manager/performance/page.jsx`
- `app/dashboard/manager/team/page.jsx`
- `app/dashboard/manager/settings/page.jsx`
- `app/dashboard/employee/attendance/page.jsx`
- `app/dashboard/employee/leaves/page.jsx`
- `app/dashboard/employee/performance/page.jsx`
- `app/dashboard/employee/analytics/page.jsx`
- `app/dashboard/employee/forecast/page.jsx`
- `app/dashboard/employee/assistant/page.jsx`
- `app/dashboard/employee/settings/page.jsx`

**Description:**
Only the three role home pages (`admin/page.jsx`, `manager/page.jsx`, `employee/page.jsx`) contain a `localStorage` check that redirects to `/login` when no user is found. All 27 sub-pages skip this check entirely.

A user who is not logged in can directly navigate to any sub-page URL and see the full dashboard shell and any data that loads.

**Steps to reproduce:**
1. Clear browser `localStorage` (DevTools → Application → Clear)
2. Navigate directly to `http://localhost:3000/dashboard/admin/users`
3. Page loads without redirecting to `/login`

**Root cause:**
The auth check is copy-pasted into individual page components instead of being handled once at the layout level.

**Fix:**
Move the auth redirect into `app/dashboard/layout.jsx`, which already wraps every dashboard page:

```js
// app/dashboard/layout.jsx
useEffect(() => {
  const raw = localStorage.getItem('user');
  if (!raw) {
    window.location.href = '/login';
  }
}, []);
```

---

### 002

**🔴 HIGH — No RBAC enforcement on 27 sub-pages**

**Pages affected:** Same 27 sub-pages as [001](#001).
Only three pages use `RoleGate`: `admin/performance`, `employee/assistant`, `employee/forecast`.

**Description:**
The `RoleGate` component exists and works correctly — it checks the user's role and shows an "Access restricted" message when the role is not in the allowed list. However it is only applied on 3 of 30 dashboard pages.

An EMPLOYEE or MANAGER user who knows the URL can navigate directly to admin-only pages such as `/dashboard/admin/users`, `/dashboard/admin/etl`, or `/dashboard/admin/logs` and view full content.

**Steps to reproduce:**
1. Log in as any EMPLOYEE account (e.g. `hina.shah@novapay.pk`)
2. Navigate directly to `http://localhost:3000/dashboard/admin/users`
3. Full admin Users page is visible

**Root cause:**
`RoleGate` was added to a few pages but never applied consistently across the dashboard.

**Fix:**
Wrap every admin sub-page with:
```jsx
<RoleGate allow={['ADMIN', 'SUPER_ADMIN']}>
  ...page content...
</RoleGate>
```
Or enforce role checking in `app/dashboard/layout.jsx` alongside the auth check.

---

### 003

**🟡 MEDIUM — `bg-linear-to-r` / `bg-linear-to-br` are invalid Tailwind classes**

**File:** `app/register/page.jsx`

**Description:**
The register page uses two non-existent Tailwind CSS utility classes:
- Submit button: `bg-linear-to-r from-blue-500 to-violet-600`
- Logo wrapper div: `bg-linear-to-br from-blue-500 to-violet-600`

The correct Tailwind classes are `bg-gradient-to-r` and `bg-gradient-to-br`. Because these classes don't exist, the backgrounds fall back to transparent — the button and logo lose their blue-to-violet gradient.

The Login page uses the correct `bg-gradient-to-r` class on its submit button and renders fine. Only Register is affected.

**Fix:**
In `app/register/page.jsx`, replace:
```
bg-linear-to-r  →  bg-gradient-to-r
bg-linear-to-br →  bg-gradient-to-br
```

---

### 004

**🟡 MEDIUM — Terms of Service and Privacy Policy links are dead placeholders**

**File:** `app/register/page.jsx`

**Description:**
The registration form has a required terms checkbox with two links:

```jsx
<Link href="#">Terms of Service</Link>
<Link href="#">Privacy Policy</Link>
```

Both have `href="#"` — clicking them scrolls to the top of the page instead of showing any content. Users are required to check the box agreeing to policies that they cannot read.

**Fix:**
Create routes `/terms` and `/privacy` with the relevant policy content, or link to externally hosted documents. Update the `href` values accordingly.

---

### 005

**🟡 MEDIUM — Forgot Password page visually inconsistent with Login and Register**

**File:** `app/forgot-password/page.jsx`

**Description:**
The Forgot Password page uses a completely different visual style from the other two auth pages:

| | Login / Register | Forgot Password |
|---|---|---|
| Background | `#070d1a` (hardcoded dark) | `bg-gradient-to-br from-background to-card` (CSS vars) |
| Card | Glassmorphism (`bg-white/[0.03]`, `backdrop-blur-xl`) | Plain (no backdrop blur) |
| Input styling | Dark `bg-white/5 border-white/10` | Light `bg-input border-border` |
| Animations | `framer-motion` stagger | None |

The page looks like it belongs to a different application.

**Fix:**
Refactor `app/forgot-password/page.jsx` to use the same dark background (`#070d1a`), glassmorphism card, and input styling as `app/login/page.jsx`.

---

### 006

**🟡 MEDIUM — React hydration error on `/dashboard/admin/performance`**

**File:** `components/RoleGate.jsx`

**Console error:**
```
Hydration failed because the server rendered HTML didn't match the client.
```

**Description:**
`RoleGate` reads `localStorage` inside `useState` initialiser:

```jsx
const [user] = useState(readUser);  // readUser reads localStorage
```

During SSR `localStorage` is unavailable, so `readUser` returns `null` and the server renders the "Redirecting to login..." fallback. On the client, `localStorage` has a real user so the component renders the protected content. The HTML mismatch causes React to throw a hydration error and re-render from scratch.

**Fix:**
Add a `mounted` guard so the component renders nothing on the server:

```jsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

---

### 007

**🟡 MEDIUM — Sidebar is 288px wide on 390px mobile screen with no collapse option**

**File:** `components/Sidebar.jsx`

**Description:**
On a 390px wide viewport (iPhone 14) the sidebar renders at its full 288px width and stays permanently visible. This leaves only ~102px for the main page content, making the dashboard unusable on mobile.

There is no hamburger button, drawer overlay, or any mechanism to hide the sidebar on small screens.

**Steps to reproduce:**
1. Open any dashboard page in Chrome DevTools with device set to iPhone 14 (390×844)
2. Sidebar takes up ~74% of the screen width and content is unreadable

**Fix:**
Add responsive classes to hide the sidebar by default on small screens and show it via a hamburger toggle:

```jsx
// Sidebar: hidden on mobile, visible on md+
<aside className="hidden md:flex ...">

// Hamburger button: visible on mobile only
<button className="md:hidden ...">
```

---

### 008

**🟢 LOW — Login form shows loading spinner before validating empty fields**

**File:** `app/login/page.jsx`

**Description:**
In `handleSubmit`, `setLoading(true)` is called before the empty-field check:

```js
const handleSubmit = async (e) => {
  setLoading(true);      // ← spinner starts
  setError('');
  try {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;             // ← error shown, but loading never set false
    }
```

This causes two problems:
1. The button shows a spinner for a moment even when fields are empty (purely a local check, no network needed)
2. After returning early the loading state is `true` but `setLoading(false)` is never called (it only runs in `finally`), so the button stays disabled

**Fix:**
Move the empty-field validation above `setLoading(true)`:

```js
if (!formData.email || !formData.password) {
  setError('Please fill in all fields');
  return;
}
setLoading(true);
```

---

### 009

**🟢 LOW — Register password requirements checklist does not appear when typing**

**File:** `app/register/page.jsx`

**Description:**
The code renders a password requirements checklist conditionally:

```jsx
{formData.password && (
  <motion.div ...>
    {passwordRequirements.map(...)}
  </motion.div>
)}
```

This block does not appear when typing in the password field during testing. The checklist is present in the source but is not visible to the user.

**Suspected cause:** May be related to the same invalid Tailwind class issue ([003](#003)) causing layout problems, or a z-index / overflow issue hiding it.

**Steps to reproduce:**
1. Navigate to `/register`
2. Click into the Password field and type any characters
3. No requirements list appears below the field

---

### 010

**🟢 LOW — No custom 404 page — shows default Next.js error page**

**Description:**
Navigating to any non-existent URL (e.g. `/xyz`) shows the plain Next.js built-in 404:

> **404** | This page could not be found.

There is no `app/not-found.jsx` file. The page has no branding, no logo, no link back to the app.

**Fix:**
Create `app/not-found.jsx` with a branded page:

```jsx
import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#070d1a' }}>
      <h1 className="text-white text-6xl font-bold">404</h1>
      <p className="text-white/50 mt-4">Page not found</p>
      <Link href="/login" className="mt-8 text-blue-400 hover:text-blue-300">Back to login</Link>
    </div>
  );
}
```

---

### 011

**🟢 LOW — Unhandled API errors logged as console errors on every dashboard page**

**Description:**
Every dashboard page that makes API calls on mount logs errors like:

```
API Error: TypeError: Failed to fetch
Failed to fetch users: TypeError: Failed to fetch
Failed to load attendance: TypeError: Failed to fetch
```

While the pages do handle errors gracefully in the UI (showing empty states), the raw `TypeError` stack traces are printed to the browser console. This creates noise for developers and can expose internal paths in production builds.

**Fix:**
In `lib/api.js` `apiFetch`, filter what gets logged to `console.error`. Log a clean message rather than the raw error object:

```js
console.error(`[API] ${endpoint} failed: ${error.message}`);
```

---

## Environment

| Item | Value |
|------|-------|
| Frontend | Next.js (Turbopack dev server) |
| URL | `http://localhost:3000` |
| Backend | Offline (expected — all API issues excluded) |
| Browser | Chromium headless via Playwright 1.61.0 |
| Desktop viewport | 1280×900 |
| Mobile viewport | 390×844 (iPhone 14) |
| Test credentials | `zaid.khan@novapay.pk` / `NovaPay@2025` (SUPER_ADMIN) |
| Screenshots | `/tmp/worknex-screenshots/` (58 total) |
