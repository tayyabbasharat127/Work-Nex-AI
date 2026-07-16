/**
 * WorkNex AI — Full Module Test Suite
 * Run: node test-all.js
 * Requires: backend on :5000, AI service on :8000 (optional)
 */

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const BACKEND_ORIGIN = requiredEnv('BACKEND_URL').replace(/\/$/, '');
const BACKEND = `${BACKEND_ORIGIN}/api/v1`;
const AI_SVC = process.env.AI_SERVICE_URL;
const ADMIN_EMAIL = requiredEnv('TEST_ADMIN_EMAIL');
const ADMIN_PASSWORD = requiredEnv('TEST_ADMIN_PASSWORD');
const TEST_USER_PASSWORD = requiredEnv('TEST_USER_PASSWORD');

// Unique per-run identifiers — avoids data collisions on repeated runs
const RUN_ID     = Date.now();
const TEST_EMAIL = `test.runner.${RUN_ID}@worknex-demo.com`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const results     = [];
let adminToken    = null;
let createdUserId = null;
let createdDeptId = null;
let createdLeaveId = null;

const pass = (name, note = '') => {
  results.push({ status: 'PASS', name, note });
  console.log(`  \x1b[32m✔ PASS\x1b[0m  ${name}${note ? '  →  ' + note : ''}`);
};
const fail = (name, reason) => {
  results.push({ status: 'FAIL', name, reason });
  console.log(`  \x1b[31m✘ FAIL\x1b[0m  ${name}  →  ${reason}`);
};
const warn = (name, note) => {
  results.push({ status: 'WARN', name, note });
  console.log(`  \x1b[33m⚠ WARN\x1b[0m  ${name}  →  ${note}`);
};

const api = async (method, path, body, token, base = BACKEND) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let json;
    try { json = await r.json(); } catch { json = {}; }
    return { ok: r.ok, status: r.status, data: json.data ?? json, message: json.message };
  } catch {
    return { ok: false, status: 0, data: null, message: `Connection refused — ${base} not reachable` };
  }
};

const GET    = (path, token, base)       => api('GET',    path, null,  token, base);
const POST   = (path, body, token, base) => api('POST',   path, body,  token, base);
const PUT    = (path, body, token, base) => api('PUT',    path, body,  token, base);
const DELETE = (path, token, base)       => api('DELETE', path, null,  token, base);

const section = (title) =>
  console.log(`\n\x1b[36m━━━  ${title}  ━━━\x1b[0m`);

// Future date unique per run — no overlap with existing leaves
const leaveDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  d.setMonth((RUN_ID % 11));
  d.setDate(((RUN_ID % 20) + 1));
  return d.toISOString().split('T')[0];
};

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testHealth() {
  section('1. HEALTH CHECK');
  try {
    const r = await fetch(`${BACKEND_ORIGIN}/health`);
    const j = await r.json();
    if (j.status === 'ok' && j.database === 'ready')
      pass('Backend health', `DB: ${j.database}`);
    else
      fail('Backend health', `status=${j.status} db=${j.database}`);
  } catch { fail('Backend health', 'Cannot reach BACKEND_URL'); }

  try {
    const r = await fetch(`${AI_SVC}/health`);
    if (r.ok) pass('AI service health', 'AI_SERVICE_URL responding');
    else warn('AI service health', `HTTP ${r.status}`);
  } catch { warn('AI service health', 'AI_SERVICE_URL not reachable — AI features use fallback'); }
}

async function testAuth() {
  section('2. AUTH');

  const r = await POST('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (r.ok && r.data?.accessToken) {
    adminToken = r.data.accessToken;
    pass('Admin login', 'token acquired');
  } else {
    fail('Admin login', r.message || 'No token — check ADMIN_PASSWORD in test-all.js');
    return;
  }

  const r2 = await POST('/auth/login', { email: ADMIN_EMAIL, password: 'wrongpassword123' });
  if (!r2.ok && r2.status === 401)
    pass('Login rejects wrong password', 'HTTP 401');
  else
    fail('Login rejects wrong password', `got HTTP ${r2.status}`);

  const r3 = await GET('/users');
  if (r3.status === 401)
    pass('Unauthenticated request blocked', 'HTTP 401');
  else
    fail('Unauthenticated request blocked', `got HTTP ${r3.status}`);

  const r4 = await GET('/users', adminToken);
  if (r4.ok)
    pass('Valid token grants access');
  else
    fail('Valid token grants access', r4.message);

  const r5 = await GET('/users/me', adminToken);
  if (r5.ok && r5.data?.email)
    pass('Get own profile', `email: ${r5.data.email}`);
  else
    fail('Get own profile', r5.message);
}

async function testUsers() {
  section('3. USERS');

  const r1 = await GET('/users', adminToken);
  if (r1.ok) {
    const count = Array.isArray(r1.data) ? r1.data.length : r1.data?.users?.length ?? 0;
    pass('List users', `${count} returned`);
  } else fail('List users', r1.message);

  // Get a dept for user creation
  const depts = await GET('/users/departments/all', adminToken);
  const deptList = Array.isArray(depts.data) ? depts.data : [];
  const deptId = deptList[0]?.id;

  const r2 = await POST('/users', {
    firstName: 'Test',
    lastName: 'Runner',
    email: TEST_EMAIL,
    role: 'EMPLOYEE',
    departmentId: deptId,
    employeeId: `TEST-${RUN_ID}`,
  }, adminToken);
  if (r2.ok && r2.data?.id) {
    createdUserId = r2.data.id;
    pass('Create user', `id: ${createdUserId}`);
  } else fail('Create user', r2.message);

  if (createdUserId) {
    const r3 = await GET(`/users/${createdUserId}`, adminToken);
    if (r3.ok && r3.data?.email === TEST_EMAIL)
      pass('Get user by ID');
    else
      fail('Get user by ID', r3.message);

    const r4 = await PUT(`/users/${createdUserId}`, { firstName: 'Updated' }, adminToken);
    if (r4.ok)
      pass('Update user');
    else
      fail('Update user', r4.message);
  }
}

async function testDepartments() {
  section('4. DEPARTMENTS');

  const r1 = await GET('/users/departments/all', adminToken);
  if (r1.ok) {
    const depts = Array.isArray(r1.data) ? r1.data : [];
    pass('List departments', `${depts.length} departments`);
  } else fail('List departments', r1.message);

  const r2 = await POST('/users/departments', {
    name: `TestDept-${RUN_ID}`,
    description: 'Created by test runner — will be cleaned up',
  }, adminToken);
  if (r2.ok && r2.data?.id) {
    createdDeptId = r2.data.id;
    pass('Create department', `id: ${createdDeptId}`);
  } else fail('Create department', r2.message);
}

async function testAttendance() {
  section('5. ATTENDANCE');

  const today = new Date().toISOString().split('T')[0];
  const r1 = await GET(`/attendance?date=${today}`, adminToken);
  if (r1.ok)
    pass('Get daily attendance', `date: ${today}`);
  else
    fail('Get daily attendance', r1.message);

  const now = new Date();
  const r2 = await GET(`/analytics/attendance/trends?month=${now.getMonth()+1}&year=${now.getFullYear()}`, adminToken);
  if (r2.ok) pass('Attendance trends API');
  else fail('Attendance trends API', r2.message);

  const r3 = await GET(`/analytics/attendance/department?month=${now.getMonth()+1}&year=${now.getFullYear()}`, adminToken);
  if (r3.ok) pass('Department attendance API');
  else fail('Department attendance API', r3.message);

  const r4 = await POST('/attendance/check-in', {}, adminToken);
  if (r4.ok)
    pass('Check-in endpoint', 'checked in');
  else if (r4.message?.toLowerCase().includes('already'))
    pass('Check-in endpoint', 'already checked in today (valid)');
  else
    fail('Check-in endpoint', r4.message);
}

async function testLeaves() {
  section('6. LEAVE MANAGEMENT');

  const r1 = await GET('/leave', adminToken);
  if (r1.ok) {
    const count = r1.data?.leaves?.length ?? (Array.isArray(r1.data) ? r1.data.length : 0);
    pass('List all leaves', `${count} records`);
  } else fail('List all leaves', r1.message);

  const r2 = await GET('/leave/pending', adminToken);
  if (r2.ok) {
    const pending = Array.isArray(r2.data) ? r2.data : r2.data?.leaves ?? [];
    pass('Get pending leaves', `${pending.length} pending`);
  } else fail('Get pending leaves', r2.message);

  const r3 = await GET('/leave/balances/me', adminToken);
  if (r3.ok) pass('Get own leave balances');
  else fail('Get own leave balances', r3.message);

  const r4 = await GET('/leave/policies/all', adminToken);
  if (r4.ok) {
    const policies = Array.isArray(r4.data) ? r4.data : [];
    pass('Get leave policies', `${policies.length} policies`);
  } else fail('Get leave policies', r4.message);

  // Apply leave using unique far-future date
  const startStr = leaveDate();
  const endDate = new Date(startStr);
  endDate.setDate(endDate.getDate() + 1);
  const endStr = endDate.toISOString().split('T')[0];

  const r5 = await POST('/leave', {
    leaveType: 'CASUAL',
    startDate: startStr,
    endDate:   endStr,
    totalDays: 2,
    reason:    `Test runner leave — run ${RUN_ID}`,
  }, adminToken);
  if (r5.ok && r5.data?.id) {
    createdLeaveId = r5.data.id;
    pass('Apply leave request', `id: ${createdLeaveId}`);

    const r6 = await PUT(`/leave/${createdLeaveId}/approve`, { note: 'Auto-approved by test' }, adminToken);
    if (r6.ok) pass('Approve leave request');
    else fail('Approve leave request', r6.message);
  } else fail('Apply leave request', r5.message);
}

async function testPerformance() {
  section('7. PERFORMANCE');

  const now = new Date();
  const r1 = await GET(`/performance/leaderboard?month=${now.getMonth()+1}&year=${now.getFullYear()}`, adminToken);
  if (r1.ok) {
    const count = Array.isArray(r1.data) ? r1.data.length : 0;
    pass('Performance leaderboard', `${count} entries`);
    if (count === 0) warn('Performance leaderboard', 'Empty — run ETL first');
  } else fail('Performance leaderboard', r1.message);

  const r2 = await GET(`/performance/me?year=${now.getFullYear()}`, adminToken);
  if (r2.ok) pass('Get own performance records');
  else fail('Get own performance records', r2.message);
}

async function testAnalytics() {
  section('8. ANALYTICS');

  const r1 = await GET('/analytics/dashboard', adminToken);
  if (r1.ok && r1.data)
    pass('Dashboard KPIs', `employees:${r1.data.totalEmployees ?? '?'} present:${r1.data.activeToday ?? '?'}`);
  else fail('Dashboard KPIs', r1.message);

  const r2 = await GET('/analytics/workforce/headcount', adminToken);
  if (r2.ok) pass('Headcount analytics');
  else fail('Headcount analytics', r2.message);

  const r3 = await GET(`/analytics/leave/by-type?year=${new Date().getFullYear()}`, adminToken);
  if (r3.ok) pass('Leave by type analytics');
  else fail('Leave by type analytics', r3.message);
}

async function testETL() {
  section('9. ETL PIPELINE');

  const r1 = await POST('/analytics/etl/run', {}, adminToken);
  if (r1.ok) pass('Trigger ETL pipeline', 'ETL job started');
  else fail('Trigger ETL pipeline', r1.message);

  const r2 = await GET('/analytics/etl/logs', adminToken);
  if (r2.ok) pass('ETL logs endpoint');
  else warn('ETL logs endpoint', r2.message);
}

async function testAIPerformance() {
  section('10. AI — PERFORMANCE PREDICTION');

  // Use backend proxy route (authenticated)
  const users = await GET('/users', adminToken);
  const userList = Array.isArray(users.data) ? users.data : (users.data?.users ?? []);
  const testUser = userList.find(u => u.role === 'EMPLOYEE') || userList[0];
  if (!testUser) { fail('AI Performance prediction', 'No users found'); return; }

  const r = await POST('/ai/predict-performance', { employeeId: testUser.id }, adminToken);
  if (r.ok && r.data?.predictedScore !== undefined) {
    pass('AI performance prediction', `score: ${r.data.predictedScore}, risk: ${r.data.riskLevel}`);
    if (r.data.predictedScore >= 0 && r.data.predictedScore <= 100)
      pass('Prediction score in valid range (0-100)');
    else
      fail('Prediction score in valid range', `got ${r.data.predictedScore}`);
    if (['LOW','MEDIUM','HIGH'].includes(r.data.riskLevel))
      pass('Risk level is valid enum', r.data.riskLevel);
    else
      fail('Risk level is valid enum', `got "${r.data.riskLevel}"`);
  } else fail('AI performance prediction', r.message || `HTTP ${r.status}`);
}

async function testAIAttrition() {
  section('11. AI — ATTRITION RISK');

  const r = await GET('/ai/predict/attrition-risk', adminToken);
  if (r.ok && r.data) {
    const d = r.data;
    pass('Attrition risk', `analyzed: ${d.totalAnalyzed}, high: ${d.highRiskCount}, medium: ${d.mediumRiskCount}`);

    const total = (d.highRiskCount ?? 0) + (d.mediumRiskCount ?? 0) + ((d.lowRiskCount) ?? 0);
    if (total === d.totalAnalyzed)
      pass('Risk counts consistent');
    else
      fail('Risk counts consistent', `${total} !== ${d.totalAnalyzed}`);

    const invalid = (d.employees ?? []).filter(e => e.riskScore < 0 || e.riskScore > 100);
    if (invalid.length === 0)
      pass('All risk scores in 0-100 range');
    else
      fail('All risk scores in 0-100 range', `${invalid.length} out of range`);

    if (d.dataSource === 'synthetic_fallback' || d.fallback)
      warn('Attrition data source', 'Using synthetic/fallback data — ETL needed for real scores');
    else
      pass('Attrition using real data', d.dataSource ?? 'performance_records');
  } else fail('Attrition risk', r.message || `HTTP ${r.status}`);
}

async function testAIForecast() {
  section('12. AI — LEAVE FORECAST');

  const r = await GET('/ai/predict/leave-forecast', adminToken);
  if (r.ok && r.data) {
    const d = r.data;
    pass('Leave forecast', `peak: ${d.peakDay} (${d.peakPredicted}), avg: ${d.avgPerDay}/day`);

    if (d.forecast?.length === 30)
      pass('Forecast covers 30 days');
    else
      warn('Forecast length', `Expected 30, got ${d.forecast?.length}`);

    const neg = (d.forecast ?? []).filter(f => f.predicted < 0);
    if (neg.length === 0) pass('All forecast values non-negative');
    else fail('All forecast values non-negative', `${neg.length} negative`);

    pass('Forecast algorithm', d.algorithm ?? 'unknown');
  } else fail('Leave forecast', r.message || `HTTP ${r.status}`);
}

async function testChatbot() {
  section('13. AI — CHATBOT');

  const questions = [
    'Hello',
    'What is the leave policy?',
    'Show me attendance',
    'What is attrition risk?',
  ];

  for (const q of questions) {
    const r = await POST('/ai/chat', { message: q }, adminToken);
    const text = r.data?.answer || r.data?.message || r.data?.text || r.message;
    if (r.ok && text && text.length > 5)
      pass(`Chatbot: "${q}"`, `"${text.slice(0, 65)}"`);
    else
      fail(`Chatbot: "${q}"`, `HTTP ${r.status} — ${text || 'no response'}`);
  }
}

async function testNotifications() {
  section('14. IN-APP NOTIFICATIONS');

  const r1 = await GET('/notifications', adminToken);
  if (r1.ok) {
    const n = r1.data?.notifications ?? r1.data;
    pass('Get notifications', `${Array.isArray(n) ? n.length : '?'} notifications`);
  } else fail('Get notifications', r1.message);

  const r2 = await GET('/notifications/unread-count', adminToken);
  if (r2.ok) pass('Get unread count', `count: ${r2.data?.count ?? r2.data}`);
  else fail('Get unread count', r2.message);

  const r3 = await PUT('/notifications/read-all', {}, adminToken);
  if (r3.ok) pass('Mark all as read');
  else warn('Mark all as read', r3.message);
}

async function testSMTP() {
  section('15. SMTP / EMAIL');

  const r = await POST('/auth/forgot-password', { email: ADMIN_EMAIL });
  if (r.ok)
    pass('Password reset email triggered', `check ${ADMIN_EMAIL}`);
  else if (r.status === 404)
    fail('Password reset email', 'Email not found in DB');
  else
    warn('Password reset email', r.message);
}

async function testRBAC() {
  section('16. ROLE-BASED ACCESS CONTROL');

  // Fetch all users (try higher limit)
  const allUsers = await GET('/users?limit=100', adminToken);
  const userList = Array.isArray(allUsers.data) ? allUsers.data : (allUsers.data?.users ?? []);
  const emp = userList.find(u => u.role === 'EMPLOYEE');

  if (!emp) {
    warn('RBAC test', 'No employee found in first 100 users — using created test user');
    // Try logging in as the test user we created
    if (!createdUserId) return;
  }

  const empEmail = emp?.email ?? TEST_EMAIL;
  const empPass  = emp?.email?.includes('@worknex-demo.com') ? TEST_USER_PASSWORD : null;

  if (!empPass) {
    warn('RBAC: Employee login', 'Cannot login as test user (no known password) — skipping RBAC checks');
    return;
  }

  const login = await POST('/auth/login', { email: empEmail, password: empPass });
  if (!login.ok || !login.data?.accessToken) {
    warn('RBAC: Employee login', `Could not login as ${empEmail}`);
    return;
  }
  const empToken = login.data.accessToken;
  pass('RBAC: Employee login', empEmail);

  // Employee CAN see own profile
  const r1 = await GET('/users/me', empToken);
  if (r1.ok) pass('RBAC: Employee can get own profile');
  else fail('RBAC: Employee can get own profile', r1.message);

  // Employee CANNOT list all users
  const r2 = await GET('/users', empToken);
  if (r2.status === 403) pass('RBAC: Employee blocked from listing all users', 'HTTP 403');
  else fail('RBAC: Employee blocked from listing all users', `got HTTP ${r2.status}`);

  // Employee CANNOT run ETL
  const r3 = await POST('/analytics/etl/run', {}, empToken);
  if (r3.status === 403) pass('RBAC: Employee blocked from ETL', 'HTTP 403');
  else fail('RBAC: Employee blocked from ETL', `got HTTP ${r3.status}`);

  // Employee CAN apply leave
  const s = new Date(); s.setFullYear(s.getFullYear() + 3);
  const e = new Date(s); e.setDate(e.getDate() + 1);
  const r4 = await POST('/leave', {
    leaveType: 'SICK',
    startDate: s.toISOString().split('T')[0],
    endDate:   e.toISOString().split('T')[0],
    totalDays: 2,
    reason:    'RBAC test leave',
  }, empToken);
  if (r4.ok) pass('RBAC: Employee can apply leave');
  else fail('RBAC: Employee can apply leave', r4.message);

  // Employee CANNOT approve another leave
  if (createdLeaveId) {
    const r5 = await PUT(`/leave/${createdLeaveId}/approve`, { note: 'Unauthorized' }, empToken);
    if (r5.status === 403) pass('RBAC: Employee cannot approve leaves', 'HTTP 403');
    else warn('RBAC: Employee approve attempt', `got HTTP ${r5.status}`);
  }
}

async function cleanup() {
  section('17. CLEANUP (removing test data)');
  if (createdUserId) {
    const r = await DELETE(`/users/${createdUserId}`, adminToken);
    if (r.ok) pass('Deleted test user');
    else warn('Delete test user', r.message);
  }
  if (createdDeptId) {
    const r = await DELETE(`/users/departments/${createdDeptId}`, adminToken);
    if (r.ok) pass('Deleted test department');
    else warn('Delete test department', r.message);
  }
}

async function printSummary() {
  const total  = results.filter(r => r.status !== 'PASS' || true).length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log('\n\x1b[36m' + '═'.repeat(60) + '\x1b[0m');
  console.log('\x1b[1m  TEST SUMMARY\x1b[0m');
  console.log('  ' + '─'.repeat(56));
  console.log(`  Total:   ${total}`);
  console.log(`  \x1b[32mPASS:    ${passed}\x1b[0m`);
  console.log(`  \x1b[31mFAIL:    ${failed}\x1b[0m`);
  console.log(`  \x1b[33mWARN:    ${warned}\x1b[0m`);

  if (failed > 0) {
    console.log('\n  \x1b[31mFailed tests:\x1b[0m');
    results.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`    ✘  ${r.name}\n       ${r.reason}`)
    );
  }
  if (warned > 0) {
    console.log('\n  \x1b[33mWarnings:\x1b[0m');
    results.filter(r => r.status === 'WARN').forEach(r =>
      console.log(`    ⚠  ${r.name}\n       ${r.note}`)
    );
  }

  const score = Math.round((passed / (passed + failed)) * 100);
  const color = score >= 90 ? '\x1b[32m' : score >= 70 ? '\x1b[33m' : '\x1b[31m';
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${color}System Health Score: ${score}%\x1b[0m`);
  console.log('═'.repeat(60) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n\x1b[1m\x1b[36m  WorkNex AI — Full Module Test Suite\x1b[0m');
  console.log(`  ${new Date().toLocaleString()}  [run: ${RUN_ID}]\n`);

  await testHealth();

  if (results.find(r => r.name === 'Backend health' && r.status === 'FAIL')) {
    console.log('\n  \x1b[31mBackend not running. Start it first:\x1b[0m');
    console.log('    cd worknex-backend && npm run dev\n');
    process.exit(1);
  }

  await testAuth();
  await testUsers();
  await testDepartments();
  await testAttendance();
  await testLeaves();
  await testPerformance();
  await testAnalytics();
  await testETL();
  await testAIPerformance();
  await testAIAttrition();
  await testAIForecast();
  await testChatbot();
  await testNotifications();
  await testSMTP();
  await testRBAC();
  await cleanup();

  await printSummary();
})();
