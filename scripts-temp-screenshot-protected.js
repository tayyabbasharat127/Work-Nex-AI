const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const OUT = 'c:/Users/TECHXCESS/Desktop/Work-Nex-AI/worknex-backend/docs/user-manual-screenshots';
fs.mkdirSync(OUT, { recursive: true });

const users = {
  admin: {
    id: 'admin-001',
    email: 'admin@worknex.com',
    firstName: 'Tayyab',
    lastName: 'Basharat',
    role: 'ADMIN',
    employeeId: 'EMP-ADMIN-001',
    organizationId: 'org-001',
    designation: 'System Administrator',
    isActive: true,
    twoFAEnabled: false,
  },
  manager: {
    id: 'mgr-001',
    email: 'manager1@worknex.com',
    firstName: 'Ali',
    lastName: 'Khan',
    role: 'MANAGER',
    employeeId: 'MGR-1000',
    organizationId: 'org-001',
    designation: 'Department Manager',
    isActive: true,
    twoFAEnabled: false,
  },
  employee: {
    id: 'emp-001',
    email: 'employee1@worknex.com',
    firstName: 'Usman',
    lastName: 'Sheikh',
    role: 'EMPLOYEE',
    employeeId: 'EMP-2000',
    organizationId: 'org-001',
    designation: 'Developer',
    isActive: true,
    twoFAEnabled: false,
  },
};

const pages = [
  ['admin', '/dashboard/admin', '06_admin_dashboard', 'Admin - Main Dashboard'],
  ['admin', '/dashboard/admin/users', '07_admin_users', 'Admin - User Management'],
  ['admin', '/dashboard/admin/departments', '08_admin_departments', 'Admin - Departments'],
  ['admin', '/dashboard/admin/roles', '09_admin_roles', 'Admin - Roles & Permissions'],
  ['admin', '/dashboard/admin/attendance', '10_admin_attendance', 'Admin - Attendance Management'],
  ['admin', '/dashboard/admin/leaves', '11_admin_leaves', 'Admin - Leave Management'],
  ['admin', '/dashboard/admin/performance', '12_admin_performance', 'Admin - Performance Overview'],
  ['admin', '/dashboard/admin/analytics', '13_admin_analytics', 'Admin - Analytics Dashboard'],
  ['admin', '/dashboard/admin/reports', '14_admin_reports', 'Admin - Reports'],
  ['admin', '/dashboard/admin/forecast', '15_admin_forecast', 'Admin - Leave Forecast'],
  ['admin', '/dashboard/admin/attrition', '16_admin_attrition', 'Admin - Attrition Risk'],
  ['admin', '/dashboard/admin/ai-chat', '17_admin_ai_chat', 'Admin - AI HR Chatbot'],
  ['admin', '/dashboard/admin/etl', '18_admin_etl', 'Admin - ETL Pipeline'],
  ['admin', '/dashboard/admin/notifications', '19_admin_notifications', 'Admin - Notifications'],
  ['admin', '/dashboard/admin/logs', '20_admin_logs', 'Admin - Audit Logs'],
  ['admin', '/dashboard/admin/settings', '21_admin_settings', 'Admin - Organization Settings'],
  ['admin', '/dashboard/admin/powerbi', '22_admin_powerbi', 'Admin - Power BI Reports'],
  ['manager', '/dashboard/manager', '23_manager_dashboard', 'Manager - Main Dashboard'],
  ['manager', '/dashboard/manager/attendance', '24_manager_attendance', 'Manager - Team Attendance'],
  ['manager', '/dashboard/manager/leaves', '25_manager_leaves', 'Manager - Leave Approvals'],
  ['manager', '/dashboard/manager/team', '26_manager_team', 'Manager - Team Management'],
  ['manager', '/dashboard/manager/performance', '27_manager_performance', 'Manager - Team Performance'],
  ['manager', '/dashboard/manager/settings', '28_manager_settings', 'Manager - Settings'],
];

async function newAuthedPage(browser, role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((user) => {
    window.localStorage.setItem('user', JSON.stringify(user));
    window.localStorage.setItem('accessToken', 'fake-jwt-token-for-demo');
    window.localStorage.setItem('refreshToken', 'fake-refresh-token');
  }, users[role]);
  return context.newPage();
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--window-size=1440,900'] });

  for (const [role, route, name, label] of pages) {
    const page = await newAuthedPage(browser, role);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
      const title = await page.locator('h1').first().textContent({ timeout: 2000 }).catch(() => '');
      console.log(`OK ${name}.png - ${label}${title ? ` (${title.trim()})` : ''}`);
    } catch (error) {
      console.log(`WARN ${name}.png - ${error.message.slice(0, 100)}`);
    } finally {
      await page.context().close();
    }
  }

  await browser.close();
})();
