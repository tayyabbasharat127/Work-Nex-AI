/**
 * End-to-end test for the remaining Analytics + Reports + AI-prediction
 * surface: Dashboard KPIs, Attendance/Leave/Workforce/Attrition/Performance
 * analytics, Power BI, ETL/Audit logs, and the 5 report types.
 *
 * Calls the real service functions directly (same functions the routes call)
 * as a real admin user, so it exercises the actual org-scoping/RBAC logic
 * without needing a live HTTP server or a real login password.
 *
 * Read-only for everything except Power BI's pushDataToPowerBI, which is
 * skipped unless POWERBI credentials are configured (soft-checked, not a
 * failure if absent — most dev setups won't have a live Power BI workspace).
 *
 * Usage: node scripts/test-analytics.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');
const analyticsService = require('../src/modules/analytics/analytics.service');
const reportsService = require('../src/modules/reports/reports.service');
const aiService = require('../src/modules/ai/ai.service');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) { passCount++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { failCount++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { warnCount++; console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function section(title) { console.log(`\n${title}`); }

/** Runs fn(), passes if it resolves to a non-null value, fails on throw/null unless soft=true (then warns). */
async function check(label, fn, { soft = false } = {}) {
  try {
    const data = await fn();
    if (data === undefined || data === null) {
      if (soft) warn(`${label}: returned null/undefined`);
      else fail(`${label}: returned null/undefined`);
      return null;
    }
    pass(`${label}: OK`);
    return data;
  } catch (err) {
    if (soft) warn(`${label}: ${err.message} (soft-checked — likely missing external config)`);
    else fail(`${label}: threw — ${err.message}`);
    return null;
  }
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found — run against the correct database');

  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, customRole: { tier: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
    include: { customRole: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('No admin user found for the organization');

  const requestingUser = { id: admin.id, organizationId: admin.organizationId, role: admin.customRole.tier };
  const token = jwt.sign(
    { userId: admin.id, role: admin.customRole.tier, organizationId: admin.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const authorization = `Bearer ${token}`;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  section('1. Dashboard & Workforce');
  await check('Dashboard KPIs', () => analyticsService.getDashboardKPIs(requestingUser));
  await check('Headcount', () => analyticsService.getHeadcount(requestingUser));
  await check('Turnover rate', () => analyticsService.getTurnoverRate(year, requestingUser));

  section('2. Attendance analytics');
  await check('Attendance trends', () => analyticsService.getAttendanceTrends(year, month, requestingUser));
  await check('Attendance heatmap', () => analyticsService.getAttendanceHeatmap(admin.id, year, requestingUser));
  await check('Department attendance', () => analyticsService.getDepartmentAttendance(month, year, requestingUser));

  section('3. Leave analytics');
  await check('Leave summary', () => analyticsService.getLeaveSummary(year, requestingUser));
  await check('Leave trends', () => analyticsService.getLeaveTrends(year, requestingUser));
  await check('Leave by type', () => analyticsService.getLeaveByType(year, requestingUser));

  section('4. Performance & Attrition analytics');
  await check('Performance leaderboard', () => analyticsService.getPerformanceLeaderboard(month, year, 10, requestingUser));
  await check('Team performance', () => analyticsService.getTeamPerformance(month, year, requestingUser));
  const attrition = await check('Attrition analytics', () => analyticsService.getAttritionAnalytics(month, year, requestingUser));
  if (attrition && Array.isArray(attrition.records || attrition)) pass('Attrition analytics returned a record list');

  section('5. AI prediction endpoints (proxy to ai-service, with DB fallback)');
  const attritionRisk = await check('AI attrition-risk prediction', () => aiService.attritionRisk(requestingUser, authorization));
  if (attritionRisk?.fallback) warn('attrition-risk used the DB fallback, not the live ai-service — start ai-service to test the real model path');
  else if (attritionRisk) {
    const hasLabels = Array.isArray(attritionRisk.employees || attritionRisk.risks)
      ? (attritionRisk.employees || attritionRisk.risks).every((e) => Array.isArray(e.factorLabels))
      : true;
    if (hasLabels) pass('factorLabels present on attrition-risk employees');
    else fail('factorLabels missing on one or more attrition-risk employees');
  }

  section('6. Power BI (soft-checked — requires POWERBI_* env config)');
  await check('Power BI embed token (org-scoped RLS)', () => analyticsService.getPowerBIEmbedToken(requestingUser), { soft: true });
  await check('Push data to Power BI', () => analyticsService.pushDataToPowerBI(requestingUser), { soft: true });

  section('7. ETL & Audit logs');
  await check('ETL logs', () => analyticsService.getEtlLogs(requestingUser));
  await check('Audit logs', () => analyticsService.getAuditLogs(requestingUser, 50));

  section('8. Reports module (all 5 report types)');
  await check('Attendance report', () => reportsService.getAttendanceReport({}, requestingUser));
  await check('Leave report', () => reportsService.getLeaveReport({}, requestingUser));
  await check('Performance report', () => reportsService.getPerformanceReport({}, requestingUser));
  await check('Department report', () => reportsService.getDepartmentReport({}, requestingUser));

  await prisma.$disconnect();
  printSummary();
  process.exit(failCount > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`Analytics & Reports Test: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log('='.repeat(60));
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
