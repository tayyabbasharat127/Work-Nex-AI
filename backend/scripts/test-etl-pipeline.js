/**
 * End-to-end test for the ETL pipeline (Attendance -> Leave -> Performance ->
 * Attrition), run the same way the nightly cron / "Run ETL Now" admin button
 * does: etlOrchestrator.runAll(month, year, organizationId).
 *
 * This performs REAL writes (EtlSyncLog, PerformanceRecord, AttritionRecord),
 * exactly like a real admin-triggered run would — that's the only way to
 * verify the pipeline actually works end-to-end. It is safe to re-run: every
 * ETL job upserts by (organizationId, userId, month, year), matching the
 * real nightly behavior.
 *
 * Also verifies the earlier duplicate-scheduler fix indirectly: confirms
 * runAll() only creates ONE EtlSyncLog row per invocation (previously two
 * cron jobs were firing for the same night, doubling this table).
 *
 * Usage: node scripts/test-etl-pipeline.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
const etlOrchestrator = require('../src/modules/etl/etl.orchestrator');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) { passCount++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { failCount++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { warnCount++; console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function section(title) { console.log(`\n${title}`); }

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found — run against the correct database');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  section(`1. Running full ETL pipeline for ${year}-${month} (org: ${org.name})`);

  const logCountBefore = await prisma.etlSyncLog.count({ where: { organizationId: org.id } });
  const perfCountBefore = await prisma.performanceRecord.count({ where: { organizationId: org.id, month, year } });

  const result = await etlOrchestrator.runAll(month, year, org.id, { incremental: false });

  if (result.success) pass(`Pipeline reported success (status: ${result.status}, ${result.duration}s)`);
  else if (result.status === 'PARTIAL') warn(`Pipeline completed with PARTIAL status — one or more sub-jobs reported failure, check results below`);
  else fail(`Pipeline failed: ${result.error || 'unknown error'}`);

  if (result.results) {
    for (const [job, jobResult] of Object.entries(result.results)) {
      if (jobResult.success) pass(`Job "${job}": success, ${jobResult.records ?? 0} record(s)`);
      else fail(`Job "${job}": failed — ${jobResult.error || 'no error message'}`);
    }
  }

  section('2. EtlSyncLog verification');
  const logCountAfter = await prisma.etlSyncLog.count({ where: { organizationId: org.id } });
  const newLogs = logCountAfter - logCountBefore;
  if (newLogs === 1) pass('Exactly ONE new EtlSyncLog row was created (duplicate-scheduler bug stays fixed)');
  else if (newLogs === 0) fail('No new EtlSyncLog row was created');
  else fail(`Expected exactly 1 new EtlSyncLog row, found ${newLogs} — the duplicate-run bug may have regressed`);

  const latestLog = await prisma.etlSyncLog.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
  });
  if (latestLog && ['SUCCESS', 'PARTIAL'].includes(latestLog.status)) {
    pass(`Latest EtlSyncLog status: ${latestLog.status}`);
  } else {
    fail(`Latest EtlSyncLog status unexpected: ${latestLog?.status}`);
  }
  if (latestLog && latestLog.recordsOut > 0) pass(`recordsOut = ${latestLog.recordsOut} (> 0)`);
  else fail(`recordsOut is ${latestLog?.recordsOut} — expected > 0`);

  section('3. PerformanceRecord verification (downstream of Attendance + Leave ETL)');
  const perfCountAfter = await prisma.performanceRecord.count({ where: { organizationId: org.id, month, year } });
  if (perfCountAfter > 0) pass(`${perfCountAfter} PerformanceRecord row(s) exist for ${year}-${month} after the run`);
  else warn('No PerformanceRecord rows found — expected if the org has no active employees with attendance/leave data yet');
  if (perfCountAfter >= perfCountBefore) pass('PerformanceRecord count did not decrease (upsert behavior intact)');
  else fail('PerformanceRecord count decreased — unexpected data loss');

  section('4. AttritionRecord verification (downstream of Performance ETL)');
  const attritionCount = await prisma.attritionRecord.count({ where: { organizationId: org.id, month, year } });
  if (attritionCount > 0) pass(`${attritionCount} AttritionRecord row(s) exist for ${year}-${month}`);
  else warn('No AttritionRecord rows found — expected if the org has too few employees/history for a risk inference');

  section('5. Idempotency check — re-running the same month/year does not duplicate PerformanceRecord rows');
  const result2 = await etlOrchestrator.runAll(month, year, org.id, { incremental: false });
  const perfCountAfterRerun = await prisma.performanceRecord.count({ where: { organizationId: org.id, month, year } });
  if (perfCountAfterRerun === perfCountAfter) pass('Re-running the pipeline for the same period upserts instead of duplicating (record count unchanged)');
  else fail(`Record count changed after re-run: ${perfCountAfter} -> ${perfCountAfterRerun} (expected upsert, not duplication)`);
  if (result2.success || result2.status === 'PARTIAL') pass('Re-run completed without crashing');
  else fail(`Re-run failed: ${result2.error}`);

  await prisma.$disconnect();
  printSummary();
  process.exit(failCount > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`ETL Pipeline Test: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log('='.repeat(60));
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
