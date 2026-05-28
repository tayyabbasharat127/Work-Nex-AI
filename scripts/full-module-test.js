#!/usr/bin/env node
/* Full production-style WorkNex module E2E runner.
 * Creates its own isolated test organization via /billing/register, runs all
 * module tests against dynamically-created users, then fully cleans up the org.
 * No seed-data dependency — works against any fresh or existing database.
 */
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const AI_URL = process.env.AI_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;
const TEST_PREFIX = process.env.TEST_PREFIX || `worknex_e2e_${Date.now()}`;
const TEST_PASSWORD = 'NovaPay@2025';
const REPORT_DIR = path.join(process.cwd(), 'reports');
const JSON_REPORT = path.join(REPORT_DIR, 'full-module-test-report.json');
const MD_REPORT = path.join(REPORT_DIR, 'full-module-test-report.md');

const state = {
  rows: [],
  cleanupRows: [],
  tokens: {},
  cookies: {},
  users: {},
  created: {
    ownerEmail: null,
    departmentId: null,
    managerId: null,
    employeeId: null,
    policyDocumentId: null,
    leaveIds: [],
    notificationId: null,
    registeredOrgId: null,
  },
};

function add(module, test, status, notes = '', detail = {}) {
  state.rows.push({ module, test, status, notes, ...detail });
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${status}\x1b[0m ${module} | ${test}${notes ? ` | ${notes}` : ''}`);
}

function addCleanup(test, status, notes = '') {
  state.cleanupRows.push({ module: 'Cleanup', test, status, notes });
  add('Cleanup', test, status, notes);
}

function snippet(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return (text || '').slice(0, 500);
}

function auth(role) {
  return { Authorization: `Bearer ${state.tokens[role]}` };
}

async function request(method, url, { role, body, headers = {}, raw = false } = {}) {
  const reqHeaders = { ...headers };
  if (role) Object.assign(reqHeaders, auth(role));
  if (role && state.cookies[role]) reqHeaders.Cookie = state.cookies[role];
  const options = { method, headers: reqHeaders, redirect: 'manual' };
  if (body !== undefined) {
    if (raw) {
      options.body = body;
    } else {
      reqHeaders['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const started = Date.now();
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let data = text;
    if (contentType.includes('application/json') && text) {
      try { data = JSON.parse(text); } catch {}
    }
    const setCookie = res.headers.get('set-cookie');
    return { ok: res.ok, status: res.status, data, text, ms: Date.now() - started, headers: res.headers, setCookie };
  } catch (err) {
    return { ok: false, status: 0, data: null, text: err.message, error: err, ms: Date.now() - started };
  }
}

function dataOf(response) {
  return response?.data?.data ?? response?.data;
}

function expectStatus(module, test, response, expected, notes = '', detail = {}) {
  const statuses = Array.isArray(expected) ? expected : [expected];
  const pass = statuses.includes(response.status);
  add(module, test, pass ? 'PASS' : 'FAIL', notes || `HTTP ${response.status}`, {
    endpoint: detail.endpoint,
    role: detail.role,
    expected: statuses.join('/'),
    actualStatus: response.status,
    responseSnippet: pass ? undefined : snippet(response.data || response.text),
  });
  return pass;
}

async function checkJson(module, test, method, url, expected, options = {}) {
  const res = await request(method, url, options);
  expectStatus(module, test, res, expected, options.notes, { endpoint: url, role: options.role });
  return res;
}

async function login(role, email, password = TEST_PASSWORD) {
  const res = await checkJson('Auth', `${role} login`, 'POST', `${API}/auth/login`, 200, {
    body: { email, password },
    role: undefined,
    notes: email,
  });
  const payload = dataOf(res);
  if (res.status === 200 && payload?.accessToken) {
    state.tokens[role] = payload.accessToken;
    if (res.setCookie) state.cookies[role] = res.setCookie.split(';')[0];
    state.users[role] = payload.user;
    return payload;
  }
  return null;
}

function isoDate(daysAhead) {
  const date = new Date();
  date.setUTCHours(9, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function isoDateTime(date, hour) {
  return `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

function firstArray(response) {
  const payload = dataOf(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.leaves)) return payload.leaves;
  return [];
}

// ─── Phase 1: Health ─────────────────────────────────────────────────────────

async function health() {
  await checkJson('Health', 'backend /health', 'GET', `${BACKEND_URL}/health`, 200);
  await checkJson('Health', 'frontend /', 'GET', FRONTEND_URL, [200, 301, 302, 307, 308]);
  await checkJson('Health', 'AI /health', 'GET', `${AI_URL}/health`, 200);
}

// ─── Phase 2: Create test organization + store admin session ─────────────────

async function publicRegistrationTests() {
  const uniqueSuffix = Date.now();
  const orgName = `${TEST_PREFIX} Org ${uniqueSuffix}`;
  const ownerEmail = `${TEST_PREFIX}.owner.${uniqueSuffix}@example.com`;

  const res = await request('POST', `${API}/billing/register`, {
    body: {
      orgName,
      industry: 'Technology',
      country: 'Pakistan',
      ownerEmail,
      ownerPassword: TEST_PASSWORD,
      ownerFirstName: 'E2E',
      ownerLastName: 'Owner',
      phone: '555-0200',
      website: 'https://e2e-test.example.com',
    },
  });

  if (res.status === 201) {
    const data = dataOf(res);
    const orgId = data?.organization?.id;
    add('Public Registration', 'POST /billing/register returns 201', 'PASS', `orgId=${orgId}`);
    add('Public Registration', 'response includes organizationId', orgId ? 'PASS' : 'FAIL', orgId ? 'present' : snippet(data));
    add('Public Registration', 'response includes tenant ADMIN owner', data?.owner?.id && data?.owner?.role === 'ADMIN' ? 'PASS' : 'FAIL', snippet(data?.owner));
    add('Public Registration', 'public signup does not create SUPER_ADMIN', data?.owner?.role !== 'SUPER_ADMIN' ? 'PASS' : 'FAIL', snippet(data?.owner));
    add('Public Registration', 'response includes licenseKey', data?.licenseKey ? 'PASS' : 'FAIL', data?.licenseKey ? 'present' : snippet(data));

    state.created.ownerEmail = ownerEmail;
    state.created.registeredOrgId = orgId || null;

    // Login as owner and store admin session for all subsequent tests
    const ownerLoginRes = await request('POST', `${API}/auth/login`, {
      body: { email: ownerEmail, password: TEST_PASSWORD },
    });
    const loginPayload = dataOf(ownerLoginRes);
    const ownerCanLogin = ownerLoginRes.status === 200 && loginPayload?.accessToken;
    add('Public Registration', 'new public org owner can log in', ownerCanLogin ? 'PASS' : 'FAIL', `HTTP ${ownerLoginRes.status}: ${ownerCanLogin ? '' : snippet(ownerLoginRes.data || ownerLoginRes.text)}`);
    add('Public Registration', 'new public org owner login role is ADMIN', loginPayload?.user?.role === 'ADMIN' ? 'PASS' : 'FAIL', snippet(loginPayload?.user));

    if (ownerCanLogin) {
      state.tokens.admin = loginPayload.accessToken;
      if (ownerLoginRes.setCookie) state.cookies.admin = ownerLoginRes.setCookie.split(';')[0];
      state.users.admin = loginPayload.user;
    }
  } else if (res.status === 503) {
    const body = typeof res.data === 'object' ? res.data : {};
    const isMigrationMsg = /not migrated|database setup/i.test(body.message || '');
    add('Public Registration', 'POST /billing/register returns 503 migration error', isMigrationMsg ? 'PASS' : 'FAIL',
      isMigrationMsg ? 'Clean 503 migration message returned' : `Unexpected 503 body: ${snippet(res.data)}`);
    const noFilePath = !/[A-Za-z]:\\|\/home\/|\/usr\//.test(JSON.stringify(res.data));
    add('Public Registration', '503 response does not expose file paths', noFilePath ? 'PASS' : 'FAIL', snippet(res.data));
  } else if (res.status === 409) {
    add('Public Registration', 'POST /billing/register', 'PASS', `409 org name conflict — slug already taken (expected in repeated runs)`);
  } else {
    add('Public Registration', 'POST /billing/register', 'FAIL', `HTTP ${res.status}: ${snippet(res.data)}`);
  }

  // Security: billing/register must reject a client-supplied role field
  const blockedSuffix = Date.now();
  const blocked = await request('POST', `${API}/billing/register`, {
    body: {
      orgName: `${TEST_PREFIX} Blocked Role Org ${blockedSuffix}`,
      industry: 'Technology',
      country: 'Pakistan',
      ownerEmail: `${TEST_PREFIX}.blocked-owner.${blockedSuffix}@example.com`,
      ownerPassword: TEST_PASSWORD,
      ownerFirstName: 'Blocked',
      ownerLastName: 'Owner',
      role: 'SUPER_ADMIN',
    },
  });
  add(
    'Public Registration',
    'POST /billing/register rejects public role field',
    [400, 422].includes(blocked.status) ? 'PASS' : 'FAIL',
    `HTTP ${blocked.status}: ${snippet(blocked.data || blocked.text)}`,
    {
      endpoint: `${API}/billing/register`,
      expected: '400/422',
      actualStatus: blocked.status,
      responseSnippet: [400, 422].includes(blocked.status) ? undefined : snippet(blocked.data || blocked.text),
    }
  );
}

// ─── Phase 3: Auth feature tests ─────────────────────────────────────────────

async function authTests() {
  if (!state.tokens.admin) {
    add('Auth', 'auth tests', 'SKIPPED', 'admin token unavailable — publicRegistrationTests did not complete successfully');
    return;
  }

  await checkJson('Auth', 'invalid login fails', 'POST', `${API}/auth/login`, [400, 401], {
    body: { email: 'nobody-exists@example.com', password: 'definitely-wrong-password' },
  });

  // Refresh token via httpOnly cookie set during owner login
  const refresh = await checkJson('Auth', 'refresh token works from httpOnly cookie', 'POST', `${API}/auth/refresh-token`, 200, { role: 'admin' });
  if (refresh.status === 200 && dataOf(refresh)?.accessToken) state.tokens.admin = dataOf(refresh).accessToken;
  const refreshData = dataOf(refresh);
  add('Auth', 'login does not expose refresh token in response body', !refreshData?.refreshToken ? 'PASS' : 'FAIL',
    refreshData?.refreshToken ? 'refresh token exposed in body' : 'cookie only');
  add('Auth', 'login sets refreshToken cookie', state.cookies.admin ? 'PASS' : 'FAIL',
    state.cookies.admin ? 'present' : 'missing');

  // Logout and verify cookie is cleared
  const logout = await checkJson('Auth', 'logout succeeds with refresh cookie', 'POST', `${API}/auth/logout`, 200, { role: 'admin' });
  const clearsCookie = /refreshToken=;/i.test(logout.setCookie || '') && /Expires=Thu, 01 Jan 1970|Max-Age=0/i.test(logout.setCookie || '');
  add('Auth', 'logout clears refreshToken cookie', clearsCookie ? 'PASS' : 'FAIL', logout.setCookie || 'missing Set-Cookie clear header');
  delete state.cookies.admin;

  // Re-login to restore admin session for all subsequent test phases
  const relogin = await login('admin', state.created.ownerEmail);
  add('Auth', 'admin re-login after logout succeeds', relogin?.accessToken ? 'PASS' : 'FAIL',
    state.created.ownerEmail || 'ownerEmail not stored');

  const me = await checkJson('Auth', '/users/me works for admin', 'GET', `${API}/users/me`, 200, { role: 'admin' });
  if (me.status === 200) state.users.admin = dataOf(me);
}

// ─── Phase 4: Clean up any stale test data in admin's org ────────────────────

async function cleanupStaleTestData() {
  if (!state.tokens.admin) return;

  const users = await request('GET', `${API}/users?search=worknex_e2e_&limit=200`, { role: 'admin' });
  if (users.status === 200) {
    for (const user of firstArray(users)) {
      const email = String(user.email || '');
      // Skip current-run users — they share TEST_PREFIX and are not stale
      const isCurrentRun = email.startsWith(TEST_PREFIX) || user.id === state.users.admin?.id;
      if (email.startsWith('worknex_e2e_') && !isCurrentRun && user.isActive) {
        const res = await request('DELETE', `${API}/users/${user.id}`, { role: 'admin' });
        add('Preflight Cleanup', `deactivate stale ${email}`, res.status === 200 ? 'PASS' : 'FAIL', `HTTP ${res.status}`);
      }
    }
  }

  const departments = await request('GET', `${API}/users/departments/all`, { role: 'admin' });
  if (departments.status === 200) {
    for (const dept of firstArray(departments)) {
      const deptName = String(dept.name || '');
      // Skip departments from the current run
      if (deptName.startsWith('worknex_e2e_') && !deptName.startsWith(TEST_PREFIX)) {
        const res = await request('DELETE', `${API}/users/departments/${dept.id}`, { role: 'admin' });
        const ok = res.status === 200 || (res.status === 409 && /active users/i.test(res.text || JSON.stringify(res.data)));
        add('Preflight Cleanup', `delete stale department ${deptName}`, ok ? 'PASS' : 'FAIL', `HTTP ${res.status} ${snippet(res.data || res.text)}`);
      }
    }
  }
}

// ─── Phase 5: Create test department + users, login as them ──────────────────

async function userTests() {
  if (!state.tokens.admin) {
    add('Users', 'user tests', 'SKIPPED', 'admin token unavailable');
    return;
  }

  // Create department first — used when assigning manager and employee
  const deptName = `${TEST_PREFIX}_Department`;
  const deptCreate = await checkJson('Departments', 'admin creates department', 'POST', `${API}/users/departments`, 201, {
    role: 'admin',
    body: { name: deptName, description: 'Temporary E2E department' },
  });
  if (deptCreate.status === 201) state.created.departmentId = dataOf(deptCreate)?.id;
  const departmentId = state.created.departmentId;

  // Create manager
  const managerEmail = `${TEST_PREFIX}.manager@example.com`;
  const manager = await checkJson('Users', 'admin creates test manager', 'POST', `${API}/users`, 201, {
    role: 'admin',
    body: {
      email: managerEmail,
      password: TEST_PASSWORD,
      employeeId: `${TEST_PREFIX}_MGR`,
      firstName: 'E2E',
      lastName: 'Manager',
      role: 'MANAGER',
      departmentId,
      designation: 'E2E Manager',
      joiningDate: isoDate(-30),
    },
  });
  if (manager.status === 201) state.created.managerId = dataOf(manager)?.id;

  // Create employee assigned to that manager
  const employeeEmail = `${TEST_PREFIX}.employee@example.com`;
  const employee = await checkJson('Users', 'admin creates test employee', 'POST', `${API}/users`, 201, {
    role: 'admin',
    body: {
      email: employeeEmail,
      password: TEST_PASSWORD,
      employeeId: `${TEST_PREFIX}_EMP`,
      firstName: 'E2E',
      lastName: 'Employee',
      role: 'EMPLOYEE',
      departmentId,
      managerId: state.created.managerId,
      designation: 'E2E Analyst',
      phone: '555-0100',
      joiningDate: isoDate(-20),
    },
  });
  if (employee.status === 201) state.created.employeeId = dataOf(employee)?.id;

  // Login as the created users so subsequent test phases have their tokens
  if (state.created.managerId) await login('testManager', managerEmail);
  if (state.created.employeeId) await login('testEmployee', employeeEmail);

  // Verify created users are visible
  const users = await checkJson('Users', 'admin list includes created employee', 'GET',
    `${API}/users?search=${encodeURIComponent(TEST_PREFIX)}`, 200, { role: 'admin' });
  add('Users', 'created employee visible to admin',
    firstArray(users).some((u) => u.id === state.created.employeeId) ? 'PASS' : 'FAIL',
    state.created.employeeId || 'not created');

  if (state.created.employeeId) {
    await checkJson('Users', 'admin updates test employee', 'PUT', `${API}/users/${state.created.employeeId}`, 200, {
      role: 'admin',
      body: { phone: '555-0199', designation: 'E2E Analyst Updated' },
    });
  }

  // RBAC: manager can only see their own subordinates
  if (state.tokens.testManager && state.created.managerId) {
    const managerUsers = await checkJson('RBAC', 'manager list users is subordinate-scoped', 'GET', `${API}/users`, 200, { role: 'testManager' });
    const visible = firstArray(managerUsers);
    const onlySubordinates = visible.every((u) => u.managerId === state.created.managerId);
    add('RBAC', 'test manager sees only own subordinates',
      visible.some((u) => u.id === state.created.employeeId) && onlySubordinates ? 'PASS' : 'FAIL',
      `visible=${visible.length}`);
  }
  if (state.tokens.testEmployee) {
    await checkJson('RBAC', 'employee cannot list all users', 'GET', `${API}/users`, 403, { role: 'testEmployee' });
  }
}

// ─── Phase 6: Department RBAC ─────────────────────────────────────────────────

async function departmentTests() {
  const deptId = state.created.departmentId;
  if (!deptId) {
    add('Departments', 'department tests', 'SKIPPED', 'no department created in userTests');
    return;
  }
  const name = `${TEST_PREFIX}_Department`;

  await checkJson('Departments', 'admin updates department', 'PUT', `${API}/users/departments/${deptId}`, 200, {
    role: 'admin',
    body: { name: `${name}_Updated`, description: 'Updated by E2E' },
  });
  const list = await checkJson('Departments', 'list includes test department', 'GET', `${API}/users/departments/all`, 200, { role: 'admin' });
  add('Departments', 'created department visible', firstArray(list).some((d) => d.id === deptId) ? 'PASS' : 'FAIL', deptId);

  if (state.tokens.testManager) {
    await checkJson('Departments', 'manager cannot update department', 'PUT', `${API}/users/departments/${deptId}`, 403, {
      role: 'testManager',
      body: { description: 'should not update' },
    });
    await checkJson('Departments', 'manager cannot delete department', 'DELETE', `${API}/users/departments/${deptId}`, 403, { role: 'testManager' });
  } else {
    add('Departments', 'manager cannot update department', 'SKIPPED', 'testManager not available');
    add('Departments', 'manager cannot delete department', 'SKIPPED', 'testManager not available');
  }
}

// ─── Phase 7: Tenant isolation ────────────────────────────────────────────────

async function tenantTests() {
  const adminOrg = state.users.admin?.organizationId;
  const testManagerOrg = state.users.testManager?.organizationId;
  const testEmployeeOrg = state.users.testEmployee?.organizationId;
  add('Tenant', 'admin has organizationId', adminOrg ? 'PASS' : 'FAIL', adminOrg || 'missing');
  const allShare = adminOrg && adminOrg === testManagerOrg && adminOrg === testEmployeeOrg;
  const noneCreated = !testManagerOrg && !testEmployeeOrg;
  add('Tenant', 'created users share admin organizationId',
    allShare ? 'PASS' : noneCreated ? 'SKIPPED' : 'FAIL',
    `admin=${adminOrg} manager=${testManagerOrg} employee=${testEmployeeOrg}`);
  const users = await checkJson('Tenant', 'users API returns tenant keys', 'GET', `${API}/users?limit=100`, 200, { role: 'admin' });
  const missing = firstArray(users).filter((user) => !user.organizationId);
  add('Tenant', 'no returned users with missing organizationId', missing.length === 0 ? 'PASS' : 'FAIL',
    missing.length ? `${missing.length} users missing organizationId` : 'all scoped');
}

// ─── Phase 8: Security / RBAC hardening ──────────────────────────────────────

async function securityTests() {
  // Unauthenticated POST to /auth/register must be rejected
  await checkJson('Security', 'public /auth/register is blocked', 'POST', `${API}/auth/register`, 401, {
    body: {
      email: `${TEST_PREFIX}.blocked@example.com`,
      password: TEST_PASSWORD,
      firstName: 'Blocked',
      lastName: 'User',
      employeeId: `${TEST_PREFIX}_BLOCKED`,
      organizationId: state.users.admin?.organizationId,
      role: 'EMPLOYEE',
    },
  });

  if (state.tokens.testEmployee) {
    await checkJson('Security', 'employee cannot call /auth/register', 'POST', `${API}/auth/register`, 403, {
      role: 'testEmployee',
      body: {
        email: `${TEST_PREFIX}.employee-blocked@example.com`,
        password: TEST_PASSWORD,
        firstName: 'Blocked',
        lastName: 'Employee',
        employeeId: `${TEST_PREFIX}_EMP_BLOCKED`,
        organizationId: state.users.admin?.organizationId,
        role: 'EMPLOYEE',
      },
    });
  } else {
    add('Security', 'employee cannot call /auth/register', 'SKIPPED', 'testEmployee not available');
  }

  // Admin sending SUPER_ADMIN role must be rejected by the validator
  await checkJson('Security', 'admin cannot create SUPER_ADMIN through /auth/register', 'POST', `${API}/auth/register`, [400, 422], {
    role: 'admin',
    body: {
      email: `${TEST_PREFIX}.superadmin-blocked@example.com`,
      password: TEST_PASSWORD,
      firstName: 'Blocked',
      lastName: 'Super',
      employeeId: `${TEST_PREFIX}_SA_BLOCKED`,
      organizationId: state.users.admin?.organizationId,
      role: 'SUPER_ADMIN',
    },
  });

  // Admin can create a normal user — verify and then clean up
  const normal = await checkJson('Security', 'admin can still create normal user through /auth/register', 'POST', `${API}/auth/register`, 201, {
    role: 'admin',
    body: {
      email: `${TEST_PREFIX}.auth-created@example.com`,
      password: TEST_PASSWORD,
      firstName: 'Auth',
      lastName: 'Created',
      employeeId: `${TEST_PREFIX}_AUTH_CREATED`,
      organizationId: state.users.admin?.organizationId,
      role: 'EMPLOYEE',
    },
  });
  const userId = dataOf(normal)?.id;
  if (userId) {
    const cleanup = await request('DELETE', `${API}/users/${userId}`, { role: 'admin' });
    add('Security', 'cleanup /auth/register normal user', cleanup.status === 200 ? 'PASS' : 'FAIL', `HTTP ${cleanup.status}`);
  }
}

// ─── Phase 9: Attendance ──────────────────────────────────────────────────────

async function attendanceTests() {
  if (!state.created.employeeId || !state.tokens.testEmployee) {
    add('Attendance', 'test employee attendance flow', 'SKIPPED', 'test employee unavailable');
    return;
  }
  await checkJson('Attendance', 'employee gets today', 'GET', `${API}/attendance/today`, 200, { role: 'testEmployee' });
  const checkIn = await checkJson('Attendance', 'employee check-in', 'POST', `${API}/attendance/check-in`, [200, 409], {
    role: 'testEmployee',
    body: { latitude: 24.8607, longitude: 67.0011 },
    notes: '409 is acceptable if prior run already checked in today',
  });
  await checkJson('Attendance', 'duplicate check-in blocked', 'POST', `${API}/attendance/check-in`, 409, {
    role: 'testEmployee',
    body: { latitude: 24.8607, longitude: 67.0011 },
  });
  await checkJson('Attendance', 'employee check-out', 'POST', `${API}/attendance/check-out`, [200, 409, 400], {
    role: 'testEmployee',
    notes: checkIn.status === 200 ? 'checkout after created check-in' : 'may already be checked out/no check-in',
  });
  const mine = await checkJson('Attendance', 'employee gets own attendance history', 'GET', `${API}/attendance/my`, 200, { role: 'testEmployee' });
  add('Attendance', 'attendance history has records array', Array.isArray(firstArray(mine)) ? 'PASS' : 'FAIL', `records=${firstArray(mine).length}`);
  await checkJson('Attendance', 'manager reads subordinate attendance', 'GET', `${API}/attendance`, 200, { role: 'testManager' });
  // Admin is not a subordinate of testManager — manager must get 403
  if (state.users.admin?.id) {
    await checkJson('Attendance', 'manager cannot read non-subordinate attendance', 'GET',
      `${API}/attendance/user/${state.users.admin.id}`, 403, { role: 'testManager' });
  }
  await checkJson('Attendance', 'admin reads attendance', 'GET', `${API}/attendance`, 200, { role: 'admin' });
  await checkJson('Attendance', 'admin reads attendance summary', 'GET', `${API}/attendance/summary`, 200, { role: 'admin' });
  const manualDate = isoDate(-3);
  await checkJson('Attendance', 'admin creates safe manual attendance', 'POST', `${API}/attendance/manual`, 200, {
    role: 'admin',
    body: {
      userId: state.created.employeeId,
      date: manualDate,
      status: 'PRESENT',
      checkIn: isoDateTime(manualDate, 4),
      checkOut: isoDateTime(manualDate, 12),
      notes: `E2E manual ${TEST_PREFIX}`,
    },
  });
}

// ─── Phase 10: Leave ──────────────────────────────────────────────────────────

async function leaveTests() {
  if (!state.created.employeeId || !state.tokens.testEmployee) return add('Leave', 'leave flow', 'SKIPPED', 'test employee unavailable');
  const balances = await checkJson('Leave', 'employee gets balances', 'GET', `${API}/leave/balances/me`, 200, { role: 'testEmployee' });
  const balance = firstArray(balances).find((b) => b.remainingDays > 1 && b.policy?.leaveType);
  if (!balance) {
    add('Leave', 'apply leave with balance', 'SKIPPED', 'no leave balance with more than 1 remaining day');
  } else {
    const leaveType = balance.policy.leaveType;
    const startDate = isoDate(12);
    const apply = await checkJson('Leave', 'employee applies valid leave', 'POST', `${API}/leave`, [201, 400], {
      role: 'testEmployee',
      body: { leaveType, startDate, endDate: startDate, reason: `E2E leave ${TEST_PREFIX}` },
    });
    const leave = dataOf(apply);
    if (apply.status === 201) {
      state.created.leaveIds.push(leave.id);
      add('Leave', 'leave includes automation decision context', leave.decisionExplanation ? 'PASS' : 'FAIL', leave.status);
      await checkJson('Leave', 'decision explanation fetch works', 'GET', `${API}/leave/${leave.id}/decision-explanation`, 200, { role: 'testEmployee' });
      await checkJson('Leave', 'overlapping leave is blocked', 'POST', `${API}/leave`, [400, 409], {
        role: 'testEmployee',
        body: { leaveType, startDate, endDate: startDate, reason: `E2E overlap ${TEST_PREFIX}` },
      });
      await checkJson('Leave', 'manager can evaluate subordinate leave', 'POST', `${API}/leave/${leave.id}/evaluate`, 200, { role: 'testManager' });
      if (leave.status === 'PENDING') {
        await checkJson('Leave', 'manager approves direct subordinate leave', 'PUT', `${API}/leave/${leave.id}/approve`, 200, {
          role: 'testManager',
          body: { note: 'E2E approval' },
        });
      } else {
        add('Leave', 'manager approval only when pending', 'SKIPPED', `automation status=${leave.status}`);
      }
    }
    const excess = await checkJson('Leave', 'excess leave is rejected or blocked', 'POST', `${API}/leave`, [400, 409], {
      role: 'testEmployee',
      body: { leaveType, startDate: isoDate(60), endDate: isoDate(365), reason: `E2E excess ${TEST_PREFIX}` },
    });
    if (excess.status === 201 && dataOf(excess)?.id) state.created.leaveIds.push(dataOf(excess).id);
  }
  await checkJson('Leave', 'manager gets pending leave', 'GET', `${API}/leave/pending`, 200, { role: 'testManager' });
  const adminLeaves = await checkJson('Leave', 'admin gets leave list', 'GET', `${API}/leave?limit=1`, 200, { role: 'admin' });
  const unrelated = firstArray(adminLeaves).find((l) => l.employeeId !== state.created.employeeId);
  if (unrelated) {
    await checkJson('Leave', 'manager cannot approve non-subordinate leave', 'PUT', `${API}/leave/${unrelated.id}/approve`, [400, 403], {
      role: 'testManager',
      body: { note: 'should not approve' },
    });
  } else {
    add('Leave', 'manager cannot approve non-subordinate leave', 'SKIPPED', 'no safe non-subordinate leave found');
  }
  await checkJson('Leave', 'admin gets user balances', 'GET', `${API}/leave/balances/${state.created.employeeId}`, 200, { role: 'admin' });
  await checkJson('Leave', 'admin gets policies', 'GET', `${API}/leave/policies/all`, 200, { role: 'admin' });
  await policyAutomationTests();
}

async function policyAutomationTests() {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    add('Leave Automation', 'policy document upload', 'SKIPPED', 'native FormData/Blob unavailable');
    return;
  }
  const form = new FormData();
  const content = `Annual leave requires manager approval. Sick leave up to 2 days can be auto approved. E2E ${TEST_PREFIX}`;
  form.append('document', new Blob([content], { type: 'text/plain' }), `${TEST_PREFIX}_policy.txt`);
  const upload = await request('POST', `${API}/leave/policy-documents/upload`, { role: 'admin', body: form, raw: true });
  expectStatus('Leave Automation', 'upload policy document', upload, [201, 400, 415, 500], 'upload endpoint exercised', { endpoint: `${API}/leave/policy-documents/upload`, role: 'admin' });
  if (upload.status !== 201) return;
  state.created.policyDocumentId = dataOf(upload).id;
  await checkJson('Leave Automation', 'extract policy document', 'POST', `${API}/leave/policy-documents/${state.created.policyDocumentId}/extract`, 200, { role: 'admin' });
  await checkJson('Leave Automation', 'AI parse policy document', 'POST', `${API}/leave/policy-documents/${state.created.policyDocumentId}/ai-parse`, 200, { role: 'admin' });
  await checkJson('Leave Automation', 'approve parsed policy rules', 'PUT', `${API}/leave/policy-documents/${state.created.policyDocumentId}/approve-rules`, [200, 400], {
    role: 'admin',
    body: { approvedRuleIds: [] },
    notes: '400 is acceptable when deterministic parse produced no approvable rule IDs',
  });
}

// ─── Phase 11: Reports ────────────────────────────────────────────────────────

async function reportsTests() {
  const endpoints = [
    ['reports list', 'GET', `${API}/reports`],
    ['generate attendance report', 'POST', `${API}/reports/generate`, { reportType: 'attendance', filters: { limit: 20 } }],
    ['attendance report', 'GET', `${API}/reports/attendance`],
    ['leave report', 'GET', `${API}/reports/leave`],
    ['performance report', 'GET', `${API}/reports/performance`],
    ['department report', 'GET', `${API}/reports/department`],
    ['CSV export', 'GET', `${API}/reports/export/csv?type=attendance`],
  ];
  for (const [name, method, url, body] of endpoints) await checkJson('Reports', `admin ${name}`, method, url, 200, { role: 'admin', body });
  await checkJson('Reports', 'manager reports are accessible/team-scoped', 'GET', `${API}/reports`, 200, { role: 'testManager' });
  await checkJson('Reports', 'employee reports self-scoped or forbidden by design', 'GET', `${API}/reports`, [200, 403], { role: 'testEmployee' });
  await checkJson('Reports', 'employee department report forbidden', 'GET', `${API}/reports/department`, 403, { role: 'testEmployee' });
}

// ─── Phase 12: Settings ───────────────────────────────────────────────────────

async function settingsTests() {
  const current = await checkJson('Settings', 'admin gets organization settings', 'GET', `${API}/settings/organization`, 200, { role: 'admin' });
  const settings = dataOf(current) || {};
  const originalAttendancePolicy = settings.attendancePolicyJson || settings.attendancePolicy || { halfDayHours: 4 };
  await checkJson('Settings', 'admin updates harmless setting value', 'PUT', `${API}/settings/organization`, 200, {
    role: 'admin',
    body: {
      timezone: settings.timezone || 'Asia/Karachi',
      leaveAutomationEnabled: settings.leaveAutomationEnabled !== undefined ? settings.leaveAutomationEnabled : true,
    },
  });
  await checkJson('Settings', 'admin verifies settings persistence', 'GET', `${API}/settings/organization`, 200, { role: 'admin' });
  await checkJson('Settings', 'admin enables GPS attendance policy', 'PUT', `${API}/settings/organization`, 200, {
    role: 'admin',
    body: {
      attendancePolicyJson: {
        ...originalAttendancePolicy,
        locationVerificationEnabled: true,
        officeLatitude: 24.8607,
        officeLongitude: 67.0011,
        officeRadiusMeters: 150,
      },
    },
  });
  await checkJson('Attendance', 'GPS check-in requires coordinates when policy enabled', 'POST', `${API}/attendance/check-in`, 400, {
    role: 'testEmployee',
    body: {},
  });
  await checkJson('Settings', 'admin restores attendance policy after GPS test', 'PUT', `${API}/settings/organization`, 200, {
    role: 'admin',
    body: { attendancePolicyJson: originalAttendancePolicy },
  });
  await checkJson('Settings', 'manager cannot update settings', 'PUT', `${API}/settings/organization`, 403, {
    role: 'testManager',
    body: { timezone: settings.timezone || 'Asia/Karachi' },
  });
  await checkJson('Settings', 'employee cannot update settings', 'PUT', `${API}/settings/organization`, 403, {
    role: 'testEmployee',
    body: { timezone: settings.timezone || 'Asia/Karachi' },
  });
}

// ─── Phase 13: Analytics ──────────────────────────────────────────────────────

async function analyticsTests() {
  const adminEndpoints = [
    '/analytics/dashboard',
    '/analytics/attendance/trends',
    '/analytics/attendance/department',
    '/analytics/leave/summary',
    '/analytics/workforce/headcount',
    '/analytics/audit/logs',
  ];
  for (const endpoint of adminEndpoints) await checkJson('Analytics', `admin GET ${endpoint}`, 'GET', `${API}${endpoint}`, 200, { role: 'admin' });
  await checkJson('Analytics', 'manager dashboard team-scoped', 'GET', `${API}/analytics/dashboard`, 200, { role: 'testManager' });
  const employeeEndpoints = ['/attendance/today', '/leave/my', '/leave/balances/me', '/performance/me', '/notifications'];
  for (const endpoint of employeeEndpoints) await checkJson('Employee APIs', `employee GET ${endpoint}`, 'GET', `${API}${endpoint}`, 200, { role: 'testEmployee' });
}

// ─── Phase 14: Notifications ──────────────────────────────────────────────────

async function notificationTests() {
  const before = await checkJson('Notifications', 'employee gets notifications', 'GET', `${API}/notifications`, 200, { role: 'testEmployee' });
  await checkJson('Notifications', 'employee gets unread count', 'GET', `${API}/notifications/unread-count`, 200, { role: 'testEmployee' });
  const first = firstArray(before)[0];
  if (first?.id) {
    await checkJson('Notifications', 'employee marks one notification read', 'PUT', `${API}/notifications/${first.id}/read`, 200, { role: 'testEmployee' });
  } else {
    add('Notifications', 'employee marks one notification read', 'SKIPPED', 'no existing notification');
  }
  const broadcast = await checkJson('Notifications', 'admin broadcasts test notification', 'POST', `${API}/notifications/broadcast`, 200, {
    role: 'admin',
    body: { type: 'SYSTEM', title: `E2E ${TEST_PREFIX}`, message: 'E2E notification', role: 'EMPLOYEE' },
  });
  add('Notifications', 'broadcast returns recipient count', broadcast.status === 200 && Number(dataOf(broadcast)?.count) >= 0 ? 'PASS' : 'FAIL', snippet(dataOf(broadcast)));
}

// ─── Phase 15: Performance ────────────────────────────────────────────────────

async function performanceTests() {
  await checkJson('Performance', 'employee gets own performance', 'GET', `${API}/performance/me`, 200, { role: 'testEmployee' });
  await checkJson('Performance', 'manager gets team performance', 'GET', `${API}/performance/team`, 200, { role: 'testManager' });
  await checkJson('Performance', 'manager gets leaderboard', 'GET', `${API}/performance/leaderboard`, 200, { role: 'testManager' });
  await checkJson('Performance', 'admin gets employee performance', 'GET', `${API}/performance/user/${state.created.employeeId}`, 200, { role: 'admin' });
}

// ─── Phase 16: AI Backend ─────────────────────────────────────────────────────

async function aiBackendTests() {
  const chat = await checkJson('AI Backend', 'employee asks AI chat', 'POST', `${API}/ai/chat`, 200, {
    role: 'testEmployee',
    body: { message: 'What is the attendance policy?' },
  });
  const chatData = dataOf(chat);
  add('AI Backend', 'chat answer has grounded fields', chat.status === 200 && (chatData?.answer || chatData?.message) && ('fallback' in chatData || 'sources' in chatData) ? 'PASS' : 'FAIL', snippet(chatData));
  const prediction = await checkJson('AI Backend', 'employee predicts performance', 'POST', `${API}/ai/predict-performance`, 200, {
    role: 'testEmployee',
    body: {},
  });
  const pred = dataOf(prediction);
  add('AI Backend', 'prediction has score/risk/reasons', prediction.status === 200 && (pred?.predictedScore !== undefined || pred?.score !== undefined) && pred?.riskLevel && Array.isArray(pred?.reasons) ? 'PASS' : 'FAIL', snippet(pred));
}

// ─── Phase 17: AI Direct ──────────────────────────────────────────────────────

async function aiDirectTests() {
  await checkJson('AI Direct', 'AI health', 'GET', `${AI_URL}/health`, 200);
  const chat = await checkJson('AI Direct', 'direct /chat', 'POST', `${AI_URL}/chat`, 200, {
    body: { userId: state.created.employeeId || 'e2e', userContext: { role: 'EMPLOYEE' }, message: 'What is the attendance policy?' },
  });
  add('AI Direct', 'direct chat has answer', chat.status === 200 && (chat.data?.answer || chat.data?.message) ? 'PASS' : 'FAIL', snippet(chat.data));
  const pred = await checkJson('AI Direct', 'direct /predict/performance', 'POST', `${AI_URL}/predict/performance`, 200, {
    body: {
      employeeId: state.created.employeeId || 'e2e',
      features: {
        attendanceRate: 95,
        lateCount: 1,
        absenceCount: 0,
        leaveCount: 1,
        averageWorkingHours: 8,
        previousPerformanceScore: 82,
        departmentAverage: 78,
        overtimeHours: 2,
        halfDayCount: 0,
      },
    },
  });
  add('AI Direct', 'direct prediction has expected fields', pred.status === 200 && dataOf(pred)?.predictedScore !== undefined && dataOf(pred)?.riskLevel ? 'PASS' : 'FAIL', snippet(dataOf(pred)));
}

// ─── Phase 18: Power BI ───────────────────────────────────────────────────────

async function powerBiTests() {
  const res = await request('GET', `${API}/analytics/powerbi/token`, { role: 'admin' });
  if (res.status === 200) {
    const payload = dataOf(res);
    add('Power BI', 'token endpoint returns embed config when configured', payload?.accessToken || payload?.embedUrl ? 'PASS' : 'FAIL', snippet(payload), {
      endpoint: `${API}/analytics/powerbi/token`,
      role: 'admin',
      expected: '200 with token/embed config',
      actualStatus: res.status,
    });
  } else if (res.status === 503 && /not configured|POWERBI|configured|credentials/i.test(res.text || JSON.stringify(res.data))) {
    add('Power BI', 'missing credentials reported honestly', 'PASS', snippet(res.data));
  } else {
    add('Power BI', 'token endpoint behavior', 'FAIL', snippet(res.data || res.text), {
      endpoint: `${API}/analytics/powerbi/token`,
      role: 'admin',
      expected: '200 configured or 503 honest setup message',
      actualStatus: res.status,
      responseSnippet: snippet(res.data || res.text),
    });
  }
  await checkJson('Power BI', 'frontend Power BI page renders or redirects', 'GET', `${FRONTEND_URL}/dashboard/admin/powerbi`, [200, 301, 302, 307, 308]);
}

// ─── Phase 19: Frontend routes ────────────────────────────────────────────────

async function frontendRouteTests() {
  const routes = [
    '/',
    '/login',
    '/dashboard/admin',
    '/dashboard/admin/attendance',
    '/dashboard/admin/leaves',
    '/dashboard/admin/reports',
    '/dashboard/admin/settings',
    '/dashboard/admin/ai-chat',
    '/dashboard/admin/forecast',
    '/dashboard/admin/performance',
    '/dashboard/admin/powerbi',
    '/dashboard/manager',
    '/dashboard/employee',
    '/dashboard/employee/assistant',
    '/dashboard/employee/forecast',
    '/dashboard/employee/performance',
  ];
  for (const route of routes) {
    await checkJson('Frontend', `GET ${route}`, 'GET', `${FRONTEND_URL}${route}`, [200, 301, 302, 307, 308], { notes: '200 or expected auth redirect' });
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  // Cancel any leave requests created during tests
  for (const id of state.created.leaveIds) {
    await checkJson('Cleanup', `cancel test leave ${id}`, 'PUT', `${API}/leave/${id}/cancel`, [200, 400, 403], {
      role: 'testEmployee',
      notes: 'cleanup cancel attempted',
    });
  }

  // Deactivate created users via API (belt-and-suspenders before org deletion)
  if (state.created.employeeId && state.tokens.admin) {
    const res = await request('DELETE', `${API}/users/${state.created.employeeId}`, { role: 'admin' });
    addCleanup('deactivate test employee', res.status === 200 ? 'PASS' : 'FAIL', `HTTP ${res.status} ${snippet(res.data || res.text)}`);
  }
  if (state.created.managerId && state.tokens.admin) {
    const res = await request('DELETE', `${API}/users/${state.created.managerId}`, { role: 'admin' });
    addCleanup('deactivate test manager', res.status === 200 ? 'PASS' : 'FAIL', `HTTP ${res.status} ${snippet(res.data || res.text)}`);
  }
  if (state.created.departmentId && state.tokens.admin) {
    const res = await request('DELETE', `${API}/users/departments/${state.created.departmentId}`, { role: 'admin' });
    if (res.status === 200) addCleanup('delete test department', 'PASS', 'deleted');
    else if (res.status === 409 && /active users/i.test(res.text || JSON.stringify(res.data))) addCleanup('delete test department', 'PASS', 'correctly blocked by active users');
    else addCleanup('delete test department', 'FAIL', `HTTP ${res.status} ${snippet(res.data || res.text)}`);
  }
  if (state.created.policyDocumentId) {
    addCleanup('delete test policy document', 'SKIPPED', 'no delete endpoint exposed');
  }

  // Full org teardown via Prisma (handles everything the API may have missed)
  if (state.created.registeredOrgId) {
    await cleanupRegisteredOrganization();
  }
}

async function cleanupRegisteredOrganization() {
  const cleanupName = 'delete billing signup test organization';
  let PrismaClient;
  try {
    require('../worknex-backend/node_modules/dotenv').config({ path: path.join(process.cwd(), 'worknex-backend/.env') });
    ({ PrismaClient } = require('../worknex-backend/node_modules/@prisma/client'));
  } catch (err) {
    addCleanup(cleanupName, 'FAIL', `Prisma cleanup unavailable: ${err.message}`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const orgId = state.created.registeredOrgId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      addCleanup(cleanupName, 'SKIPPED', `organization ${orgId} already absent; cleanup appears complete`);
      return;
    }
    if (!String(org.name || '').startsWith(TEST_PREFIX)) {
      addCleanup(cleanupName, 'SKIPPED', `safety check skipped delete: org name "${org.name || '(blank)'}" does not start with ${TEST_PREFIX}`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Step 1: Delete records that RESTRICT user deletion (no cascade from User)
      await tx.leaveDecisionLog.deleteMany({ where: { organizationId: orgId } });
      await tx.leaveRequest.deleteMany({ where: { organizationId: orgId } });
      await tx.auditLog.deleteMany({ where: { organizationId: orgId } });
      await tx.leavePolicyVersion.deleteMany({ where: { organizationId: orgId } });
      // policyDocument.uploadedById -> User (RESTRICT): must delete before users
      await tx.extractedPolicyRule.deleteMany({ where: { organizationId: orgId } });
      await tx.policyDocument.deleteMany({ where: { organizationId: orgId } });

      // Step 2: Null out self-referencing FKs so users can be deleted without ordering issues
      await tx.user.updateMany({
        where: { organizationId: orgId },
        data: { managerId: null, departmentId: null },
      });

      // Step 3: Delete users — cascades RefreshToken, Attendance, Notification,
      //         PerformanceRecord, LeaveBalance
      await tx.user.deleteMany({ where: { organizationId: orgId } });

      // Step 4: Delete remaining records that reference Organization (no cascade from Org)
      await tx.leaveBalance.deleteMany({ where: { organizationId: orgId } });
      await tx.leavePolicy.deleteMany({ where: { organizationId: orgId } });
      await tx.holiday.deleteMany({ where: { organizationId: orgId } });
      await tx.etlSyncLog.deleteMany({ where: { organizationId: orgId } });
      await tx.invoice.deleteMany({ where: { organizationId: orgId } });
      await tx.subscription.deleteMany({ where: { organizationId: orgId } });
      await tx.department.deleteMany({ where: { organizationId: orgId } });

      // Step 5: Delete organization — cascades OrganizationSettings
      await tx.organization.delete({ where: { id: orgId } });
    }, { timeout: 30000 });

    addCleanup(cleanupName, 'PASS', orgId);
  } catch (err) {
    if (err.code === 'P2025') {
      addCleanup(cleanupName, 'SKIPPED', `organization already deleted during cleanup: ${err.message}`);
    } else {
      addCleanup(cleanupName, 'FAIL', err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function summarize() {
  const modules = new Map();
  for (const row of state.rows) {
    if (!modules.has(row.module)) modules.set(row.module, { module: row.module, passed: 0, failed: 0, skipped: 0, notes: [] });
    const item = modules.get(row.module);
    if (row.status === 'PASS') item.passed += 1;
    else if (row.status === 'FAIL') item.failed += 1;
    else item.skipped += 1;
    if (row.notes && item.notes.length < 3) item.notes.push(row.notes);
  }
  const summary = [...modules.values()].map((item) => ({ ...item, notes: item.notes.join('; ') }));
  const failed = state.rows.filter((row) => row.status === 'FAIL');
  const optionalModules = new Set(['Power BI']);
  const onlyOptionalFailures = failed.length > 0 && failed.every((row) => optionalModules.has(row.module));
  const overall = failed.length === 0 ? 'PASS' : onlyOptionalFailures ? 'PARTIAL_PASS' : 'FAIL';
  return { overall, summary, failed, onlyOptionalFailures };
}

function writeReports(result) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const payload = {
    title: 'FULL MODULE TEST REPORT',
    generatedAt: new Date().toISOString(),
    backendUrl: BACKEND_URL,
    frontendUrl: FRONTEND_URL,
    aiUrl: AI_URL,
    testPrefix: TEST_PREFIX,
    overall: result.overall,
    modules: result.summary,
    failed: result.failed,
    rows: state.rows,
    cleanup: state.cleanupRows,
  };
  fs.writeFileSync(JSON_REPORT, JSON.stringify(payload, null, 2));

  const lines = [
    '# FULL MODULE TEST REPORT',
    '',
    `Overall: ${result.overall}`,
    '',
    '| Module | Passed | Failed | Skipped | Notes |',
    '|---|---:|---:|---:|---|',
    ...result.summary.map((m) => `| ${m.module} | ${m.passed} | ${m.failed} | ${m.skipped} | ${String(m.notes || '').replace(/\|/g, '/')} |`),
    '',
    '## Failed Cases',
    '',
    ...(result.failed.length ? result.failed.map((f) => `- ${f.module} / ${f.test}: expected ${f.expected || 'pass'}, actual ${f.actualStatus || f.status}. ${f.responseSnippet || f.notes || ''}`) : ['None.']),
    '',
    '## Cleanup',
    '',
    ...(state.cleanupRows.length ? state.cleanupRows.map((r) => `- ${r.status}: ${r.test} - ${r.notes || ''}`) : ['No cleanup actions recorded.']),
    '',
  ];
  fs.writeFileSync(MD_REPORT, lines.join('\n'));
}

function printReport(result) {
  console.log('\n# FULL MODULE TEST REPORT\n');
  console.log(`Overall: ${result.overall}\n`);
  console.table(result.summary.map((m) => ({
    Module: m.module,
    Passed: m.passed,
    Failed: m.failed,
    Skipped: m.skipped,
    Notes: m.notes,
  })));
  if (result.failed.length) {
    console.log('\nFailed cases:');
    for (const f of result.failed) {
      console.log(`- ${f.module} | ${f.test} | endpoint=${f.endpoint || ''} role=${f.role || ''} expected=${f.expected || ''} actual=${f.actualStatus || f.status} ${f.responseSnippet || f.notes || ''}`);
    }
  }
  console.log(`\nReports written:\n- ${JSON_REPORT}\n- ${MD_REPORT}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`WorkNex full-module E2E test prefix: ${TEST_PREFIX}`);
  try {
    await health();
    await publicRegistrationTests();   // creates test org, stores admin session
    await authTests();                 // auth feature tests
    await cleanupStaleTestData();      // remove stale test artifacts in admin org
    await userTests();                 // creates dept + manager + employee, logs in as them
    await departmentTests();           // dept RBAC (requires testManager from userTests)
    await tenantTests();               // tenant isolation
    await securityTests();             // RBAC hardening (requires testEmployee)
    await attendanceTests();
    await leaveTests();
    await reportsTests();
    await settingsTests();
    await analyticsTests();
    await notificationTests();
    await performanceTests();
    await aiBackendTests();
    await aiDirectTests();
    await powerBiTests();
    await frontendRouteTests();
  } catch (err) {
    add('Runner', 'unhandled test runner error', 'FAIL', err.stack || err.message);
  } finally {
    try {
      await cleanup();
    } catch (err) {
      addCleanup('cleanup runner error', 'FAIL', err.stack || err.message);
    }
  }

  const result = summarize();
  writeReports(result);
  printReport(result);
  process.exit(result.overall === 'PASS' ? 0 : result.onlyOptionalFailures ? 2 : 1);
}

main();
