const prisma = require('../src/config/db');
const { ensureDefaultLeavePolicies, ensureLeaveBalancesForUser } = require('../src/modules/leave/leave.defaults');

async function main() {
  const year = new Date().getFullYear();
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  for (const organization of organizations) {
    await prisma.$transaction(async (tx) => {
      const policies = await ensureDefaultLeavePolicies(tx, organization.id);
      const users = await tx.user.findMany({
        where: {
          organizationId: organization.id,
          isActive: true,
          role: { in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
        },
        select: { id: true },
      });
      for (const user of users) {
        await ensureLeaveBalancesForUser(tx, organization.id, user.id, policies, year);
      }
      console.log(`[leave-policy-backfill] ${organization.name}: ${policies.length} policies, ${users.length} users`);
    });
  }
}

main()
  .catch((error) => {
    console.error('[leave-policy-backfill] failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
