require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
const leaveService = require('../src/modules/leave/leave.service');

(async () => {
  const sana = await prisma.user.findFirst({ where: { email: 'sana.tariq.demo@example.com' } });
  const balBefore = await prisma.leaveBalance.findFirst({ where: { userId: sana.id, policy: { leaveType: 'CASUAL' }, year: new Date().getFullYear() } });
  console.log('Balance before:', balBefore ? `${balBefore.remainingDays}/${balBefore.totalDays}` : 'none');

  const start = new Date(); start.setDate(start.getDate() + 25);
  while (start.getDay() === 0 || start.getDay() === 6) start.setDate(start.getDate() + 1);
  const dateStr = start.toISOString().slice(0, 10);

  const result = await leaveService.applyLeave(sana, {
    leaveType: 'CASUAL',
    startDate: dateStr,
    endDate: dateStr,
    reason: 'Regression check — is auto-approve still working after external changes?',
  });
  console.log('RESULT status:', result.status);
  console.log('RESULT approverNote:', result.approverNote);

  // cleanup
  if (result.status !== 'REJECTED') {
    await prisma.leaveRequest.delete({ where: { id: result.id } });
    if (result.status === 'APPROVED' && balBefore) {
      await prisma.leaveBalance.update({ where: { id: balBefore.id }, data: { usedDays: balBefore.usedDays, remainingDays: balBefore.remainingDays } });
    }
  }
  console.log('Cleaned up.');
})().catch((err) => { console.error('ERROR:', err.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
