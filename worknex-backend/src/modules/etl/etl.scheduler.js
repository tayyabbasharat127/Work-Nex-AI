const cron = require('node-cron');
const etlOrchestrator = require('./etl.orchestrator');
const logger = require('../../config/logger');
const prisma = require('../../config/db');

/**
 * ETL Scheduler
 * Manages scheduled ETL job execution
 */
class ETLScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Initialize and start all scheduled jobs
   */
  start() {
    if (!process.env.ETL_ENABLED || process.env.ETL_ENABLED === 'false') {
      logger.info('[ETL Scheduler] ETL scheduling is disabled');
      return;
    }

    logger.info('[ETL Scheduler] Starting ETL scheduler...');

    // Nightly ETL job (runs at 2:00 AM every day)
    const nightlySchedule = process.env.ETL_CRON_SCHEDULE || '0 2 * * *';
    const nightlyJob = cron.schedule(nightlySchedule, async () => {
      await this.runNightlyETL();
    }, {
      timezone: process.env.ETL_TIMEZONE || 'Asia/Karachi'
    });

    this.jobs.push({ name: 'nightly-etl', job: nightlyJob });
    logger.info(`[ETL Scheduler] Nightly ETL scheduled: ${nightlySchedule}`);

    // Monthly ETL job (runs on 1st of each month at 3:00 AM)
    const monthlySchedule = process.env.ETL_MONTHLY_SCHEDULE || '0 3 1 * *';
    const monthlyJob = cron.schedule(monthlySchedule, async () => {
      await this.runMonthlyETL();
    }, {
      timezone: process.env.ETL_TIMEZONE || 'Asia/Karachi'
    });

    this.jobs.push({ name: 'monthly-etl', job: monthlyJob });
    logger.info(`[ETL Scheduler] Monthly ETL scheduled: ${monthlySchedule}`);

    logger.info('[ETL Scheduler] All ETL jobs scheduled successfully');
  }

  /**
   * Run nightly ETL for current month
   */
  async runNightlyETL() {
    if (this.isRunning) {
      logger.warn('[ETL Scheduler] ETL is already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('[ETL Scheduler] Starting nightly ETL...');

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const result = await etlOrchestrator.runAll(month, year);

      if (result.success) {
        logger.info(`[ETL Scheduler] Nightly ETL completed — ${result.totalRecords} records processed`);
      } else {
        logger.error(`[ETL Scheduler] Nightly ETL partial/failed: ${result.error || 'see logs'}`);
        await this._notifyAdmins('Nightly ETL Warning', `ETL pipeline finished with status ${result.status}. Check ETL logs for details.`);
      }
    } catch (error) {
      logger.error('[ETL Scheduler] Nightly ETL error:', error);
      await this._notifyAdmins('Nightly ETL Failed', `ETL pipeline threw an error: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run monthly ETL for previous month
   */
  async runMonthlyETL() {
    if (this.isRunning) {
      logger.warn('[ETL Scheduler] ETL is already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('[ETL Scheduler] Starting monthly ETL...');

    try {
      const now = new Date();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const result = await etlOrchestrator.runAll(month, year);

      if (result.success) {
        logger.info(`[ETL Scheduler] Monthly ETL completed — ${result.totalRecords} records processed`);
      } else {
        logger.error(`[ETL Scheduler] Monthly ETL partial/failed: ${result.error || 'see logs'}`);
        await this._notifyAdmins('Monthly ETL Warning', `Monthly ETL finished with status ${result.status}. Check ETL logs for details.`);
      }
    } catch (error) {
      logger.error('[ETL Scheduler] Monthly ETL error:', error);
      await this._notifyAdmins('Monthly ETL Failed', `Monthly ETL threw an error: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Notify all ADMIN users in all orgs of an ETL failure.
   */
  async _notifyAdmins(title, message) {
    try {
      const admins = await prisma.user.findMany({
        where:  { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true, organizationId: true },
      });
      await Promise.allSettled(
        admins.map(admin =>
          prisma.notification.create({
            data: {
              userId:         admin.id,
              organizationId: admin.organizationId,
              type:           'SYSTEM',
              title,
              message,
              metadata:       { source: 'ETL_SCHEDULER', timestamp: new Date().toISOString() },
            },
          })
        )
      );
    } catch (err) {
      logger.error('[ETL Scheduler] Failed to send admin notifications:', err.message);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    logger.info('[ETL Scheduler] Stopping ETL scheduler...');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`[ETL Scheduler] Stopped job: ${name}`);
    });

    this.jobs = [];
    logger.info('[ETL Scheduler] All ETL jobs stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      enabled: process.env.ETL_ENABLED !== 'false',
      isRunning: this.isRunning,
      jobs: this.jobs.map(({ name, job }) => ({
        name,
        running: job.running
      }))
    };
  }
}

module.exports = new ETLScheduler();
