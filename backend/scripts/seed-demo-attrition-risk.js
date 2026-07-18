const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const examples = [
  {
    email: 'ayesha.s@novapay.pk',
    riskScore: 72,
    riskLabel: 'HIGH',
    willLeaveProb: 0.74,
    factors: ['Late Pattern', 'Declining Performance', 'Short Tenure', 'Reduced Working Hours'],
  },
  {
    email: 'imran.malik@novapay.pk',
    riskScore: 66,
    riskLabel: 'HIGH',
    willLeaveProb: 0.68,
    factors: ['Half-Day Pattern', 'Low Attendance Score', 'Sales Target Pressure'],
  },
  {
    email: 'kamran.iqbal@novapay.pk',
    riskScore: 48,
    riskLabel: 'MEDIUM',
    willLeaveProb: 0.45,
    factors: ['Recent Absence', 'Low Punctuality', 'Needs Manager Check-in'],
  },
];

async function main() {
  const month = 6;
  const year = 2026;

  for (const item of examples) {
    const user = await prisma.user.findUnique({ where: { email: item.email } });
    if (!user) continue;

    const performance = await prisma.performanceRecord.findUnique({
      where: { userId_month_year: { userId: user.id, month, year } },
    });

    await prisma.attritionRecord.upsert({
      where: { userId_month_year: { userId: user.id, month, year } },
      update: {
        organizationId: user.organizationId,
        riskScore: item.riskScore,
        riskLabel: item.riskLabel,
        willLeaveProb: item.willLeaveProb,
        factors: item.factors,
        modelVersion: 'demo-risk-v1',
        source: 'SEEDED_DEMO',
        performanceRecordId: performance?.id || null,
      },
      create: {
        organizationId: user.organizationId,
        userId: user.id,
        month,
        year,
        riskScore: item.riskScore,
        riskLabel: item.riskLabel,
        willLeaveProb: item.willLeaveProb,
        factors: item.factors,
        modelVersion: 'demo-risk-v1',
        source: 'SEEDED_DEMO',
        performanceRecordId: performance?.id || null,
      },
    });
  }

  console.log('Seeded demo attrition risks for June 2026.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
