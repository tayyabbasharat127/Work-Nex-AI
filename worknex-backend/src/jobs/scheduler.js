const cron = require('node-cron');
const logger = require('../config/logger');
const attendanceService = require('../modules/attendance/attendance.service');
const leaveSandwich = require('../modules/leave/leave.sandwich');
const prisma = require('../config/db');

// Nightly ETL used to be scheduled here too (calling analyticsService.runETL,
// which itself just delegates to etlOrchestrator.runAll) — that duplicated
// modules/etl/etl.scheduler.js, which owns the same 0 2 * * * cron and the
// same orchestrator call, plus start()/stop() lifecycle hooks used in
// app.js. Removed here so the pipeline only runs once per night per org.

/**
 * TMS Attendance Sync: every hour during working hours (7AM - 8PM)
 */
cron.schedule('0 7-20 * * 1-6', async () => {
  logger.info('[CRON] Running TMS attendance sync...');
  try {
    const organizations = await prisma.organization.findMany({ select: { id: true } });
    for (const organization of organizations) {
      const result = await attendanceService.syncFromTMS(new Date(), { organizationId: organization.id, role: 'SYSTEM' });
      logger.info(`[CRON] TMS sync for org ${organization.id}: ${result.processed}/${result.total} records`);
    }
  } catch (err) {
    logger.error(`[CRON] TMS sync failed: ${err.message}`);
  }
});

/**
 * Annual leave balance reset: January 1st at midnight
 */
cron.schedule('0 0 1 1 *', async () => {
  logger.info('[CRON] Resetting annual leave balances...');
  try {
    const year = new Date().getFullYear();
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, organizationId: true },
    });

    for (const user of users) {
      const policies = await prisma.leavePolicy.findMany({
        where: { organizationId: user.organizationId },
      });
      for (const policy of policies) {
        // Carry forward logic
        const prevBalance = await prisma.leaveBalance.findFirst({
          where: { organizationId: user.organizationId, userId: user.id, policyId: policy.id, year: year - 1 },
        });

        let carryForwardDays = 0;
        if (policy.carryForward && prevBalance) {
          carryForwardDays = Math.min(prevBalance.remainingDays, policy.maxCarryForward);
        }

        const totalDays = policy.totalDays + carryForwardDays;

        await prisma.leaveBalance.upsert({
          where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year } },
          update: { totalDays, remainingDays: totalDays, usedDays: 0 },
          create: {
            organizationId: user.organizationId,
            userId: user.id,
            policyId: policy.id,
            year,
            totalDays,
            remainingDays: totalDays,
          },
        });
      }
    }
    logger.info('[CRON] Leave balances reset complete');
  } catch (err) {
    logger.error(`[CRON] Leave balance reset failed: ${err.message}`);
  }
});

/**
 * Mark absent: end of day (11:59 PM) for employees with no attendance record
 */
cron.schedule('59 23 * * 1-6', async () => {
  logger.info('[CRON] Marking absent employees...');
  try {
    const organizations = await prisma.organization.findMany({ select: { id: true } });
    const results = [];
    for (const organization of organizations) {
      results.push(await attendanceService.generateAbsences(new Date(), { organizationId: organization.id, role: 'SYSTEM' }));
    }
    const result = {
      created: results.reduce((sum, item) => sum + item.created, 0),
      scanned: results.reduce((sum, item) => sum + item.scanned, 0),
      createdRecords: results.flatMap((item) => item.createdRecords || []),
    };
    logger.info(`[CRON] Absent marking complete: ${result.created}/${result.scanned} records created`);

    for (const record of result.createdRecords || []) {
      try {
        const adjustment = await leaveSandwich.runSandwichCheckForAbsence(record.date, record.userId, record.organizationId);
        if (adjustment) logger.info(`[CRON] Sandwich rule applied for user ${record.userId}: +${adjustment.sandwichExtraDays} day(s)`);
      } catch (err) {
        logger.error(`[CRON] Sandwich check failed for user ${record.userId}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[CRON] Absent marking failed: ${err.message}`);
  }
});

logger.info('[CRON] All scheduled jobs registered');
