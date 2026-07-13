/**
 * End-to-end test for AI-driven Leave Forecasting.
 *
 * Calls the real AI service (http://localhost:8000/predict/leave-forecast)
 * through aiService.leaveForecast() exactly the way a real dashboard request
 * would, using a freshly minted JWT (same signing secret as a real login) so
 * no hardcoded password is needed. Also sanity-checks the backend
 * /leave/history/daily-counts data that the AI service now seeds its
 * rolling-average baseline from.
 *
 * Read-only — makes no writes to the database.
 *
 * Usage: node scripts/test-leave-forecast.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');
const aiService = require('../src/modules/ai/ai.service');
const leaveService = require('../src/modules/leave/leave.service');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) { passCount++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { failCount++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { warnCount++; console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function section(title) { console.log(`\n${title}`); }

function mintToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.customRole.tier, organizationId: user.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
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
  const token = mintToken(admin);

  section('1. Daily leave-count baseline endpoint (/leave/history/daily-counts)');
  let dailyCounts;
  try {
    dailyCounts = await leaveService.getDailyLeaveCounts(requestingUser, 14);
    if (Array.isArray(dailyCounts) && dailyCounts.length === 14) {
      pass(`Returned 14 daily entries`);
    } else {
      fail(`Expected 14 entries, got ${Array.isArray(dailyCounts) ? dailyCounts.length : typeof dailyCounts}`);
    }
    const shapeOk = Array.isArray(dailyCounts) && dailyCounts.every((d) => typeof d.date === 'string' && typeof d.count === 'number');
    if (shapeOk) pass('Every entry has {date, count} shape');
    else fail('Some entries missing date/count fields');

    const totalLeaveDays = (dailyCounts || []).reduce((s, d) => s + d.count, 0);
    console.log(`    -> total on-leave-days across last 14 days: ${totalLeaveDays}`);
  } catch (err) {
    fail(`getDailyLeaveCounts threw: ${err.message}`);
  }

  section('2. AI leave-forecast call (aiService.leaveForecast)');
  let forecastResult;
  try {
    forecastResult = await aiService.leaveForecast(requestingUser, null, `Bearer ${token}`);
  } catch (err) {
    fail(`leaveForecast threw: ${err.message}`);
    await prisma.$disconnect();
    printSummary();
    process.exit(failCount > 0 ? 1 : 0);
  }

  if (forecastResult.fallback) {
    warn('AI service unreachable — response came from the statistical fallback (buildStatisticalForecast), not the real model. Confirm the ai-service process is running on AI_SERVICE_URL if you want to test the real model path.');
  } else {
    pass('Response came from the real AI service (not the fallback)');
  }

  const forecast = forecastResult.forecast;
  if (!Array.isArray(forecast) || forecast.length === 0) {
    fail('forecast field missing or empty');
  } else {
    pass(`forecast array present with ${forecast.length} entries`);

    const allHaveRange = forecast.every((d) => typeof d.predicted === 'number');
    if (allHaveRange) pass('Every day has a numeric "predicted" value');
    else fail('Some days missing "predicted"');

    if (!forecastResult.fallback) {
      const allHaveInterval = forecast.every((d) => typeof d.low === 'number' && typeof d.high === 'number');
      if (allHaveInterval) pass('Every day has numeric "low"/"high" confidence bounds');
      else fail('Some days missing "low"/"high" confidence bounds');

      const orderingOk = forecast.every((d) => d.low <= d.predicted && d.predicted <= d.high);
      if (orderingOk) pass('low <= predicted <= high holds for every day');
      else fail('Found a day where low <= predicted <= high does NOT hold');

      if (forecastResult.algorithm) pass(`algorithm field present: "${forecastResult.algorithm}"`);
      else fail('algorithm field missing');

      if (forecastResult.baselineSource) pass(`baselineSource field present: "${forecastResult.baselineSource}"`);
      else fail('baselineSource field missing');

      if (typeof forecastResult.confidenceNote === 'string' && forecastResult.confidenceNote.trim().length > 0) {
        pass(`confidenceNote present: "${forecastResult.confidenceNote}"`);
      } else {
        fail('confidenceNote missing or empty');
      }

      if (forecastResult.baselineSource && forecastResult.baselineSource !== 'default-fallback') {
        pass('Baseline was seeded from real org leave history, not the hardcoded 2.5 default');
      } else {
        warn('Baseline fell back to the hardcoded default — organization may have too little recent leave history (expected on a very fresh DB)');
      }
    } else {
      warn('Skipping low/high/algorithm/baselineSource/confidenceNote checks — those only exist on the real-model response path');
    }
  }

  await prisma.$disconnect();
  printSummary();
  process.exit(failCount > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`Leave Forecast Test: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log('='.repeat(60));
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
