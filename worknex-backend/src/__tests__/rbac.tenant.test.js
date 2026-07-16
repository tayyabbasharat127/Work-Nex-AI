jest.mock('../config/db', () => ({ user: { findUnique: jest.fn(), findMany: jest.fn() } }));

const prisma = require('../config/db');
const { canAccessUser, getAccessibleUserIds } = require('../utils/rbac');

describe('tenant and manager access boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  test('organization admin cannot access a user in another tenant', async () => {
    prisma.user.findUnique.mockResolvedValue({ organizationId: 'org-b' });
    await expect(canAccessUser({ role: 'ADMIN', organizationId: 'org-a' }, 'target')).resolves.toBe(false);
  });

  test('manager can access only a direct report in the same tenant', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'employee', managerId: 'manager', organizationId: 'org-a' })
      .mockResolvedValueOnce({ id: 'employee', managerId: 'manager', organizationId: 'org-b' });
    const manager = { id: 'manager', role: 'MANAGER', organizationId: 'org-a' };
    await expect(canAccessUser(manager, 'employee')).resolves.toBe(true);
    await expect(canAccessUser(manager, 'employee')).resolves.toBe(false);
  });

  test('manager accessible IDs query is organization scoped', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'employee-1' }]);
    await expect(getAccessibleUserIds({ id: 'manager', role: 'MANAGER', organizationId: 'org-a' }))
      .resolves.toEqual(['employee-1']);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { managerId: 'manager', organizationId: 'org-a' },
    }));
  });
});
