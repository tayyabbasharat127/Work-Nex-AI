const { test, expect } = require('@playwright/test');
const { login, assertHealthyPage, assertCharts, visit } = require('./helpers');

test.beforeEach(async ({ page }) => login(page, 'admin'));

test('admin dashboard and analytics charts render seeded values', async ({ page }) => {
  await assertHealthyPage(page, 'Admin Dashboard');
  await expect(page.getByText('Total Employees').locator('..').getByRole('heading')).toHaveText('20');
  await assertCharts(page, 3);

  await visit(page, '/dashboard/admin/analytics', 'Analytics Dashboard');
  await assertCharts(page, 4);
});

test('admin operational modules load', async ({ page }) => {
  const routes = [
    ['/dashboard/admin/users', 'User Management'],
    ['/dashboard/admin/departments', 'Departments'],
    ['/dashboard/admin/attendance', 'Attendance Management'],
    ['/dashboard/admin/leaves', 'Leave Management'],
    ['/dashboard/admin/performance', 'Performance Analytics'],
    ['/dashboard/admin/reports', 'Reports'],
    ['/dashboard/admin/biometric-integration', 'Biometric Integration'],
    ['/dashboard/admin/logs', 'Audit Logs'],
    ['/dashboard/admin/settings', 'Settings'],
  ];
  for (const [path, heading] of routes) await visit(page, path, heading);
});

test('forecast, attrition, ETL, and Power BI are populated', async ({ page }) => {
  await visit(page, '/dashboard/admin/forecast', 'AI Forecasts & Predictions');
  await assertCharts(page, 1);
  await expect(page.locator('body')).toContainText(/organization-history|gradient boosting|forecast/i);

  await visit(page, '/dashboard/admin/attrition', /Attrition Risk/i);
  await assertCharts(page, 1);
  await expect(page.getByText('Risk Distribution')).toBeVisible();

  await visit(page, '/dashboard/admin/etl', 'ETL Pipeline');
  await expect(page.getByText('Execution History')).toBeVisible();
  await expect(page.locator('body')).toContainText(/SUCCESS|PARTIAL|FAILED/);

  await visit(page, '/dashboard/admin/powerbi', /Power BI/i);
  await expect(page.locator('body')).not.toContainText(/authentication failed|unauthorized/i);
});

test('admin AI and notification deep links work', async ({ page }) => {
  await visit(page, '/dashboard/admin/ai-chat', 'AI HR Assistant');
  await page.getByPlaceholder('Ask about attendance, leaves, performance, forecasts...').fill('What is the annual leave policy?');
  await page.getByRole('button').filter({ has: page.locator('svg') }).last().click();
  await expect(page.locator('body')).toContainText(/annual|leave policy/i, { timeout: 30_000 });

  await visit(page, '/dashboard/admin/notifications', 'Notifications');
  const notification = page.locator('[role="button"]').filter({ hasText: /ETL|attendance|leave|performance/i }).first();
  if (await notification.count()) {
    await notification.click();
    await expect(page).toHaveURL(/\/dashboard\/admin\//);
  }
});
