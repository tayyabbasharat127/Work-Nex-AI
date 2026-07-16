require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
(async () => {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: org.id } });
  console.log('leaveAutomationEnabled:', settings?.leaveAutomationEnabled, '| updatedAt:', settings?.updatedAt);
  const active = await prisma.leavePolicyVersion.findFirst({ where: { organizationId: org.id, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
  const casual = active.rulesJson.leavePolicies.find(r => r.leaveType === 'CASUAL');
  console.log('CASUAL requiresAdminApproval:', casual.requiresAdminApproval, '| autoApproveMaxDays:', casual.autoApproveMaxDays);
  const recentLogs = await prisma.auditLog.findMany({
    where: { organizationId: org.id, entity: 'OrganizationSettings' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  console.log('Recent OrganizationSettings audit logs:', recentLogs.map(l => ({ at: l.createdAt, userId: l.userId, newValues: l.newValues })));
})().finally(() => prisma.$disconnect());
