// Capability permissions assignable to a dynamic Role's `permissions` array.
// SUPER_ADMIN bypasses all of these via tier (see auth.middleware.js requirePermission).
// Scope (self/subordinates/org) is governed by Role.tier, not by this list.
const PERMISSIONS = [
  {
    key: 'users:manage',
    label: 'Manage Users & Departments',
    description: 'Create, edit, deactivate users; create/edit/delete departments',
  },
  {
    key: 'leave:manage_policy',
    label: 'Manage Leave Policies',
    description: 'Upload and parse leave policy documents; create/edit leave policies',
  },
  {
    key: 'attendance:manage',
    label: 'Manage Attendance',
    description: 'Configure holidays, sync from TMS, generate absences, manual entries/corrections',
  },
  {
    key: 'settings:manage',
    label: 'Manage Organization Settings',
    description: 'Update organization-wide settings',
  },
  {
    key: 'notifications:broadcast',
    label: 'Broadcast Notifications',
    description: 'Send organization-wide notifications',
  },
];

const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Every org's built-in "Admin" system role gets the full set — reproduces
// the pre-dynamic-roles behavior where ADMIN/SUPER_ADMIN passed every
// authorize() gate these permissions now stand in for.
const DEFAULT_ADMIN_PERMISSIONS = PERMISSION_KEYS;

module.exports = { PERMISSIONS, PERMISSION_KEYS, DEFAULT_ADMIN_PERMISSIONS };
