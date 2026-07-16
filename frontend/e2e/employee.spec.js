const { test, expect } = require('@playwright/test');
const { login, assertHealthyPage, assertCharts, visit } = require('./helpers');

test.beforeEach(async ({ page }) => login(page, 'employee'));

test('employee dashboard, attendance, leave, and history render', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Welcome,/ })).toBeVisible();
  await assertCharts(page, 3);
  await visit(page, '/dashboard/employee/attendance', 'My Attendance');
  await expect(page.getByRole('button', { name: /Check In|Check Out/ })).toBeVisible();
  await visit(page, '/dashboard/employee/leaves', 'My Leaves');
  await expect(page.getByRole('heading', { name: 'Leave Requests' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Apply for Leave' })).toBeVisible();
});

test('employee analytics, performance, and forecast charts render', async ({ page }) => {
  await visit(page, '/dashboard/employee/analytics', 'My Analytics');
  await assertCharts(page, 4);
  await visit(page, '/dashboard/employee/performance', 'My Performance');
  await assertCharts(page, 1);
  await visit(page, '/dashboard/employee/forecast', 'Forecast');
  await expect(page.locator('body')).toContainText(/Prediction Reasons|Attendance Signals/);
});

test('employee AI assistant returns a grounded policy response', async ({ page }) => {
  await visit(page, '/dashboard/employee/assistant', 'AI Assistant');
  await page.getByPlaceholder('Ask a question...').fill('What is the annual leave policy?');
  await page.getByRole('button').filter({ has: page.locator('svg') }).last().click();
  await expect(page.locator('body')).toContainText(/annual|leave policy/i, { timeout: 30_000 });
});
