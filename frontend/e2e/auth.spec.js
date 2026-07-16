const { test, expect } = require('@playwright/test');
const { accounts, login } = require('./helpers');

for (const role of Object.keys(accounts)) {
  test(`${role} can login, refresh its session, and logout`, async ({ page }) => {
    await login(page, role);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(accounts[role].path));
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
}

test('employee is redirected away from admin routes', async ({ page }) => {
  await login(page, 'employee');
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/dashboard\/employee$/);
});

test('manager is redirected away from employee routes', async ({ page }) => {
  await login(page, 'manager');
  await page.goto('/dashboard/employee');
  await expect(page).toHaveURL(/\/dashboard\/manager$/);
});
