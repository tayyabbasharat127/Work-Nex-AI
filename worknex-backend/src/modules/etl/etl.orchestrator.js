const attendanceETL = require('./jobs/attendance.etl');
const leaveETL = require('./jobs/leave.etl');
const performanceETL = require('./jobs/performance.etl');
const prisma = require('../../config/db');
const logger = require('../../config/logger');

/**
 * ETL Orchestrator
 * Manages execution of all ETL jobs in correct order
 */
class ETLOrchestrator {
  /**
   * Run all ETL jobs for a specific month
   */
  async runAll(month, year) {
    const startTime = new Date();
    logger.info(`[ETL Orchestrator] Starting full ETL pipeline for ${year}-${month}`);

    // Create ETL sync log
    const syncLog = await prisma.etlSyncLog.create({
      data: {
        source: 'SCHEDULED',
        status: 'PARTIAL',
        recordsIn: 0,
        startedAt: startTime
      }
    });

    try {
      let totalRecords = 0;
      const results = {};

      // Job 1: Attendance ETL
      logger.info('[ETL Orchestrator] Running Attendance ETL...');
      results.attendance = await attendanceETL.run(month, year);
      totalRecords += results.attendance.records;

      // Job 2: Leave ETL
      logger.info('[ETL Orchestrator] Running Leave ETL...');
      results.leave = await leaveETL.run(month, year);
      totalRecords += results.leave.records;

      // Job 3: Performance ETL (depends on attendance + leave)
      logger.info('[ETL Orchestrator] Running Performance ETL...');
      results.performance = await performanceETL.run(month, year);
      totalRecords += results.performance.records;

      // Check if any job failed
      const allSuccess = Object.values(results).every(r => r.success);
      const status = allSuccess ? 'SUCCESS' : 'PARTIAL';

      // Update sync log
      await prisma.etlSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status,
          recordsIn: totalRecords,
          recordsOut: totalRecords,
          completedAt: new Date()
        }
      });

      const duration = (new Date() - startTime) / 1000;
      logger.info(`[ETL Orchestrator] Pipeline completed in ${duration}s - Status: ${status}`);

      return {
        success: allSuccess,
        status,
        duration,
        results,
        totalRecords
      };

    } catch (error) {
      logger.error('[ETL Orchestrator] Pipeline failed:', error);

      // Update sync log with error
      await prisma.etlSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorLog: error.message,
          completedAt: new Date()
        }
      });

      return {
        success: false,
        status: 'FAILED',
        error: error.message
      };
    }
  }

  /**
   * Run specific ETL job
   */
  async runJob(jobName, month, year) {
    logger.info(`[ETL Orchestrator] Running ${jobName} ETL for ${year}-${month}`);

    const jobs = {
      attendance: attendanceETL,
      leave: leaveETL,
      performance: performanceETL
    };

    const job = jobs[jobName.toLowerCase()];
    if (!job) {
      throw new Error(`Unknown ETL job: ${jobName}`);
    }

    return await job.run(month, year);
  }

  /**
   * Get ETL execution history
   */
  async getHistory(limit = 50) {
    return prisma.etlSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get latest ETL status
   */
  async getLatestStatus() {
    return prisma.etlSyncLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new ETLOrchestrator();
