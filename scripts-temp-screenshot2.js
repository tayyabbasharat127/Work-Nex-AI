const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT  = 'c:/Users/TECHXCESS/Desktop/Work-Nex-AI/worknex-backend/docs/user-manual-screenshots';

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
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`✅  ${label} → ${name}.png`);
}

// Navigate first, then inject auth on the loaded page - avoids context destruction
async function navAndShot(page, route, name, label, userJson) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);
    await page.evaluate((u) => {
      localStorage.setItem('user', u);
      localStorage.setItem('accessToken', 'fake-jwt-token-for-demo');
      localStorage.setItem('refreshToken', 'fake-refresh-token');
    }, userJson);
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, name, label);
  } catch (e) {
    console.log(`⚠️  ${label}: ${e.message.slice(0, 80)}`);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }).catch(() => {});
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--window-size=1440,900'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── MANAGER remaining ─────────────────────────────────────────────────────
  console.log('\n── MANAGER — remaining ──');
  await navAndShot(page, '/dashboard/manager/settings', '28_manager_settings', 'Manager — Settings', FAKE_MANAGER);

  // ── EMPLOYEE PAGES ────────────────────────────────────────────────────────
  console.log('\n── EMPLOYEE DASHBOARD ──');
  const employeePages = [
    ['/dashboard/employee',             '29_employee_dashboard',  'Employee — Main Dashboard'],
    ['/dashboard/employee/attendance',  '30_employee_attendance', 'Employee — My Attendance'],
    ['/dashboard/employee/leaves',      '31_employee_leaves',     'Employee — My Leaves'],
    ['/dashboard/employee/analytics',   '32_employee_analytics',  'Employee — My Analytics'],
    ['/dashboard/employee/performance', '33_employee_performance','Employee — My Performance'],
    ['/dashboard/employee/assistant',   '34_employee_assistant',  'Employee — AI Assistant'],
    ['/dashboard/employee/forecast',    '35_employee_forecast',   'Employee — Leave Forecast'],
    ['/dashboard/employee/settings',    '36_employee_settings',   'Employee — Settings'],
  ];

  for (const [route, name, label] of employeePages) {
    await navAndShot(page, route, name, label, FAKE_EMPLOYEE);
  }

  await browser.close();
  console.log(`\n✅  Done. All screenshots in: ${OUT}`);
})();
