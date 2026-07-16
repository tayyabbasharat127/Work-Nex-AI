require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
const leaveService = require('../src/modules/leave/leave.service');

async function testWith(automationEnabled, requiresAdminApproval, label) {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  await prisma.organizationSettings.update({ where: { organizationId: org.id }, data: { leaveAutomationEnabled: automationEnabled } });
  const active = await prisma.leavePolicyVersion.findFirst({ where: { organizationId: org.id, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
  const rules = active.rulesJson.leavePolicies.map(r => r.leaveType === 'CASUAL' ? { ...r, requiresAdminApproval } : r);
  await prisma.leavePolicyVersion.update({ where: { id: active.id }, data: { rulesJson: { ...active.rulesJson, leavePolicies: rules } } });

  const sana = await prisma.user.findFirst({ where: { email: 'sana.tariq.demo@example.com' } });
  const balBefore = await prisma.leaveBalance.findFirst({ where: { userId: sana.id, policy: { leaveType: 'CASUAL' }, year: new Date().getFullYear() } });
  let result;
  for (let offset = 10; offset <= 90 && !result; offset++) {
    const start = new Date(); start.setDate(start.getDate() + offset);
    if (start.getDay() === 0 || start.getDay() === 6) continue;
    const dateStr = start.toISOString().slice(0, 10);
    try {
      result = await leaveService.applyLeave(sana, { leaveType: 'CASUAL', startDate: dateStr, endDate: dateStr, reason: label });
    } catch (e) { /* holiday/overlap, try next */ }
  }
  console.log(label, '-> status:', result?.status, '| note:', result?.approverNote);
  if (result && result.status !== 'REJECTED') {
    await prisma.leaveRequest.delete({ where: { id: result.id } });
    if (result.status === 'APPROVED' && balBefore) {
      await prisma.leaveBalance.update({ where: { id: balBefore.id }, data: { usedDays: balBefore.usedDays, remainingDays: balBefore.remainingDays } });
    }
  }
}

(async () => {
  await testWith(true, true, 'Test A: automation=ON, requiresAdminApproval=true');
  await testWith(true, false, 'Test B: automation=ON, requiresAdminApproval=false');
  await testWith(false, false, 'Test C: automation=OFF, requiresAdminApproval=false');
})().catch((e) => console.error('ERROR', e.message)).finally(() => prisma.$disconnect());
