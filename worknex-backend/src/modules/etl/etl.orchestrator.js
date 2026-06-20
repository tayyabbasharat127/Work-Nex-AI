'use strict';

const attendanceETL = require('./jobs/attendance.etl');
const leaveETL      = require('./jobs/leave.etl');
const performanceETL = require('./jobs/performance.etl');
const attritionETL  = require('./jobs/attrition.etl');
const prisma        = require('../../config/db');
const logger        = require('../../config/logger');

/**
 * ETL Orchestrator — runs 4 jobs nightly in strict order:
 *   1. Attendance ETL   — materialises raw punch records
 *   2. Leave ETL        — syncs leave requests into balances
 *   3. Performance ETL  — aggregates scores (depends on 1+2)
 *   4. Attrition ETL    — ML risk inference   (depends on 3)
 */
class ETLOrchestrator {

  /* ─── Full pipeline ────────────────────────────────────────────────── */

  async runAll(month, year, organizationId = null, { incremental = false } = {}) {
    const startTime = new Date();
    logger.info(`[ETL Orchestrator] Starting full pipeline for ${year}-${month} [incremental=${incremental}]`);

    const syncLog = await prisma.etlSyncLog.create({
      data: {
        source:         'SCHEDULED',
        organizationId,
        status:         'PARTIAL',
        recordsIn:      0,
        startedAt:      startTime,
      },
    });

    try {
      const results     = {};
      let   totalRecords = 0;

      // Job 1 — Attendance
      logger.info('[ETL Orchestrator] Job 1/4 — Attendance ETL');
      results.attendance = await attendanceETL.run(month, year, organizationId);
      totalRecords += results.attendance.records ?? 0;

      // Job 2 — Leave
      logger.info('[ETL Orchestrator] Job 2/4 — Leave ETL');
      results.leave = await leaveETL.run(month, year, organizationId);
      totalRecords += results.leave.records ?? 0;

      // Job 3 — Performance (depends on attendance + leave)
      logger.info('[ETL Orchestrator] Job 3/4 — Performance ETL');
      results.performance = await performanceETL.run(month, year, organizationId, { incremental });
      totalRecords += results.performance.records ?? 0;

      // Job 4 — Attrition ML inference (depends on performance)
      logger.info('[ETL Orchestrator] Job 4/4 — Attrition ETL');
      results.attrition = await attritionETL.run(month, year, organizationId);
      totalRecords += results.attrition.records ?? 0;

      const allSuccess = Object.values(results).every(r => r.success);
      const status     = allSuccess ? 'SUCCESS' : 'PARTIAL';

      await prisma.etlSyncLog.update({
        where: { id: syncLog.id },
        data:  { status, recordsIn: totalRecords, recordsOut: totalRecords, completedAt: new Date() },
      });

      const duration = ((new Date()) - startTime) / 1000;
      logger.info(`[ETL Orchestrator] Pipeline done in ${duration}s — ${status}`);

      return { success: allSuccess, status, duration, results, totalRecords };

    } catch (err) {
      logger.error('[ETL Orchestrator] Pipeline failed:', err);

      await prisma.etlSyncLog.update({
        where: { id: syncLog.id },
        data:  { status: 'FAILED', errorLog: err.message, completedAt: new Date() },
      });

      return { success: false, status: 'FAILED', error: err.message };
    }
  }

  /* ─── Single-job runner ────────────────────────────────────────────── */

  async runJob(jobName, month, year, opts = {}) {
    logger.info(`[ETL Orchestrator] Running ${jobName} ETL for ${year}-${month}`);

    const jobs = {
      attendance:  attendanceETL,
      leave:       leaveETL,
      performance: performanceETL,
      attrition:   attritionETL,
    };

    const job = jobs[jobName.toLowerCase()];
    if (!job) throw new Error(`Unknown ETL job: ${jobName}. Valid: ${Object.keys(jobs).join(', ')}`);

    return job.run(month, year, opts.organizationId ?? null, opts);
  }

  /* ─── History + status helpers ─────────────────────────────────────── */

  async getHistory(limit = 50) {
    return prisma.etlSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    Math.min(limit, 200),
    });
  }

  async getLatestStatus() {
    return prisma.etlSyncLog.findFirst({ orderBy: { createdAt: 'desc' } });
  }
}

module.exports = new ETLOrchestrator();
