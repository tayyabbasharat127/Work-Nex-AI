const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const OUT  = path.join('c:/Users/TECHXCESS/Desktop/Work-Nex-AI/worknex-backend/docs/user-manual-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const FAKE_ADMIN = JSON.stringify({
  id: 'admin-001', email: 'admin@worknex.com',
  firstName: 'Tayyab', lastName: 'Basharat',
  role: 'ADMIN', employeeId: 'EMP-ADMIN-001',
  organizationId: 'org-001', designation: 'System Administrator',
  isActive: true, twoFAEnabled: false
});
const FAKE_MANAGER = JSON.stringify({
  id: 'mgr-001', email: 'manager1@worknex.com',
  firstName: 'Ali', lastName: 'Khan',
  role: 'MANAGER', employeeId: 'MGR-1000',
  organizationId: 'org-001', designation: 'Department Manager',
  isActive: true, twoFAEnabled: false
});
const FAKE_EMPLOYEE = JSON.stringify({
  id: 'emp-001', email: 'employee1@worknex.com',
  firstName: 'Usman', lastName: 'Sheikh',
  role: 'EMPLOYEE', employeeId: 'EMP-2000',
  organizationId: 'org-001', designation: 'Developer',
  isActive: true, twoFAEnabled: false
});

async function shot(page, name, label) {
  await page.waitForTimeout(1800);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✅  ${label} → ${name}.png`);
}

async function setAuth(page, userJson, token = 'fake-jwt-token-for-demo') {
  await page.evaluate(([u, t]) => {
    localStorage.setItem('user', u);
    localStorage.setItem('accessToken', t);
    localStorage.setItem('refreshToken', 'fake-refresh-token');
  }, [userJson, token]);
}

async function goAndShot(page, route, name, label, userJson) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  if (userJson) await setAuth(page, userJson);
  await page.waitForTimeout(2000);
  await shot(page, name, label);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--window-size=1440,900'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── PUBLIC PAGES ─────────────────────────────────────────────────────────────
  console.log('\n── PUBLIC PAGES ──');
  await goAndShot(page, '/login', '01_login', 'Login Page');
  await goAndShot(page, '/forgot-password', '02_forgot_password', 'Forgot Password Page');
  await goAndShot(page, '/reset-password', '03_reset_password', 'Reset Password Page');
  await goAndShot(page, '/register', '04_register', 'Register / Signup Page');
  await goAndShot(page, '/verify-otp', '05_verify_otp', 'OTP Verification Page');

  // ── ADMIN PAGES ───────────────────────────────────────────────────────────────
  console.log('\n── ADMIN DASHBOARD ──');
  // Inject admin auth then navigate
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await setAuth(page, FAKE_ADMIN);

  const adminPages = [
    ['/dashboard/admin',               '06_admin_dashboard',    'Admin — Main Dashboard'],
    ['/dashboard/admin/users',         '07_admin_users',        'Admin — User Management'],
    ['/dashboard/admin/departments',   '08_admin_departments',  'Admin — Departments'],
    ['/dashboard/admin/roles',         '09_admin_roles',        'Admin — Roles & Permissions'],
    ['/dashboard/admin/attendance',    '10_admin_attendance',   'Admin — Attendance Management'],
    ['/dashboard/admin/leaves',        '11_admin_leaves',       'Admin — Leave Management'],
    ['/dashboard/admin/performance',   '12_admin_performance',  'Admin — Performance Overview'],
    ['/dashboard/admin/analytics',     '13_admin_analytics',    'Admin — Analytics Dashboard'],
    ['/dashboard/admin/reports',       '14_admin_reports',      'Admin — Reports'],
    ['/dashboard/admin/forecast',      '15_admin_forecast',     'Admin — Leave Forecast (ML)'],
    ['/dashboard/admin/attrition',     '16_admin_attrition',    'Admin — Attrition Risk (ML)'],
    ['/dashboard/admin/ai-chat',       '17_admin_ai_chat',      'Admin — AI HR Chatbot'],
    ['/dashboard/admin/etl',           '18_admin_etl',          'Admin — ETL Pipeline'],
    ['/dashboard/admin/notifications', '19_admin_notifications','Admin — Notifications'],
    ['/dashboard/admin/logs',          '20_admin_logs',         'Admin — Audit Logs'],
    ['/dashboard/admin/settings',      '21_admin_settings',     'Admin — Organization Settings'],
    ['/dashboard/admin/powerbi',       '22_admin_powerbi',      'Admin — Power BI Reports'],
  ];

  for (const [route, name, label] of adminPages) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await setAuth(page, FAKE_ADMIN);
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await shot(page, name, label);
  }

  // ── MANAGER PAGES ─────────────────────────────────────────────────────────────
  console.log('\n── MANAGER DASHBOARD ──');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await setAuth(page, FAKE_MANAGER);

  const managerPages = [
    ['/dashboard/manager',             '23_manager_dashboard',  'Manager — Main Dashboard'],
    ['/dashboard/manager/attendance',  '24_manager_attendance', 'Manager — Team Attendance'],
    ['/dashboard/manager/leaves',      '25_manager_leaves',     'Manager — Leave Approvals'],
    ['/dashboard/manager/team',        '26_manager_team',       'Manager — Team Management'],
    ['/dashboard/manager/performance', '27_manager_performance','Manager — Team Performance'],
    ['/dashboard/manager/settings',    '28_manager_settings',   'Manager — Settings'],
  ];

  for (const [route, name, label] of managerPages) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await setAuth(page, FAKE_MANAGER);
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await shot(page, name, label);
  }

  // ── EMPLOYEE PAGES ────────────────────────────────────────────────────────────
  console.log('\n── EMPLOYEE DASHBOARD ──');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await setAuth(page, FAKE_EMPLOYEE);

  const employeePages = [
    ['/dashboard/employee',            '29_employee_dashboard', 'Employee — Main Dashboard'],
    ['/dashboard/employee/attendance', '30_employee_attendance','Employee — My Attendance'],
    ['/dashboard/employee/leaves',     '31_employee_leaves',    'Employee — My Leaves'],
    ['/dashboard/employee/analytics',  '32_employee_analytics', 'Employee — My Analytics'],
    ['/dashboard/employee/performance','33_employee_performance','Employee — My Performance'],
    ['/dashboard/employee/assistant',  '34_employee_assistant', 'Employee — AI Assistant (Chat)'],
    ['/dashboard/employee/forecast',   '35_employee_forecast',  'Employee — Leave Forecast'],
    ['/dashboard/employee/settings',   '36_employee_settings',  'Employee — Settings'],
  ];

  for (const [route, name, label] of employeePages) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await setAuth(page, FAKE_EMPLOYEE);
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await shot(page, name, label);
  }

  await browser.close();
  console.log(`\n✅  All screenshots saved to: ${OUT}`);
})();
