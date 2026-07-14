const prisma = require('../config/db');

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeDatabase('database enterprise constraints', () => {
  afterAll(async () => prisma.$disconnect());

  test('tenant composite foreign keys are installed', async () => {
    const names = await prisma.$queryRaw`
      SELECT conname FROM pg_constraint
      WHERE conname IN (
        'Notification_userId_organizationId_fkey',
        'PolicyDocument_uploadedById_organizationId_fkey',
        'LeaveDecisionLog_employeeId_organizationId_fkey'
      )
    `;
    expect(names.map((row) => row.conname).sort()).toEqual([
      'LeaveDecisionLog_employeeId_organizationId_fkey',
      'Notification_userId_organizationId_fkey',
      'PolicyDocument_uploadedById_organizationId_fkey',
    ]);
  });

  test('financial columns use fixed precision numeric types', async () => {
    const columns = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('Subscription', 'pricePerMonth'),
          ('Invoice', 'amount'),
          ('Invoice', 'totalAmount')
        )
    `;
    expect(columns).toHaveLength(3);
    expect(columns.every((column) => column.data_type === 'numeric')).toBe(true);
  });
});
