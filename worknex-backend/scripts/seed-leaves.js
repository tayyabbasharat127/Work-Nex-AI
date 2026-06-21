/**
 * WorkNex — Seed Leaves + Trigger ETL
 * Run after restarting backend: node seed-leaves.js
 */
const API = 'http://localhost:5000/api/v1';
const ADMIN_EMAIL    = 'tbasharat804@gmail.com';
const ADMIN_PASSWORD = 'tayyab123@GMAIL';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pad2  = (n)   => String(n).padStart(2,'0');
const dateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const daysAgo = (n) => { const d=new Date(); d.setDate(d.getDate()-n); return d; };

const LEAVE_TYPES   = ['ANNUAL','SICK','CASUAL'];
const LEAVE_REASONS = [
  'Family function','Medical appointment','Personal work','Vacation trip',
  'Child care','Wedding ceremony','Medical emergency','Sick with flu',
  'Dental surgery','Exam preparation','Religious festival','Home renovation',
];

const post = async (path, body, token) => {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  return { ok: r.ok, data: j.data ?? j, status: r.status };
};

const put = async (path, body, token) => {
  const r = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.ok;
};

(async () => {
  console.log('\n── Step 1: Admin login ──');
  const loginRes = await fetch(`${API}/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginJson = await loginRes.json();
  if (!loginJson.data?.accessToken) { console.error('Login failed:', loginJson.message); process.exit(1); }
  const adminToken = loginJson.data.accessToken;
  console.log('  ✔ Admin logged in');

  console.log('\n── Step 2: Fetch all users ──');
  const usersRes = await fetch(`${API}/users`, { headers:{ Authorization:`Bearer ${adminToken}` }});
  const usersJson = await usersRes.json();
  const users = Array.isArray(usersJson.data) ? usersJson.data : (usersJson.data?.users || []);
  const seedUsers = users.filter(u => u.email.includes('@worknex-demo.com'));
  console.log(`  ✔ Found ${seedUsers.length} seeded users`);

  console.log('\n── Step 3: Apply + approve leaves ──');
  let leaveCount = 0, approvedCount = 0;

  for (const user of seedUsers) {
    let userToken;
    try {
      const r = await fetch(`${API}/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: user.email, password: 'WorkNex@2025' }),
      });
      const j = await r.json();
      userToken = j.data?.accessToken;
    } catch { continue; }
    if (!userToken) continue;

    const numLeaves = rand(2,3);
    for (let i = 0; i < numLeaves; i++) {
      const startOffset = rand(10, 150);
      const duration    = rand(1, 4);
      const start = daysAgo(startOffset);
      const end   = new Date(start); end.setDate(end.getDate() + duration - 1);
      if (start > new Date()) continue;

      const { ok, data } = await post('/leave', {
        leaveType: pick(LEAVE_TYPES),
        startDate: dateStr(start),
        endDate:   dateStr(end),
        totalDays: duration,
        reason:    pick(LEAVE_REASONS),
      }, userToken);

      if (ok && data?.id) {
        leaveCount++;
        const action = rand(1,10);
        if (action <= 7) {
          const approved = await put(`/leave/${data.id}/approve`, { note:'Approved' }, adminToken);
          if (approved) approvedCount++;
        } else if (action <= 9) {
          await put(`/leave/${data.id}/reject`, { note:'Rejected' }, adminToken);
        }
      }
      await sleep(60);
    }
    process.stdout.write(`\r  ✔  Leaves: ${leaveCount} created, ${approvedCount} approved...`);
  }
  console.log(`\n  ✔  Done: ${leaveCount} leave requests, ${approvedCount} approved`);

  console.log('\n── Step 4: Generate absences ──');
  const abRes = await post('/attendance/generate-absences', {}, adminToken);
  console.log('  ✔ Absences:', abRes.ok ? 'Generated' : abRes.data?.message);

  await sleep(2000);

  console.log('\n── Step 5: Trigger ETL ──');
  const etlRes = await post('/analytics/etl/run', {}, adminToken);
  console.log('  ✔ ETL:', etlRes.ok ? 'Triggered successfully' : etlRes.data?.message);

  console.log('\n  All done! Wait ~30 seconds then refresh analytics in the dashboard.\n');
})();
