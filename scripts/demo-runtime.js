/** WorkNex deterministic demo runtime supervisor: start, stop, status, health. */
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'worknex-backend');
const FRONTEND = path.join(ROOT, 'frontend');
const AI = path.join(ROOT, 'ai-service');
const MULTI_AGENT = path.join(ROOT, 'multi-agent-service');
const RUNTIME_DIR = path.join(ROOT, '.demo-runtime');
const LOG_DIR = path.join(RUNTIME_DIR, 'logs');
const STATE_FILE = path.join(RUNTIME_DIR, 'state.json');
const LOCK_FILE = path.join(RUNTIME_DIR, 'operation.lock');
const DEMO_SLUG = 'worknex-technologies-demo';
const DEFAULT_DEMO_PASSWORD = 'WorkNexDemo!2026';
const START_TIMEOUT_MS = Number(process.env.DEMO_START_TIMEOUT_MS || 60000);

function loadEnvironment() {
  const dotenvPath = path.join(BACKEND, 'node_modules', 'dotenv');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const dotenv = require(dotenvPath);
  dotenv.config({ path: path.join(BACKEND, '.env') });
  dotenv.config({ path: path.join(ROOT, '.env'), override: false });
}
loadEnvironment();

const services = {
  backend: { label: 'Backend', cwd: BACKEND, command: process.execPath, args: ['src/app.js'], url: process.env.DEMO_BACKEND_HEALTH_URL || 'http://localhost:5000/health/ready', port: 5000 },
  ai: { label: 'AI service', cwd: AI, command: process.env.PYTHON_COMMAND || 'python', args: ['run.py'], url: process.env.DEMO_AI_HEALTH_URL || 'http://localhost:8000/health/live', port: 8000 },
  multiAgent: { label: 'Multi-agent service', cwd: MULTI_AGENT, command: process.execPath, args: ['server.js'], url: process.env.DEMO_MULTI_AGENT_HEALTH_URL || 'http://localhost:8010/health', port: 8010 },
  frontend: { label: 'Frontend', cwd: FRONTEND, command: process.execPath, args: [path.join(FRONTEND, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev'], url: process.env.DEMO_FRONTEND_HEALTH_URL || 'http://localhost:3000', port: 3000 },
};

function ensureRuntimeDirectory() { fs.mkdirSync(LOG_DIR, { recursive: true }); }
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { version: 1, status: 'stopped', services: {} }; }
}
function writeState(state) {
  ensureRuntimeDirectory();
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
function isProcessAlive(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try { process.kill(Number(pid), 0); return true; } catch { return false; }
}
function acquireLock(command) {
  ensureRuntimeDirectory();
  try {
    const descriptor = fs.openSync(LOCK_FILE, 'wx');
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, command, startedAt: new Date().toISOString() }));
    return () => {
      try { fs.closeSync(descriptor); } catch { /* already closed */ }
      try { fs.unlinkSync(LOCK_FILE); } catch { /* already removed */ }
    };
  } catch {
    let lock = {};
    try { lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch { /* malformed lock */ }
    if (lock.pid && !isProcessAlive(lock.pid)) {
      try { fs.unlinkSync(LOCK_FILE); } catch { /* race */ }
      return acquireLock(command);
    }
    throw new Error(`Another demo runtime operation is active${lock.command ? ` (${lock.command}, PID ${lock.pid})` : ''}.`);
  }
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT, env: { ...process.env, ...(options.env || {}) }, encoding: 'utf8',
    windowsHide: true, timeout: options.timeout || 120000,
  });
  return { ok: result.status === 0, status: result.status, stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim(), error: result.error };
}
function prismaInvocation() {
  return {
    command: process.execPath,
    args: [path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js')],
  };
}
function verifyDependencies() {
  const required = [
    [path.join(BACKEND, 'node_modules', '@prisma', 'client'), 'Backend dependencies'],
    [path.join(FRONTEND, 'node_modules', 'next'), 'Frontend dependencies'],
    [path.join(MULTI_AGENT, 'node_modules', '@langchain'), 'Multi-agent dependencies'],
    [path.join(AI, 'run.py'), 'AI service entrypoint'],
  ];
  const missing = required.filter(([target]) => !fs.existsSync(target)).map(([, label]) => label);
  if (missing.length) throw new Error(`Required dependencies are missing: ${missing.join(', ')}.`);
  const python = run(process.env.PYTHON_COMMAND || 'python', ['-c', 'import fastapi, uvicorn'], { cwd: AI, timeout: 15000 });
  if (!python.ok) throw new Error('AI Python dependencies are unavailable. Run: python -m pip install -r ai-service/requirements.txt');
}
function assertRuntimeEnvironment() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_RUNTIME_IN_PRODUCTION !== 'true') {
    throw new Error('Demo runtime is disabled in production. Set ALLOW_DEMO_RUNTIME_IN_PRODUCTION=true only for an approved isolated demo environment.');
  }
}
async function createPrisma() {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const { PrismaClient } = require(path.join(BACKEND, 'node_modules', '@prisma', 'client'));
  return new PrismaClient();
}
async function checkDatabase() {
  const prisma = await createPrisma();
  const startedAt = Date.now();
  try { await prisma.$queryRaw`SELECT 1`; return { ok: true, detail: `PostgreSQL reachable (${Date.now() - startedAt}ms)` }; }
  catch (error) { return { ok: false, detail: `PostgreSQL unavailable: ${error.message}` }; }
  finally { await prisma.$disconnect(); }
}
function checkMigrations() {
  const prisma = prismaInvocation();
  const result = run(prisma.command, [...prisma.args, 'migrate', 'status'], { cwd: BACKEND, timeout: 60000 });
  if (!result.ok) return { ok: false, detail: result.stderr || result.stdout || result.error?.message || 'Migration status failed' };
  const pending = /following migration.*have not yet been applied|not in sync|pending migration/i.test(`${result.stdout}\n${result.stderr}`);
  return { ok: !pending, detail: pending ? 'Pending Prisma migrations detected' : 'Prisma migrations are current' };
}
function validateSeed({ rebuildIfInvalid = false } = {}) {
  let validation = run(process.execPath, ['scripts/demo-seeder.js', 'validate'], { cwd: BACKEND, timeout: 120000 });
  if (!validation.ok && rebuildIfInvalid) {
    console.log('Demo data is missing or invalid; recreating the fixed demo tenant...');
    const seed = run(process.execPath, ['scripts/demo-seeder.js', 'seed'], { cwd: BACKEND, timeout: 180000 });
    if (!seed.ok) return { ok: false, detail: seed.stderr || seed.stdout || 'Demo seed failed' };
    validation = run(process.execPath, ['scripts/demo-seeder.js', 'validate'], { cwd: BACKEND, timeout: 120000 });
  }
  return { ok: validation.ok, detail: validation.ok ? `Seeded tenant ${DEMO_SLUG} is valid` : validation.stderr || validation.stdout || 'Demo validation failed' };
}
async function verifyAccounts() {
  const prisma = await createPrisma();
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const bcrypt = require(path.join(BACKEND, 'node_modules', 'bcryptjs'));
  const password = process.env.DEMO_USER_PASSWORD || DEFAULT_DEMO_PASSWORD;
  const expected = [['admin@demo.worknex.ai', 'ADMIN'], ['manager@demo.worknex.ai', 'MANAGER'], ['employee@demo.worknex.ai', 'EMPLOYEE']];
  try {
    const organization = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true } });
    if (!organization) return { ok: false, detail: 'Demo organization is missing' };
    const users = await prisma.user.findMany({
      where: { email: { in: expected.map(([email]) => email) } },
      select: { email: true, passwordHash: true, isActive: true, twoFAEnabled: true, organizationId: true, customRole: { select: { tier: true } } },
    });
    for (const [email, role] of expected) {
      const user = users.find((row) => row.email === email);
      if (!user || !user.isActive || user.organizationId !== organization.id || user.customRole?.tier !== role) return { ok: false, detail: `Demo account invalid: ${email}` };
      if (user.twoFAEnabled) return { ok: false, detail: `Demo account unexpectedly requires 2FA: ${email}` };
      // eslint-disable-next-line no-await-in-loop
      if (!await bcrypt.compare(password, user.passwordHash)) return { ok: false, detail: `Demo password mismatch: ${email}` };
    }
    return { ok: true, detail: 'Admin, Manager, and Employee credentials verified' };
  } catch (error) { return { ok: false, detail: error.message }; }
  finally { await prisma.$disconnect(); }
}
async function requestHealth(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    return { ok: response.status >= 200 && response.status < 400, status: response.status, latencyMs: Date.now() - startedAt, detail: `HTTP ${response.status} (${Date.now() - startedAt}ms)` };
  } catch (error) { return { ok: false, detail: error.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : error.message }; }
  finally { clearTimeout(timer); }
}
async function isPortOpen(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const done = (result) => { socket.destroy(); resolve(result); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true)); socket.once('timeout', () => done(false)); socket.once('error', () => done(false));
  });
}
function startManagedProcess(key, definition) {
  ensureRuntimeDirectory();
  const logPath = path.join(LOG_DIR, `${key}.log`);
  const descriptor = fs.openSync(logPath, 'a');
  fs.writeSync(descriptor, `\n[${new Date().toISOString()}] Starting ${definition.label}\n`);
  const child = spawn(definition.command, definition.args, {
    cwd: definition.cwd, env: { ...process.env }, detached: true, windowsHide: true, stdio: ['ignore', descriptor, descriptor],
  });
  child.once('error', (error) => {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Process launch failed: ${error.message}\n`);
  });
  child.unref(); fs.closeSync(descriptor);
  return { pid: child.pid, logPath: path.relative(ROOT, logPath), startedAt: new Date().toISOString() };
}
async function waitForService(key, definition, pid) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  let last = { detail: 'not checked' };
  while (Date.now() < deadline) {
    if (pid && !isProcessAlive(pid)) return { ok: false, detail: `${definition.label} exited; inspect .demo-runtime/logs/${key}.log` };
    // eslint-disable-next-line no-await-in-loop
    last = await requestHealth(definition.url, 2500);
    if (last.ok) return last;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return { ok: false, detail: `${definition.label} did not become healthy within ${START_TIMEOUT_MS / 1000}s: ${last.detail}` };
}
function terminateProcessTree(pid) {
  if (!isProcessAlive(pid)) return { ok: true, detail: 'already stopped' };
  if (process.platform === 'win32') {
    const result = run('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { timeout: 15000 });
    return { ok: result.ok || !isProcessAlive(pid), detail: result.ok ? 'stopped' : result.stderr || result.stdout };
  }
  try { process.kill(-Number(pid), 'SIGTERM'); return { ok: true, detail: 'stop signal sent' }; }
  catch (error) { return { ok: false, detail: error.message }; }
}
async function collectServiceHealth() {
  const checks = {};
  for (const [key, definition] of Object.entries(services)) {
    // eslint-disable-next-line no-await-in-loop
    checks[key] = await requestHealth(definition.url);
  }
  return checks;
}
function printChecks(checks) {
  console.table(Object.entries(checks).map(([component, result]) => ({ Component: component, Status: result.ok ? 'PASS' : 'FAIL', Detail: result.detail })));
}

async function startDemo() {
  const release = acquireLock('start');
  const startedAt = Date.now();
  const previous = readState();
  const state = { version: 1, status: 'starting', startedAt: new Date().toISOString(), services: { ...(previous.services || {}) } };
  const newlyStarted = [];
  try {
    console.log('WorkNex demo start: preflight');
    assertRuntimeEnvironment();
    verifyDependencies();
    const database = await checkDatabase();
    if (!database.ok) throw new Error(database.detail);
    console.log(`PASS PostgreSQL: ${database.detail}`);
    const migrations = checkMigrations();
    if (!migrations.ok) throw new Error(`${migrations.detail}. Run npm run demo:rebuild explicitly after reviewing migrations.`);
    console.log(`PASS Migrations: ${migrations.detail}`);
    const seed = validateSeed({ rebuildIfInvalid: true });
    if (!seed.ok) throw new Error(seed.detail);
    console.log(`PASS Demo data: ${seed.detail}`);
    const accounts = await verifyAccounts();
    if (!accounts.ok) throw new Error(accounts.detail);
    console.log(`PASS Accounts: ${accounts.detail}`);

    const readinessChecks = [];
    for (const [key, definition] of Object.entries(services)) {
      // eslint-disable-next-line no-await-in-loop
      const current = await requestHealth(definition.url, 2000);
      if (current.ok) {
        const old = previous.services?.[key];
        const managed = old?.ownership === 'managed' && isProcessAlive(old.pid);
        state.services[key] = managed ? { ...old, health: current.detail } : { ownership: 'reused', pid: null, health: current.detail, detectedAt: new Date().toISOString() };
        console.log(`PASS ${definition.label}: ${managed ? 'managed process already healthy' : 'reusing healthy existing service'}`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (await isPortOpen(definition.port)) throw new Error(`${definition.label} port ${definition.port} is occupied but its health endpoint is unhealthy.`);
      const processInfo = startManagedProcess(key, definition);
      newlyStarted.push(processInfo.pid);
      state.services[key] = { ownership: 'managed', ...processInfo, health: 'starting' };
      writeState(state);
      console.log(`START ${definition.label}: PID ${processInfo.pid}`);
      readinessChecks.push((async () => {
        const health = await waitForService(key, definition, processInfo.pid);
        if (!health.ok) throw new Error(health.detail);
        state.services[key].health = health.detail;
        console.log(`PASS ${definition.label}: ${health.detail}`);
      })());
    }
    await Promise.all(readinessChecks);
    const finalHealth = await collectServiceHealth();
    if (Object.values(finalHealth).some((result) => !result.ok)) throw new Error('A service failed final health verification.');
    state.status = 'ready'; state.readyAt = new Date().toISOString(); state.durationSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(2));
    writeState(state);
    console.log(`\nWorkNex demo is READY in ${state.durationSeconds}s`);
    console.log('Frontend: http://localhost:3000');
    console.log('Accounts: admin@demo.worknex.ai | manager@demo.worknex.ai | employee@demo.worknex.ai');
  } catch (error) {
    for (const pid of newlyStarted.reverse()) terminateProcessTree(pid);
    state.status = 'failed'; state.error = error.message; state.failedAt = new Date().toISOString(); writeState(state);
    throw error;
  } finally { release(); }
}
async function stopDemo() {
  const release = acquireLock('stop');
  try {
    const state = readState(); const results = {};
    for (const [key, service] of Object.entries(state.services || {}).reverse()) {
      results[key] = service.ownership === 'managed' && service.pid ? terminateProcessTree(service.pid) : { ok: true, detail: 'reused service left running' };
    }
    state.status = 'stopped'; state.stoppedAt = new Date().toISOString();
    state.services = Object.fromEntries(Object.entries(state.services || {}).map(([key, service]) => [key, { ...service, health: service.ownership === 'managed' ? 'stopped' : 'reused service not owned' }]));
    writeState(state); printChecks(results);
    if (Object.values(results).some((result) => !result.ok)) throw new Error('A managed demo service could not be stopped.');
    console.log('Demo runtime stopped. Reused services were left untouched.');
  } finally { release(); }
}
async function statusDemo() {
  const state = readState(); const health = await collectServiceHealth();
  console.log(`Demo runtime state: ${state.status || 'unknown'}`);
  console.table(Object.entries(services).map(([key, definition]) => {
    const service = state.services?.[key] || {};
    return { Service: definition.label, Runtime: service.ownership || 'untracked', PID: service.pid || '-', Process: service.pid ? (isProcessAlive(service.pid) ? 'alive' : 'exited') : '-', Health: health[key].ok ? 'healthy' : 'down', Detail: health[key].detail };
  }));
}
async function healthDemo() {
  const checks = {};
  checks.postgresql = await checkDatabase();
  checks.migrations = checks.postgresql.ok ? checkMigrations() : { ok: false, detail: 'Skipped because PostgreSQL is down' };
  checks.seed = checks.postgresql.ok ? validateSeed() : { ok: false, detail: 'Skipped because PostgreSQL is down' };
  checks.accounts = checks.seed.ok ? await verifyAccounts() : { ok: false, detail: 'Skipped because demo seed is invalid' };
  Object.assign(checks, await collectServiceHealth()); printChecks(checks);
  if (Object.values(checks).some((result) => !result.ok)) { console.error('Demo health: FAIL'); process.exitCode = 1; } else console.log('Demo health: PASS');
}
async function main() {
  const command = (process.argv[2] || 'status').toLowerCase();
  if (command === 'start') return startDemo();
  if (command === 'stop') return stopDemo();
  if (command === 'status') return statusDemo();
  if (command === 'health') return healthDemo();
  throw new Error(`Unknown demo runtime command: ${command}`);
}
main().catch((error) => { console.error(`Demo runtime failed: ${error.message}`); process.exitCode = 1; });
