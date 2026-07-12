const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/TECHXCESS/Desktop/Work-Nex-AI';
const OUT = path.join(ROOT, 'worknex-backend/docs/user-manual-screenshots');
const BASE = 'http://localhost:3000';
const API = 'http://localhost:5000/api/v1';

fs.mkdirSync(OUT, { recursive: true });

function spawnService(command, args, cwd, outName) {
  const out = fs.openSync(path.join(ROOT, `${outName}.out.log`), 'a');
  const err = fs.openSync(path.join(ROOT, `${outName}.err.log`), 'a');
  return spawn(command, args, { cwd, stdio: ['ignore', out, err], shell: true, windowsHide: true });
}

async function waitFor(url, label, timeoutMs = 120000) {
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

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.data?.accessToken) throw new Error(`Login failed: ${JSON.stringify(json)}`);
  return {
    user: json.data.user,
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken || '',
  };
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
    children.push(spawnService('node.exe', ['src/app.js'], path.join(ROOT, 'worknex-backend'), 'multi-capture-backend'));
    children.push(spawnService('node.exe', ['server.js'], path.join(ROOT, 'multi-agent-service'), 'multi-capture-agent'));
    children.push(spawnService('npm.cmd', ['run', 'dev'], path.join(ROOT, 'frontend'), 'multi-capture-frontend'));

    await waitFor('http://localhost:5000/health', 'backend');
    await waitFor('http://localhost:8010/health', 'multi-agent');
    await waitFor(BASE, 'frontend');

    const session = await login('bilal.ahmed@novapay.pk', 'NovaPay@2025');
    const browser = await chromium.launch({ headless: true, args: ['--window-size=1440,900'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript((auth) => {
      window.localStorage.setItem('user', JSON.stringify(auth.user));
      window.localStorage.setItem('accessToken', auth.accessToken);
      window.localStorage.setItem('refreshToken', auth.refreshToken);
      window.localStorage.removeItem('worknex-agent-thread-id');
      window.localStorage.removeItem('worknex-agent-messages');
    }, session);

    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/employee`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.getByLabel('Open WorkNex agent').click({ timeout: 10000 });
    await page.locator('#worknex-agent-input').fill('What is my attendance today?');
    await page.getByLabel('Send message').click();
    await page.getByText('Here is your attendance for today').waitFor({ timeout: 60000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUT, '37_multi_agent_widget.png'),
      fullPage: true,
    });
    await browser.close();
    console.log('OK 37_multi_agent_widget.png - Multi-Agent WorkNex Agent');
  } finally {
    for (const child of children.reverse()) stop(child);
  }
})();
