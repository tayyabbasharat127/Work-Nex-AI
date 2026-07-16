const { test, expect } = require('@playwright/test');
const { login, assertHealthyPage, assertCharts, visit } = require('./helpers');

test.beforeEach(async ({ page }) => login(page, 'manager'));

test('manager dashboard and team modules use scoped seeded data', async ({ page }) => {
  await assertHealthyPage(page, 'Manager Dashboard');
  await assertCharts(page, 2);
  await visit(page, '/dashboard/manager/team', 'My Team');
  await expect(page.locator('body')).toContainText(/team member|employee/i);
  await visit(page, '/dashboard/manager/attendance', 'Team Attendance');
  await visit(page, '/dashboard/manager/performance', 'Team Performance');
});

test('manager leave review controls and notifications are available', async ({ page }) => {
  await visit(page, '/dashboard/manager/leaves', 'Team Leaves');
  const hasPending = await page.getByRole('button', { name: /Approve & forward to admin/i }).count();
  if (hasPending) {
    await expect(page.getByRole('button', { name: /Reject request/i }).first()).toBeVisible();
  } else {
    await expect(page.getByText("You're all caught up")).toBeVisible();
  }
  await page.goto('/dashboard/manager');
  await expect(page.getByText('Notifications')).toBeVisible();
});

test('manager can open the authenticated multi-agent widget', async ({ page }) => {
  await page.getByRole('button', { name: 'Open WorkNex agent' }).click();
  await expect(page.getByRole('dialog', { name: 'WorkNex agent chat' })).toBeVisible();
  await expect(page.getByPlaceholder('Message')).toBeVisible();
});
