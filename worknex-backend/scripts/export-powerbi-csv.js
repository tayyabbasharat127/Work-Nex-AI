#!/usr/bin/env node

/**
 * Power BI CSV Export
 * Exports attendance, leave, performance, and headcount data to CSV files
 * for manual import into Power BI Desktop (Get Data → Text/CSV).
 *
 * Usage:
 *   node scripts/export-powerbi-csv.js
 */

const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/db');
const logger = require('../src/config/logger');

const EXPORT_DIR = path.join(__dirname, '..', 'exports');

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const writeCsv = (filename, rows) => {
  const filePath = path.join(EXPORT_DIR, filename);
  if (rows.length === 0) {
    fs.writeFileSync(filePath, '');
    return filePath;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ];
  fs.writeFileSync(filePath, lines.join('\n'));
  return filePath;
};

const exportAttendance = async () => {
  const records = await prisma.attendance.findMany({
    include: {
      user: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: { date: 'asc' },
  });

  return records.map((r) => ({
    employeeId: r.user.employeeId,
    employeeName: `${r.user.firstName} ${r.user.lastName}`,
    department: r.user.department?.name || '',
    date: r.date,
    status: r.status,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    workingHours: r.workingHours ?? '',
  }));
};

const exportLeave = async () => {
  const records = await prisma.leaveRequest.findMany({
    include: {
      employee: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: { startDate: 'asc' },
  });

  return records.map((r) => ({
    employeeId: r.employee.employeeId,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    department: r.employee.department?.name || '',
    leaveType: r.leaveType,
    startDate: r.startDate,
    endDate: r.endDate,
    totalDays: r.totalDays,
    status: r.status,
    appliedAt: r.appliedAt,
  }));
};

const exportPerformance = async () => {
  const records = await prisma.performanceRecord.findMany({
    include: {
      user: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  return records.map((r) => ({
    employeeId: r.user.employeeId,
    employeeName: `${r.user.firstName} ${r.user.lastName}`,
    department: r.user.department?.name || '',
    month: r.month,
    year: r.year,
    presentDays: r.presentDays,
    absentDays: r.absentDays,
    lateDays: r.lateDays,
    leaveDays: r.leaveDays,
    avgWorkingHours: r.avgWorkingHours,
    attendanceScore: r.attendanceScore,
    leaveScore: r.leaveScore,
    punctualityScore: r.punctualityScore,
    overallScore: r.overallScore,
  }));
};

const exportHeadcount = async () => {
  const users = await prisma.user.findMany({
    select: {
      employeeId: true,
      firstName: true,
      lastName: true,
      role: true,
      designation: true,
      isActive: true,
      joiningDate: true,
      department: { select: { name: true } },
    },
    orderBy: { joiningDate: 'asc' },
  });

  return users.map((u) => ({
    employeeId: u.employeeId,
    employeeName: `${u.firstName} ${u.lastName}`,
    department: u.department?.name || '',
    role: u.role,
    designation: u.designation || '',
    isActive: u.isActive,
    joiningDate: u.joiningDate,
  }));
};

const run = async () => {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const exporters = [
    { name: 'attendance.csv', fn: exportAttendance },
    { name: 'leave.csv', fn: exportLeave },
    { name: 'performance.csv', fn: exportPerformance },
    { name: 'headcount.csv', fn: exportHeadcount },
  ];

  for (const { name, fn } of exporters) {
    const rows = await fn();
    const filePath = writeCsv(name, rows);
    logger.info(`Exported ${rows.length} rows to ${filePath}`);
    console.log(`✅ ${name}: ${rows.length} rows -> ${filePath}`);
  }
};

run()
  .catch((err) => {
    logger.error('Power BI CSV export failed', { error: err.message });
    console.error('❌ Export failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
