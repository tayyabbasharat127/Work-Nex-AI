const cron = require('node-cron');
const logger = require('../config/logger');
const analyticsService = require('../modules/analytics/analytics.service');
const attendanceService = require('../modules/attendance/attendance.service');
const prisma = require('../config/db');

/**
 * Nightly ETL: compute performance records for current month
 * Runs at 2:00 AM every day
 */
cron.schedule('0 2 * * *', async () => {
  logger.info('[CRON] Running nightly ETL...');
  try {
    const now = new Date();
    const result = await analyticsService.runETL(now.getMonth() + 1, now.getFullYear());
    logger.info(`[CRON] ETL complete: ${result.processed} records processed`);
  } catch (err) {
    logger.error(`[CRON] ETL failed: ${err.message}`);
  }
});

/**
 * TMS Attendance Sync: every hour during working hours (7AM - 8PM)
 */
cron.schedule('0 7-20 * * 1-6', async () => {
  logger.info('[CRON] Running TMS attendance sync...');
  try {
    const result = await attendanceService.syncFromTMS();
    logger.info(`[CRON] TMS sync: ${result.processed}/${result.total} records`);
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
    const result = await attendanceService.generateAbsences();
    logger.info(`[CRON] Absent marking complete: ${result.created}/${result.scanned} records created`);
  } catch (err) {
    logger.error(`[CRON] Absent marking failed: ${err.message}`);
  }
});

logger.info('[CRON] All scheduled jobs registered');
