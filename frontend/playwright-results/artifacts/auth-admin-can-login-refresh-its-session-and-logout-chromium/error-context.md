# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> admin can login, refresh its session, and logout
- Location: e2e\auth.spec.js:5:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard\/admin(?:$|\?)/
Received string:  "http://localhost:3000/login"
Timeout: 12000ms

Call log:
  - Expect "toHaveURL" with timeout 12000ms
    27 × unexpected value "http://localhost:3000/login"

```

```yaml
- text: W WorkNexAI
- heading "Welcome Back" [level=1]
- paragraph: Sign in to your account
- text: Email Address
- textbox "Email Address":
  - /placeholder: you@example.com
  - text: admin@demo.worknex.ai
- text: Password
- textbox "Password":
  - /placeholder: ••••••••
  - text: WorkNexDemo!2026
- button
- checkbox "Remember me"
- text: Remember me
- link "Forgot password?":
  - /url: /forgot-password
- button "Sign In"
- paragraph:
  - text: Don't have an account?
  - link "Sign up":
    - /url: /register
- 'button "Color theme: System"'
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | const { expect } = require('@playwright/test');
  2  | 
  3  | const password = process.env.DEMO_USER_PASSWORD || 'WorkNexDemo!2026';
  4  | const accounts = {
  5  |   admin: { email: 'admin@demo.worknex.ai', path: '/dashboard/admin' },
  6  |   manager: { email: 'manager@demo.worknex.ai', path: '/dashboard/manager' },
  7  |   employee: { email: 'employee@demo.worknex.ai', path: '/dashboard/employee' },
  8  | };
  9  | 
  10 | async function login(page, role) {
  11 |   const account = accounts[role];
  12 |   await page.goto('/login');
  13 |   await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  14 |   await page.locator('input[name="email"]').fill(account.email);
  15 |   await page.locator('input[name="password"]').fill(password);
  16 |   const [loginResponse] = await Promise.all([
  17 |     page.waitForResponse((response) => response.url().includes('/auth/login') && response.request().method() === 'POST'),
  18 |     page.getByRole('button', { name: 'Sign In' }).click(),
  19 |   ]);
  20 |   if (process.env.PLAYWRIGHT_AUTH_DEBUG === 'true') {
  21 |     console.log('AUTH DEBUG', {
  22 |       status: loginResponse.status(),
  23 |       payload: await loginResponse.json(),
  24 |       storage: await page.evaluate(() => ({
  25 |         accessToken: Boolean(localStorage.getItem('accessToken')),
  26 |         user: localStorage.getItem('user'),
  27 |       })),
  28 |       cookies: await page.context().cookies(),
  29 |       url: page.url(),
  30 |     });
  31 |   }
> 32 |   await expect(page).toHaveURL(new RegExp(`${account.path.replaceAll('/', '\\/')}(?:$|\\?)`));
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  33 |   await expect(page.getByText(account.email, { exact: true })).toBeVisible();
  34 | }
  35 | 
  36 | async function assertHealthyPage(page, heading) {
  37 |   await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  38 |   await expect(page.locator('body')).not.toContainText(/\b(?:NaN|undefined|null)\b/i);
  39 |   await expect(page.locator('body')).not.toContainText(/application error|internal server error/i);
  40 | }
  41 | 
  42 | async function assertCharts(page, minimum = 1) {
  43 |   const charts = page.locator('.recharts-responsive-container');
  44 |   await expect(charts).toHaveCount(minimum, { timeout: 15_000 });
  45 |   for (let index = 0; index < minimum; index += 1) {
  46 |     const chart = charts.nth(index);
  47 |     await expect(chart).toBeVisible();
  48 |     await expect(chart.locator('svg')).toBeVisible();
  49 |   }
  50 | }
  51 | 
  52 | async function visit(page, path, heading) {
  53 |   await page.goto(path);
  54 |   await assertHealthyPage(page, heading);
  55 | }
  56 | 
  57 | module.exports = { accounts, login, assertHealthyPage, assertCharts, visit };
  58 | 
```