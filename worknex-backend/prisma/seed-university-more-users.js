/**
 * Adds more Faculty (and a couple of Registrar-office Admin staff) to the
 * already-seeded DSU University org, without touching existing users' leave
 * requests or balances. Safe to run against a live backend — pure additive
 * upserts by email.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD;
if (!SEED_PASSWORD) throw new Error('SEED_USER_PASSWORD is required');

const d = (y, m, day) => new Date(y, m - 1, day);
const dt = (y, m, day, h, min) => new Date(y, m - 1, day, h, min, 0);
const isWeekend = (date) => [0, 6].includes(date.getDay());
const hash = (pw) => bcrypt.hash(pw, 10);

const moreFaculty = {
  'Computer Science': [
    { id: 'DSU-106', fn: 'Rida', ln: 'Fatima', email: 'rida.fatima@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 8, 1) },
    { id: 'DSU-107', fn: 'Hassan', ln: 'Zafar', email: 'hassan.zafar@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 1, 15) },
    { id: 'DSU-108', fn: 'Komal', ln: 'Shahid', email: 'komal.shahid@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 9, 1) },
    { id: 'DSU-109', fn: 'Adeel', ln: 'Ashraf', email: 'adeel.ashraf@dsu.edu.pk', desig: 'Associate Professor', joined: d(2020, 8, 1) },
    { id: 'DSU-110', fn: 'Mehak', ln: 'Yousaf', email: 'mehak.yousaf@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 3, 1) },
    { id: 'DSU-111', fn: 'Saad', ln: 'Kamal', email: 'saad.kamal@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 6, 15) },
    { id: 'DSU-112', fn: 'Anum', ln: 'Tariq', email: 'anum.tariq@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 9, 1) },
    { id: 'DSU-113', fn: 'Owais', ln: 'Hanif', email: 'owais.hanif@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 10, 1) },
  ],
  'Business Administration': [
    { id: 'DSU-206', fn: 'Nimra', ln: 'Sultan', email: 'nimra.sultan@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 2, 1) },
    { id: 'DSU-207', fn: 'Faizan', ln: 'Rasheed', email: 'faizan.rasheed@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 5, 1) },
    { id: 'DSU-208', fn: 'Sobia', ln: 'Anjum', email: 'sobia.anjum@dsu.edu.pk', desig: 'Associate Professor', joined: d(2019, 9, 1) },
    { id: 'DSU-209', fn: 'Yasir', ln: 'Naveed', email: 'yasir.naveed@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 7, 1) },
    { id: 'DSU-210', fn: 'Alishba', ln: 'Aftab', email: 'alishba.aftab@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 8, 15) },
    { id: 'DSU-211', fn: 'Zubair', ln: 'Hameed', email: 'zubair.hameed@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 4, 1) },
    { id: 'DSU-212', fn: 'Warda', ln: 'Ilyas', email: 'warda.ilyas@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 3, 1) },
    { id: 'DSU-213', fn: 'Noman', ln: 'Aziz', email: 'noman.aziz@dsu.edu.pk', desig: 'Associate Professor', joined: d(2020, 6, 1) },
  ],
  'Electrical Engineering': [
    { id: 'DSU-306', fn: 'Wania', ln: 'Sarwar', email: 'wania.sarwar@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 5, 1) },
    { id: 'DSU-307', fn: 'Ali', ln: 'Hyder', email: 'ali.hyder@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 2, 1) },
    { id: 'DSU-308', fn: 'Farwa', ln: 'Nasir', email: 'farwa.nasir@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 8, 1) },
    { id: 'DSU-309', fn: 'Haris', ln: 'Saleem', email: 'haris.saleem@dsu.edu.pk', desig: 'Associate Professor', joined: d(2019, 8, 1) },
    { id: 'DSU-310', fn: 'Rimsha', ln: 'Ghaffar', email: 'rimsha.ghaffar@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 1, 1) },
    { id: 'DSU-311', fn: 'Zain', ln: 'Abbas', email: 'zain.abbas@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 6, 1) },
    { id: 'DSU-312', fn: 'Sidra', ln: 'Younis', email: 'sidra.younis@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 9, 15) },
    { id: 'DSU-313', fn: 'Umer', ln: 'Farooqi', email: 'umer.farooqi@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 11, 1) },
  ],
  'Social Sciences': [
    { id: 'DSU-406', fn: 'Iman', ln: 'Zahid', email: 'iman.zahid@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 3, 15) },
    { id: 'DSU-407', fn: 'Bilawal', ln: 'Ghous', email: 'bilawal.ghous@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 4, 1) },
    { id: 'DSU-408', fn: 'Aiza', ln: 'Rafiq', email: 'aiza.rafiq@dsu.edu.pk', desig: 'Associate Professor', joined: d(2020, 9, 1) },
    { id: 'DSU-409', fn: 'Taha', ln: 'Munir', email: 'taha.munir@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 6, 1) },
    { id: 'DSU-410', fn: 'Eman', ln: 'Saqib', email: 'eman.saqib@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 7, 1) },
    { id: 'DSU-411', fn: 'Haseeb', ln: 'Chaudhry', email: 'haseeb.chaudhry@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 10, 15) },
    { id: 'DSU-412', fn: 'Mariam', ln: 'Idrees', email: 'mariam.idrees@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 10, 1) },
    { id: 'DSU-413', fn: 'Saif', ln: 'Rauf', email: 'saif.rauf@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 12, 1) },
  ],
};

const registrarOfficeStaff = [
  { id: 'DSU-501', fn: 'Sumaira', ln: 'Bano', email: 'sumaira.bano@dsu.edu.pk', desig: 'Admissions Officer', joined: d(2021, 3, 1) },
  { id: 'DSU-502', fn: 'Kamal', ln: 'Uddin', email: 'kamal.uddin@dsu.edu.pk', desig: 'Examinations Officer', joined: d(2020, 11, 1) },
  { id: 'DSU-503', fn: 'Nusrat', ln: 'Jehan', email: 'nusrat.jehan@dsu.edu.pk', desig: 'Accounts Officer', joined: d(2019, 5, 1) },
];

async function main() {
  console.log('\n👥 Adding more DSU University users...\n');

  const org = await prisma.organization.findUnique({ where: { slug: 'dsu-university' } });
  if (!org) throw new Error('DSU University org not found — run prisma/seed-university.js first.');

  const depts = {};
  for (const name of Object.keys(moreFaculty)) {
    depts[name] = await prisma.department.findFirstOrThrow({ where: { organizationId: org.id, name } });
  }

  const registrarRole = await prisma.role.findFirstOrThrow({ where: { organizationId: org.id, name: 'Registrar' } });
  const hodRole = await prisma.role.findFirstOrThrow({ where: { organizationId: org.id, name: 'HOD' } });
  const facultyRole = await prisma.role.findFirstOrThrow({ where: { organizationId: org.id, name: 'Faculty' } });
  const registrar = await prisma.user.findFirstOrThrow({ where: { organizationId: org.id, roleId: registrarRole.id } });

  const hods = {};
  for (const name of Object.keys(moreFaculty)) {
    hods[name] = await prisma.user.findFirstOrThrow({ where: { organizationId: org.id, departmentId: depts[name].id, roleId: hodRole.id } });
  }

  const pw = await hash(SEED_PASSWORD);
  const newUsers = [];

  for (const [deptName, list] of Object.entries(moreFaculty)) {
    for (const f of list) {
      const user = await prisma.user.upsert({
        where: { email: f.email },
        update: {},
        create: {
          organizationId: org.id, employeeId: f.id, firstName: f.fn, lastName: f.ln,
          email: f.email, passwordHash: pw, roleId: facultyRole.id,
          managerId: hods[deptName].id, departmentId: depts[deptName].id, designation: f.desig,
          joiningDate: f.joined, phone: `+92-300-4${f.id.split('-')[1]}`,
        },
      });
      newUsers.push(user);
    }
  }

  for (const s of registrarOfficeStaff) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        organizationId: org.id, employeeId: s.id, firstName: s.fn, lastName: s.ln,
        email: s.email, passwordHash: pw, roleId: facultyRole.id,
        managerId: registrar.id, departmentId: depts['Business Administration'].id, designation: s.desig,
        joiningDate: s.joined, phone: `+92-300-5${s.id.split('-')[1]}`,
      },
    });
    newUsers.push(user);
  }

  console.log(`   ✓ ${newUsers.length} new users created/verified`);

  // Leave balances for the new users (same policies as everyone else)
  const year = new Date().getFullYear();
  const policies = await prisma.leavePolicy.findMany({ where: { organizationId: org.id } });
  for (const user of newUsers) {
    for (const policy of policies) {
      await prisma.leaveBalance.upsert({
        where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year } },
        update: {},
        create: { organizationId: org.id, userId: user.id, policyId: policy.id, year, totalDays: policy.totalDays, usedDays: 0, remainingDays: policy.totalDays },
      });
    }
  }
  console.log('   ✓ leave balances initialized');

  // Attendance for the same ~2-month window as the original seed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendanceStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  let attendanceCount = 0;
  for (const user of newUsers) {
    const pat = { late: 0.05, absent: 0.02, half: 0.02 };
    const cur = new Date(attendanceStart);
    while (cur <= today) {
      const date = new Date(cur);
      cur.setDate(cur.getDate() + 1);
      if (isWeekend(date) || date >= today) continue;

      const rand = Math.random();
      let status = 'PRESENT';
      let checkInHour = 8, checkInMin = Math.floor(Math.random() * 20);
      let checkOutHour = 16, checkOutMin = Math.floor(Math.random() * 60);
      let workingHours = 8 + (Math.random() * 1 - 0.5);

      if (rand < pat.absent) {
        status = 'ABSENT'; checkInHour = null; checkInMin = null; checkOutHour = null; checkOutMin = null; workingHours = 0;
      } else if (rand < pat.absent + pat.half) {
        status = 'HALF_DAY'; checkInHour = 8; checkInMin = 10; checkOutHour = 12; checkOutMin = 0; workingHours = 4;
      } else if (rand < pat.absent + pat.half + pat.late) {
        status = 'LATE'; checkInHour = 8; checkInMin = 35 + Math.floor(Math.random() * 60);
        if (checkInMin >= 60) { checkInHour = 9; checkInMin -= 60; }
        workingHours = 7 + Math.random();
      }

      const y = date.getFullYear(), m = date.getMonth() + 1, day = date.getDate();
      const checkIn = status !== 'ABSENT' ? dt(y, m, day, checkInHour, checkInMin) : null;
      const checkOut = status !== 'ABSENT' ? dt(y, m, day, checkOutHour, checkOutMin) : null;

      try {
        await prisma.attendance.upsert({
          where: { userId_date: { userId: user.id, date } },
          update: {},
          create: {
            organizationId: org.id, userId: user.id, date, checkIn, checkOut, status,
            workingHours: status !== 'ABSENT' ? parseFloat(workingHours.toFixed(2)) : 0,
            source: Math.random() > 0.3 ? 'TMS_SYNC' : 'MANUAL',
          },
        });
        attendanceCount++;
      } catch {}
    }
  }
  console.log(`   ✓ ${attendanceCount} attendance records created`);

  console.log('\n✅ Added more users to DSU University. Password supplied through SEED_USER_PASSWORD.\n');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
