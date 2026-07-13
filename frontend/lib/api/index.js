// Barrel file — re-exports every domain API module under the same names
// `frontend/lib/api.js` used to export directly, so every existing
// `import { xAPI } from '@/lib/api'` across the app keeps working unchanged
// (Next.js/webpack resolves the `@/lib/api` specifier to this directory's
// index.js automatically once the old lib/api.js file is gone).

export {
  WEBHOOK_BASE_URL,
  ICLOCK_SERVER_ADDRESS,
  ICLOCK_SERVER_PORT,
  getAuthToken,
  getPending2FAUserId,
  clearPending2FA,
  clearTokens,
  setTokens,
} from './client';

export { authAPI } from './auth';
export { attendanceAPI } from './attendance';
export { leaveAPI } from './leave';
export { userAPI } from './users';
export { departmentAPI } from './departments';
export { staffCategoryAPI } from './staffCategories';
export { hoursShortfallAPI } from './hoursShortfall';
export { rolesAPI } from './roles';
export { biometricAPI } from './biometric';
export { analyticsAPI } from './analytics';
export { reportsAPI } from './reports';
export { billingAPI } from './billing';
export { aiAPI } from './ai';
export { organizationSettingsAPI } from './organizationSettings';
export { notificationsAPI } from './notifications';
export { performanceAPI, goalsAPI, reviewsAPI } from './performance';
export { alertsAPI } from './alerts';
export { etlAPI } from './etl';
