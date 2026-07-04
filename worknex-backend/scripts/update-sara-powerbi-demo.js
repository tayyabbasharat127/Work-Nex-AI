#!/usr/bin/env node

/**
 * Updates Sara Malik with obvious demo rows for validating Power BI refreshes.
 *
 * Usage:
 *   node scripts/update-sara-powerbi-demo.js
 *   node scripts/export-powerbi-csv.js
 */

const prisma = require('../src/config/db');

const SARA_EMAIL = 'sara.malik@novapay.pk';
const DEMO_REASON = 'POWERBI_DEMO_SARA_REFRESH_MARKER';

const dayOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const atTime = (date, hour, minute) => {
  const value = dayOnly(date);
  value.setHours(hour, minute, 0, 0);
  return value;
};

const recentBusinessDays = (count) => {
  const days = [];
  const cursor = dayOnly(new Date());
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
};

async function run() {
  const sara = await prisma.user.findUnique({
    where: { email: SARA_EMAIL },
    include: { department: true },
  });

  if (!sara) {
    throw new Error(`Could not find seeded user ${SARA_EMAIL}. Run prisma seed first.`);
  }

  await prisma.user.update({
    where: { id: sara.id },
    data: {
      designation: 'HR Director - Power BI Demo Marker',
      phone: '+92-300-9990202',
    },
  });

  const scenarios = [
    { status: 'PRESENT', inHour: 8, inMin: 45, outHour: 17, outMin: 35, hours: 8.8 },
    { status: 'LATE', inHour: 10, inMin: 20, outHour: 17, outMin: 10, hours: 6.8 },
    { status: 'ABSENT', inHour: null, inMin: null, outHour: null, outMin: null, hours: 0 },
    { status: 'HALF_DAY', inHour: 9, inMin: 15, outHour: 13, outMin: 5, hours: 3.8 },
    { status: 'PRESENT', inHour: 8, inMin: 50, outHour: 18, outMin: 0, hours: 9.1 },
    { status: 'LATE', inHour: 10, inMin: 5, outHour: 17, outMin: 20, hours: 7.2 },
    { status: 'PRESENT', inHour: 8, inMin: 58, outHour: 17, outMin: 45, hours: 8.6 },
  ];

  const days = recentBusinessDays(scenarios.length);
  for (const [index, date] of days.entries()) {
    const item = scenarios[index];
    await prisma.attendance.upsert({
      where: { userId_date: { userId: sara.id, date } },
      update: {
        organizationId: sara.organizationId,
        checkIn: item.status === 'ABSENT' ? null : atTime(date, item.inHour, item.inMin),
        checkOut: item.status === 'ABSENT' ? null : atTime(date, item.outHour, item.outMin),
        status: item.status,
        workingHours: item.hours,
        source: 'POWERBI_DEMO',
        notes: DEMO_REASON,
      },
      create: {
        organizationId: sara.organizationId,
        userId: sara.id,
        date,
        checkIn: item.status === 'ABSENT' ? null : atTime(date, item.inHour, item.inMin),
        checkOut: item.status === 'ABSENT' ? null : atTime(date, item.outHour, item.outMin),
        status: item.status,
        workingHours: item.hours,
        source: 'POWERBI_DEMO',
        notes: DEMO_REASON,
      },
    });
  }

  const now = new Date();
  await prisma.performanceRecord.upsert({
    where: { userId_month_year: { userId: sara.id, month: now.getMonth() + 1, year: now.getFullYear() } },
    update: {
      organizationId: sara.organizationId,
      presentDays: 4,
      absentDays: 1,
      lateDays: 2,
      leaveDays: 1,
      avgWorkingHours: 6.72,
      attendanceScore: 57.1,
      leaveScore: 85,
      punctualityScore: 71.4,
      overallScore: 64.2,
      mlPredictedScore: 66.6,
    },
    create: {
      organizationId: sara.organizationId,
      userId: sara.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      presentDays: 4,
      absentDays: 1,
      lateDays: 2,
      leaveDays: 1,
      avgWorkingHours: 6.72,
      attendanceScore: 57.1,
      leaveScore: 85,
      punctualityScore: 71.4,
      overallScore: 64.2,
      mlPredictedScore: 66.6,
    },
  });

  await prisma.leaveRequest.deleteMany({
    where: { employeeId: sara.id, reason: DEMO_REASON },
  });

  const leaveStart = new Date(now);
  leaveStart.setDate(now.getDate() + 3);
  const leaveEnd = new Date(leaveStart);
  leaveEnd.setDate(leaveStart.getDate() + 2);

  await prisma.leaveRequest.create({
    data: {
      organizationId: sara.organizationId,
      employeeId: sara.id,
      leaveType: 'CASUAL',
      startDate: dayOnly(leaveStart),
      endDate: dayOnly(leaveEnd),
      totalDays: 3,
      reason: DEMO_REASON,
      status: 'PENDING',
    },
  });

  console.log('Updated Sara Malik Power BI demo data.');
  console.log(`Email: ${SARA_EMAIL}`);
  console.log('Look for designation: HR Director - Power BI Demo Marker');
  console.log('Look for attendance source/notes: POWERBI_DEMO / POWERBI_DEMO_SARA_REFRESH_MARKER');
  console.log(`Look for performance: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} overallScore=64.2`);
}

run()
  .catch((err) => {
    console.error('Sara Power BI demo update failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
