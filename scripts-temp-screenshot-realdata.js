const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/TECHXCESS/Desktop/Work-Nex-AI';
const OUT = path.join(ROOT, 'worknex-backend/docs/user-manual-screenshots');
const BASE = 'http://localhost:3000';
const API = 'http://localhost:5000/api/v1';
const AI = 'http://localhost:8000/health';

const accounts = {
  admin: { email: 'sara.malik@novapay.pk', password: 'NovaPay@2025' },
  manager: { email: 'ali.raza@novapay.pk', password: 'NovaPay@2025' },
  employee: { email: 'bilal.ahmed@novapay.pk', password: 'NovaPay@2025' },
};

const pages = [
  ['public', '/login', '01_login', 'Login Page'],
  ['public', '/forgot-password', '02_forgot_password', 'Forgot Password Page'],
  ['public', '/reset-password', '03_reset_password', 'Reset Password Page'],
  ['public', '/register', '04_register', 'Register / Signup Page'],
  ['public', '/verify-otp', '05_verify_otp', 'OTP Verification Page'],

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

  ['employee', '/dashboard/employee', '29_employee_dashboard', 'Employee - Main Dashboard'],
  ['employee', '/dashboard/employee/attendance', '30_employee_attendance', 'Employee - My Attendance'],
  ['employee', '/dashboard/employee/leaves', '31_employee_leaves', 'Employee - My Leaves'],
  ['employee', '/dashboard/employee/analytics', '32_employee_analytics', 'Employee - My Analytics'],
  ['employee', '/dashboard/employee/performance', '33_employee_performance', 'Employee - My Performance'],
  ['employee', '/dashboard/employee/assistant', '34_employee_assistant', 'Employee - AI Assistant'],
  ['employee', '/dashboard/employee/forecast', '35_employee_forecast', 'Employee - Leave Forecast'],
  ['employee', '/dashboard/employee/settings', '36_employee_settings', 'Employee - Settings'],
];

fs.mkdirSync(OUT, { recursive: true });

function spawnService(command, args, cwd, outName) {
  const out = fs.openSync(path.join(ROOT, outName + '.out.log'), 'a');
  const err = fs.openSync(path.join(ROOT, outName + '.err.log'), 'a');
  const child = spawn(command, args, { cwd, stdio: ['ignore', out, err], shell: true, windowsHide: true });
  return child;
}

async function waitFor(url, label, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

async function login(role) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts[role]),
  });
  const json = await res.json();
  if (!res.ok || !json.data?.accessToken || !json.data?.user) {
    throw new Error(`Login failed for ${role}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return {
    user: json.data.user,
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken || '',
  };
}

async function newPage(browser, session) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (session) {
    await context.addInitScript((auth) => {
      window.localStorage.setItem('user', JSON.stringify(auth.user));
      window.localStorage.setItem('accessToken', auth.accessToken);
      window.localStorage.setItem('refreshToken', auth.refreshToken);
    }, session);
  }
  return context.newPage();
}

async function capture(page, route, name, label) {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2500);

  if (name === '12_admin_performance') {
    const select = page.locator('select').first();
    if (await select.count()) {
      await select.selectOption({ index: 1 }).catch(() => {});
      await page.getByRole('button', { name: /run prediction/i }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.getByText('Predicted Score').waitFor({ timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  if (name === '15_admin_forecast') {
    await page.waitForFunction(() => {
      const body = document.body.innerText.toLowerCase();
      return body.includes('predicted score')
        && body.includes('predicted leaves')
        && !body.includes('loading performance prediction')
        && !body.includes('loading forecast')
        && !body.includes('analyzing...');
    }, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  if (name === '24_manager_attendance') {
    await page.locator('tbody tr').first().waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => {
      const body = document.body.innerText.toLowerCase();
      return !body.includes('no attendance records')
        && !body.includes('loading attendance')
        && document.querySelectorAll('tbody tr').length > 0;
    }, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  const text = (await page.locator('body').innerText({ timeout: 5000 })).toLowerCase();
  const bad = ['failed to fetch', 'error loading', 'unable to load', 'no data available', 'something went wrong'];
  const found = bad.find((term) => text.includes(term));
  if (found) {
    console.log(`WARN ${name}.png - "${found}" appears on ${label}`);
  }

  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  const h1 = await page.locator('h1').first().textContent({ timeout: 1500 }).catch(() => '');
  console.log(`OK ${name}.png - ${label}${h1 ? ` (${h1.trim()})` : ''}`);
}

function stop(child) {
  if (!child?.pid) return;
  try {
    execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
  } catch {}
}

(async () => {
  const children = [];
  try {
    children.push(spawnService('node.exe', ['src/app.js'], path.join(ROOT, 'worknex-backend'), 'capture-backend'));
    children.push(spawnService(path.join(ROOT, 'ai-service/.venv/Scripts/python.exe'), ['run.py'], path.join(ROOT, 'ai-service'), 'capture-ai'));
    children.push(spawnService('npm.cmd', ['run', 'dev'], path.join(ROOT, 'frontend'), 'capture-frontend'));

    await waitFor('http://localhost:5000/health', 'backend');
    await waitFor(AI, 'ai-service');
    await waitFor(BASE, 'frontend', 120000);

    const sessions = {
      admin: await login('admin'),
      manager: await login('manager'),
      employee: await login('employee'),
    };

    const only = process.argv.slice(2);
    const selectedPages = only.length ? pages.filter((p) => only.includes(p[2])) : pages;

    const browser = await chromium.launch({ headless: true, args: ['--window-size=1440,900'] });
    for (const [role, route, name, label] of selectedPages) {
      const page = await newPage(browser, role === 'public' ? null : sessions[role]);
      try {
        await capture(page, route, name, label);
      } catch (error) {
        console.log(`FAIL ${name}.png - ${label}: ${error.message.slice(0, 180)}`);
      } finally {
        await page.context().close();
      }
    }
    await browser.close();
  } finally {
    for (const child of children.reverse()) stop(child);
  }
})();
