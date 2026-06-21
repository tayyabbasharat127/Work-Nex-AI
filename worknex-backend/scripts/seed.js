/**
 * WorkNex AI — End-to-End Seed Script
 * ─────────────────────────────────────
 * Creates departments, managers, employees, 6 months of attendance,
 * leave requests (pending + approved + rejected), performance data,
 * then triggers ETL so analytics, AI models and forecasts have data.
 *
 * Usage:
 *   node seed.js
 *
 * Requires:
 *   - Backend running at http://localhost:5000
 *   - An existing admin account (set ADMIN_EMAIL / ADMIN_PASSWORD below)
 */

const API = 'http://localhost:5000/api/v1';

// ── Config ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'tbasharat804@gmail.com';
const ADMIN_PASSWORD = 'tayyab123@GMAIL';     // ← change if different

// ── Helpers ───────────────────────────────────────────────────────────────────
let adminToken = '';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const api = async (method, path, body, token = adminToken) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${json.message || JSON.stringify(json)}`);
  return json.data ?? json;
};

const log  = (msg)       => console.log(`  ✔  ${msg}`);
const info = (msg)       => console.log(`\n── ${msg} ──`);
const warn = (msg)       => console.warn(`  ⚠  ${msg}`);

const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = (arr)      => arr[rand(0, arr.length - 1)];
const pad2  = (n)        => String(n).padStart(2, '0');

// Date helpers
const dateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomTime(hourMin, hourMax, minuteMin = 0, minuteMax = 59) {
  const h = rand(hourMin, hourMax);
  const m = rand(minuteMin, minuteMax);
  return `${pad2(h)}:${pad2(m)}`;
}

// ── Master Data ───────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Engineering',               description: 'Software development and architecture' },
  { name: 'Human Resources',           description: 'Recruitment, culture, and people ops' },
  { name: 'Finance & Accounting',      description: 'Budgeting, payroll, and financial reporting' },
  { name: 'Sales',                     description: 'Revenue generation and client acquisition' },
  { name: 'Marketing',                 description: 'Brand, digital and content marketing' },
  { name: 'Operations',                description: 'Process optimization and logistics' },
  { name: 'Customer Support',          description: 'Client success and helpdesk' },
  { name: 'Product Management',        description: 'Roadmap, discovery and delivery' },
  { name: 'Legal & Compliance',        description: 'Contracts, risk and regulatory' },
  { name: 'Research & Development',    description: 'Innovation labs and prototyping' },
  { name: 'Data & Analytics',          description: 'BI, reporting and data engineering' },
  { name: 'Infrastructure & DevOps',   description: 'Cloud, CI/CD and platform reliability' },
  { name: 'Quality Assurance',         description: 'Testing, automation and QA processes' },
  { name: 'Business Development',      description: 'Partnerships and market expansion' },
  { name: 'Design & UX',              description: 'User experience and visual design' },
];

const FIRST_NAMES = [
  'Ali','Sara','Omar','Fatima','Hassan','Ayesha','Bilal','Zara','Usman','Hina',
  'Ahmed','Maria','Faisal','Sana','Rahul','Priya','James','Emily','David','Sofia',
  'Zain','Nadia','Kamran','Alina','Tariq','Mehak','Imran','Sadia','Omer','Layla',
  'Asad','Rida','Waqar','Maham','Junaid','Amna','Hamza','Iqra','Salman','Nimra',
];
const LAST_NAMES = [
  'Khan','Ahmed','Ali','Malik','Hussain','Sheikh','Butt','Awan','Chaudhry','Raza',
  'Mirza','Qureshi','Siddiqui','Shah','Baig','Ansari','Hashmi','Abbasi','Zaidi','Rizvi',
  'Patel','Sharma','Kumar','Singh','Verma','Gupta','Nair','Menon','Reddy','Rao',
];
const DESIGNATIONS = {
  MANAGER:  ['Senior Manager','Team Lead','Department Head','Group Manager','Division Lead'],
  EMPLOYEE: ['Senior Engineer','Junior Developer','Analyst','Associate','Specialist','Coordinator','Executive','Officer'],
};

const LEAVE_TYPES   = ['ANNUAL','SICK','CASUAL'];
const LEAVE_REASONS = [
  'Family function', 'Medical appointment', 'Personal work', 'Vacation trip',
  'Child care', 'Wedding ceremony', 'Medical emergency', 'Home renovation',
  'Exam preparation', 'Religious festival', 'Sick with flu', 'Dental surgery',
];

let empCounter = 1000;
const nextEmpId = () => `EMP-${++empCounter}`;

// ── Step 1: Login ─────────────────────────────────────────────────────────────
async function login() {
  info('Logging in as Admin');
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  if (!res.ok || !json.data?.accessToken) {
    throw new Error(`Login failed: ${json.message}. Check ADMIN_EMAIL/ADMIN_PASSWORD in seed.js`);
  }
  adminToken = json.data.accessToken;
  log(`Logged in — token acquired`);
  return json.data.user;
}

// ── Step 2: Departments ───────────────────────────────────────────────────────
async function createDepartments() {
  info('Creating Departments');
  const deptMap = {};

  // Fetch existing
  const existing = await api('GET', '/users/departments/all');
  const existingNames = new Set((Array.isArray(existing) ? existing : existing?.departments || []).map(d => d.name));

  for (const dept of DEPARTMENTS) {
    if (existingNames.has(dept.name)) {
      const found = (Array.isArray(existing) ? existing : existing?.departments || []).find(d => d.name === dept.name);
      deptMap[dept.name] = found.id;
      warn(`Dept already exists: ${dept.name}`);
      continue;
    }
    try {
      const created = await api('POST', '/users/departments', dept);
      deptMap[dept.name] = created.id;
      log(`Dept: ${dept.name}`);
    } catch (e) {
      warn(`Failed dept ${dept.name}: ${e.message}`);
    }
    await sleep(100);
  }
  return deptMap;
}

// ── Step 3: Users ─────────────────────────────────────────────────────────────
async function createUsers(deptMap) {
  info('Creating Managers & Employees');
  const allUsers = [];
  const usedEmails = new Set();
  const usedEmpIds = new Set();

  const makeEmail = (first, last, idx) => {
    const base = `${first.toLowerCase()}.${last.toLowerCase()}${idx}@worknex-demo.com`;
    return base;
  };

  for (const [deptName, deptId] of Object.entries(deptMap)) {
    // 1 Manager + 3 Employees per dept
    const roles = ['MANAGER', 'EMPLOYEE', 'EMPLOYEE', 'EMPLOYEE'];

    let deptManager = null;

    for (const role of roles) {
      const firstName = pick(FIRST_NAMES);
      const lastName  = pick(LAST_NAMES);
      const idx       = rand(1, 999);
      const email     = makeEmail(firstName, lastName, idx);

      if (usedEmails.has(email)) continue;
      usedEmails.add(email);

      const empId = nextEmpId();
      if (usedEmpIds.has(empId)) continue;
      usedEmpIds.add(empId);

      const payload = {
        firstName,
        lastName,
        email,
        employeeId:  empId,
        role,
        password:    'WorkNex@2025',
        departmentId: deptId,
        designation: pick(DESIGNATIONS[role]),
        joiningDate: dateStr(daysAgo(rand(180, 730))),
        ...(role === 'EMPLOYEE' && deptManager ? { managerId: deptManager.id } : {}),
      };

      try {
        const user = await api('POST', '/users', payload);
        allUsers.push({ ...user, role, deptName, deptId, token: null });
        if (role === 'MANAGER') deptManager = user;
        log(`${role.padEnd(8)} ${firstName} ${lastName} → ${deptName}`);
      } catch (e) {
        warn(`Skip ${email}: ${e.message}`);
      }
      await sleep(120);
    }
  }

  log(`\nTotal users created: ${allUsers.length}`);
  return allUsers;
}

// ── Step 4: Attendance (6 months) ────────────────────────────────────────────
async function seedAttendance(users) {
  info('Seeding 6 months of Attendance records');
  const today    = new Date();
  const sixMonthsAgo = daysAgo(180);

  let total = 0;

  for (const user of users) {
    const current = new Date(sixMonthsAgo);

    while (current <= today) {
      if (isWeekend(current)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const roll = rand(1, 100);
      let status, checkIn, checkOut;

      if (roll <= 10) {
        // ABSENT — no check-in
        status   = 'ABSENT';
        checkIn  = null;
        checkOut = null;
      } else if (roll <= 18) {
        // LATE — check-in after 9:30
        status   = 'LATE';
        checkIn  = randomTime(9, 11, 31, 59);
        checkOut = randomTime(17, 19);
      } else if (roll <= 23) {
        // ON_LEAVE — handled by leave requests, skip
        current.setDate(current.getDate() + 1);
        continue;
      } else {
        // PRESENT
        status   = 'PRESENT';
        checkIn  = randomTime(8, 9, 0, 30);
        checkOut = randomTime(17, 19);
      }

      const attendanceDate = dateStr(current);

      const buildTime = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':');
        const d = new Date(current);
        d.setHours(parseInt(h), parseInt(m), 0, 0);
        return d.toISOString();
      };

      const checkInISO  = buildTime(checkIn);
      const checkOutISO = buildTime(checkOut);

      const workingHours = (checkInISO && checkOutISO)
        ? Math.round(((new Date(checkOutISO) - new Date(checkInISO)) / 3600000) * 10) / 10
        : null;

      try {
        await api('POST', '/attendance/manual', {
          userId:       user.id,
          date:         attendanceDate,
          checkIn:      checkInISO,
          checkOut:     checkOutISO,
          status,
          workingHours,
          source:       'MANUAL',
          notes:        'Seeded by setup script',
        });
        total++;
      } catch (e) {
        // Ignore duplicate date conflicts
      }

      current.setDate(current.getDate() + 1);
    }

    process.stdout.write(`\r  ✔  Attendance seeded for ${total} records...`);
    await sleep(50);
  }
  console.log(`\n  ✔  Total attendance records: ${total}`);
}

// ── Step 5: Leave Requests ────────────────────────────────────────────────────
async function seedLeaves(users) {
  info('Seeding Leave Requests');

  // Login each user briefly — instead, use admin to create on behalf
  // We'll use the leave API which requires user token, so we login per user
  // For efficiency, we'll create with admin impersonation via manual DB-style POST
  // Actually the backend only allows users to apply their own leaves, so let's
  // login as each user quickly

  let leaveCount = 0;

  for (const user of users) {
    // Login as this user
    let userToken;
    try {
      const loginRes = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'WorkNex@2025' }),
      });
      const loginJson = await loginRes.json();
      userToken = loginJson.data?.accessToken;
    } catch {
      continue;
    }

    if (!userToken) continue;

    // Apply 2-3 leaves per user
    const numLeaves = rand(2, 3);
    for (let i = 0; i < numLeaves; i++) {
      const startOffset = rand(5, 160);
      const duration    = rand(1, 5);
      const startDate   = daysAgo(startOffset);
      const endDate     = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration - 1);

      // Skip if start is in future
      if (startDate > new Date()) continue;

      try {
        const leave = await api('POST', '/leave', {
          leaveType:  pick(LEAVE_TYPES),
          startDate:  dateStr(startDate),
          endDate:    dateStr(endDate),
          totalDays:  duration,
          reason:     pick(LEAVE_REASONS),
        }, userToken);

        leaveCount++;

        // Randomly approve or reject (70% approved, 20% rejected, 10% pending)
        const action = rand(1, 10);
        if (action <= 7) {
          try {
            await api('PUT', `/leave/${leave.id}/approve`, { note: 'Approved by manager' }, adminToken);
          } catch { /* ignore */ }
        } else if (action <= 9) {
          try {
            await api('PUT', `/leave/${leave.id}/reject`, { note: 'Rejected due to project deadline' }, adminToken);
          } catch { /* ignore */ }
        }
        // else leave as PENDING
      } catch { /* ignore date conflicts */ }

      await sleep(80);
    }

    process.stdout.write(`\r  ✔  Leave requests: ${leaveCount}`);
  }
  console.log(`\n  ✔  Total leave records: ${leaveCount}`);
}

// ── Step 6: Holidays ─────────────────────────────────────────────────────────
async function seedHolidays() {
  info('Seeding Company Holidays');
  const year = new Date().getFullYear();
  const holidays = [
    { name: 'Pakistan Day',          date: `${year}-03-23` },
    { name: 'Labour Day',            date: `${year}-05-01` },
    { name: 'Independence Day',      date: `${year}-08-14` },
    { name: 'Iqbal Day',             date: `${year}-11-09` },
    { name: 'Christmas Day',         date: `${year}-12-25` },
    { name: 'New Year Day',          date: `${year+1}-01-01` },
    { name: 'Eid ul Fitr',           date: `${year}-04-10`, description: 'Subject to moon sighting' },
    { name: 'Eid ul Adha',           date: `${year}-06-17`, description: 'Subject to moon sighting' },
  ];

  for (const h of holidays) {
    try {
      await api('POST', '/attendance/holidays', h);
      log(`Holiday: ${h.name} (${h.date})`);
    } catch { warn(`Holiday exists or failed: ${h.name}`); }
    await sleep(100);
  }
}

// ── Step 7: Trigger ETL ───────────────────────────────────────────────────────
async function triggerETL() {
  info('Triggering ETL Pipeline (builds analytics + AI training data)');
  try {
    const result = await api('POST', '/analytics/etl/run', {});
    log(`ETL triggered: ${JSON.stringify(result).slice(0, 120)}`);
  } catch (e) {
    warn(`ETL trigger: ${e.message}`);
  }
  await sleep(3000);
}

// ── Step 8: Generate Absences ────────────────────────────────────────────────
async function generateAbsences() {
  info('Generating absence records for unmarked days');
  try {
    const result = await api('POST', '/attendance/generate-absences', {});
    log(`Absences generated: ${JSON.stringify(result).slice(0, 120)}`);
  } catch (e) {
    warn(`Generate absences: ${e.message}`);
  }
}

// ── Step 9: Summary ───────────────────────────────────────────────────────────
function printSummary(users, deptMap) {
  const managers  = users.filter(u => u.role === 'MANAGER');
  const employees = users.filter(u => u.role === 'EMPLOYEE');

  console.log(`
╔══════════════════════════════════════════════════╗
║           WorkNex Seed — Complete                ║
╠══════════════════════════════════════════════════╣
║  Departments : ${String(Object.keys(deptMap).length).padEnd(32)} ║
║  Managers    : ${String(managers.length).padEnd(32)} ║
║  Employees   : ${String(employees.length).padEnd(32)} ║
║  Total Users : ${String(users.length).padEnd(32)} ║
╠══════════════════════════════════════════════════╣
║  All user password: WorkNex@2025                 ║
╠══════════════════════════════════════════════════╣
║  What to test next:                              ║
║  1. Admin  → Analytics, ETL, Reports             ║
║  2. Manager→ Leaves approval, Team attendance    ║
║  3. Employee→ Apply leave, Check attendance      ║
║  4. AI Chatbot → Ask about attendance/leaves     ║
║  5. Forecast → See predictions                   ║
╚══════════════════════════════════════════════════╝
`);

  console.log('  Sample manager logins:');
  managers.slice(0, 5).forEach(u => {
    console.log(`    ${u.email.padEnd(42)} password: WorkNex@2025  dept: ${u.deptName}`);
  });
  console.log('\n  Sample employee logins:');
  employees.slice(0, 5).forEach(u => {
    console.log(`    ${u.email.padEnd(42)} password: WorkNex@2025  dept: ${u.deptName}`);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      WorkNex AI — End-to-End Seed Script         ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  try {
    await login();
    const deptMap  = await createDepartments();
    const users    = await createUsers(deptMap);

    if (users.length === 0) {
      console.error('\n✖ No users were created. Check admin credentials and backend connection.\n');
      process.exit(1);
    }

    await seedHolidays();
    await seedAttendance(users);
    await seedLeaves(users);
    await generateAbsences();
    await triggerETL();
    printSummary(users, deptMap);

  } catch (err) {
    console.error(`\n✖ Fatal: ${err.message}\n`);
    process.exit(1);
  }
})();
