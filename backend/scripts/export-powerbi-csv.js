/**
 * Export WorkNex data to CSV files for Power BI Desktop import
 * Run: node scripts/export-powerbi-csv.js
 * Output: exports/ folder with 4 CSV files
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const OUT_DIR = path.join(__dirname, '..', 'exports');

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] == null ? '' : String(row[h]);
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}

function write(filename, rows) {
  const csv = toCSV(rows);
  fs.writeFileSync(path.join(OUT_DIR, filename), csv, 'utf8');
  console.log(`  ✓ ${filename}  (${rows.length} rows)`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('\n[WorkNex → Power BI Export]\n');

  // ── Employees ─────────────────────────────────────────────────────────────
  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      designation: true,
      joiningDate: true,
      isActive: true,
      organizationId: true,
      department: { select: { name: true } },
    },
    take: 2000,
  });

  write('Employees.csv', employees.map((e) => ({
    UserId:         e.id,
    EmployeeId:     e.employeeId,
    FullName:       `${e.firstName} ${e.lastName}`,
    Email:          e.email,
    Role:           e.role,
    Designation:    e.designation || '',
    Department:     e.department?.name || 'Unassigned',
    JoiningDate:    e.joiningDate ? e.joiningDate.toISOString().slice(0, 10) : '',
    IsActive:       e.isActive,
    OrganizationId: e.organizationId,
  })));

  // ── Attendance (last 90 days) ──────────────────────────────────────────────
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const attendance = await prisma.attendance.findMany({
    where: { date: { gte: ninetyDaysAgo } },
    include: {
      user: { select: { firstName: true, lastName: true, organizationId: true, department: { select: { name: true } } } },
    },
    orderBy: { date: 'desc' },
    take: 5000,
  });

  write('Attendance.csv', attendance.map((a) => ({
    AttendanceId:   a.id,
    UserId:         a.userId,
    FullName:       `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim(),
    Date:           a.date?.toISOString().slice(0, 10),
    Status:         a.status,
    CheckIn:        a.checkIn  ? a.checkIn.toISOString()  : '',
    CheckOut:       a.checkOut ? a.checkOut.toISOString() : '',
    WorkingHours:   a.workingHours ?? 0,
    Department:     a.user?.department?.name || 'Unassigned',
    Source:         a.source || '',
    OrganizationId: a.user?.organizationId || '',
  })));

  // ── Leave Requests ─────────────────────────────────────────────────────────
  const leaves = await prisma.leaveRequest.findMany({
    include: {
      employee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  write('LeaveRequests.csv', leaves.map((l) => ({
    LeaveId:        l.id,
    EmployeeId:     l.employeeId,
    FullName:       `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim(),
    LeaveType:      l.leaveType,
    Status:         l.status,
    StartDate:      l.startDate?.toISOString().slice(0, 10),
    EndDate:        l.endDate?.toISOString().slice(0, 10),
    TotalDays:      l.totalDays ?? 0,
    Department:     l.employee?.department?.name || 'Unassigned',
    OrganizationId: l.organizationId,
    AppliedAt:      l.createdAt?.toISOString().slice(0, 10),
  })));

  // ── Performance Records ────────────────────────────────────────────────────
  const perf = await prisma.performanceRecord.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 3000,
  });

  write('Performance.csv', perf.map((p) => ({
    RecordId:        p.id,
    UserId:          p.userId,
    FullName:        `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
    Month:           p.month,
    Year:            p.year,
    AttendanceScore: p.attendanceScore ?? 0,
    LeaveScore:      p.leaveScore ?? 0,
    OverallScore:    p.overallScore ?? 0,
    PresentDays:     p.presentDays ?? 0,
    LateDays:        p.lateDays ?? 0,
    AbsentDays:      p.absentDays ?? 0,
    Department:      p.user?.department?.name || 'Unassigned',
    OrganizationId:  p.organizationId,
  })));

  console.log(`\nDone! Files saved to: ${OUT_DIR}\n`);
  console.log('Next steps:');
  console.log('  1. Open Power BI Desktop');
  console.log('  2. Get Data → Text/CSV → import each file');
  console.log('  3. Build your report → Save as WorkNex.pbix');
  console.log('  4. Publish to app.powerbi.com → File → Publish to web');
  console.log('  5. Copy embed URL → paste in frontend .env.local\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
