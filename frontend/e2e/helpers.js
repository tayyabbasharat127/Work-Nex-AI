const { expect } = require('@playwright/test');

const password = process.env.DEMO_USER_PASSWORD || 'WorkNexDemo!2026';
const accounts = {
  admin: { email: 'admin@demo.worknex.ai', path: '/dashboard/admin' },
  manager: { email: 'manager@demo.worknex.ai', path: '/dashboard/manager' },
  employee: { email: 'employee@demo.worknex.ai', path: '/dashboard/employee' },
};

async function login(page, role) {
  const account = accounts[role];
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/auth/login') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`${account.path.replaceAll('/', '\\/')}(?:$|\\?)`));
  await expect(page.getByText(account.email, { exact: true })).toBeVisible();
}

async function assertHealthyPage(page, heading) {
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\b(?:NaN|undefined|null)\b/i);
  await expect(page.locator('body')).not.toContainText(/application error|internal server error/i);
}

async function assertCharts(page, minimum = 1) {
  const charts = page.locator('.recharts-responsive-container');
  await expect(charts).toHaveCount(minimum, { timeout: 15_000 });
  for (let index = 0; index < minimum; index += 1) {
    const chart = charts.nth(index);
    await expect(chart).toBeVisible();
    await expect(chart.locator('svg')).toBeVisible();
  }
}

async function visit(page, path, heading) {
  await page.goto(path);
  await assertHealthyPage(page, heading);
}

module.exports = { accounts, login, assertHealthyPage, assertCharts, visit };
