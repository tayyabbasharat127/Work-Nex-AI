const prisma = require('../config/db');
const logger = require('../config/logger');
const attendanceService = require('../modules/attendance/attendance.service');
const leaveSandwich = require('../modules/leave/leave.sandwich');
const leaveService = require('../modules/leave/leave.service');
const etlOrchestrator = require('../modules/etl/etl.orchestrator');
const alertsService = require('../modules/alerts/alerts.service');
const analyticsService = require('../modules/analytics/analytics.service');

const syncTms = async () => {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const results = [];
  for (const organization of organizations) {
    results.push(await attendanceService.syncFromTMS(new Date(), {
      organizationId: organization.id,
      role: 'SYSTEM',
    }));
  }
  return { organizations: organizations.length, processed: results.reduce((sum, row) => sum + row.processed, 0) };
};

const resetLeaveBalances = async () => {
  const year = new Date().getFullYear();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, organizationId: true },
  });
  let updated = 0;

  for (const user of users) {
    const policies = await prisma.leavePolicy.findMany({ where: { organizationId: user.organizationId } });
    for (const policy of policies) {
      const previous = await prisma.leaveBalance.findFirst({
        where: { organizationId: user.organizationId, userId: user.id, policyId: policy.id, year: year - 1 },
      });
      const carryForwardDays = policy.carryForward && previous
        ? Math.min(previous.remainingDays, policy.maxCarryForward)
        : 0;
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
      updated += 1;
    }
  }
  return { updated, year };
};

const generateAbsences = async () => {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const results = [];
  for (const organization of organizations) {
    results.push(await attendanceService.generateAbsences(new Date(), {
      organizationId: organization.id,
      role: 'SYSTEM',
    }));
  }

  const createdRecords = results.flatMap((item) => item.createdRecords || []);
  for (const record of createdRecords) {
    const match = await leaveSandwich.detectSandwichForAbsence(record.date, record.userId, record.organizationId);
    if (match) {
      await leaveService.applySandwichPenalty(
        match.leaveRequestId,
        match.extraDays,
        match.gapDescription,
        record.organizationId,
      );
    }
  }
  return { scanned: results.reduce((sum, row) => sum + row.scanned, 0), created: createdRecords.length };
};

const runEtl = async ({ previousMonth = false } = {}) => {
  const now = new Date();
  const month = previousMonth ? (now.getMonth() === 0 ? 12 : now.getMonth()) : now.getMonth() + 1;
  const year = previousMonth && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const results = [];
  for (const organization of organizations) {
    results.push(await etlOrchestrator.runAll(month, year, organization.id));
  }
  return { month, year, organizations: organizations.length, success: results.every((item) => item.success) };
};

const syncPowerBI = async () => analyticsService.pushAllOrganizationsToPowerBI();

const scanAlerts = async () => {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  for (const organization of organizations) await alertsService.triggerScan(organization.id);
  return { organizations: organizations.length };
};

const cleanupAuthTokens = async () => {
  const now = new Date();
  const revokedRetention = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [refreshTokens, passwordResetTokens, authenticationChallenges, webhookNonces] = await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: revokedRetention } },
        ],
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.authenticationChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.biometricWebhookNonce.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return {
    refreshTokens: refreshTokens.count,
    passwordResetTokens: passwordResetTokens.count,
    authenticationChallenges: authenticationChallenges.count,
    webhookNonces: webhookNonces.count,
  };
};

const tasks = {
  'tms-sync': syncTms,
  'leave-balance-reset': resetLeaveBalances,
  'generate-absences': generateAbsences,
  'etl-nightly': () => runEtl(),
  'etl-monthly': () => runEtl({ previousMonth: true }),
  'powerbi-sync': syncPowerBI,
  'scan-alerts': scanAlerts,
  'cleanup-auth-tokens': cleanupAuthTokens,
};

const runScheduledTask = async (taskName) => {
  const task = tasks[taskName];
  if (!task) throw new Error(`Unknown scheduled task: ${taskName}`);

  return prisma.$transaction(async (transaction) => {
    const [lock] = await transaction.$queryRaw`
      SELECT pg_try_advisory_xact_lock(hashtext(${taskName})) AS "acquired"
    `;
    if (!lock?.acquired) {
      logger.warn('Scheduled task skipped because another execution holds the lock', { taskName });
      return { skipped: true };
    }
    logger.info('Scheduled task started', { taskName });
    const result = await task();
    logger.info('Scheduled task completed', { taskName, result });
    return result;
  }, { timeout: 60 * 60 * 1000 });
};

module.exports = { tasks, runScheduledTask };
