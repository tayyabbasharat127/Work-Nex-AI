jest.mock('../config/db', () => ({
  user: { findFirst: jest.fn() },
  universityAttendancePunch: { create: jest.fn() },
}));

jest.mock('../modules/attendance/providers/webhook.provider', () => ({
  identifyDevice: jest.fn(),
  verifySignature: jest.fn(),
}));

const prisma = require('../config/db');
const deviceAuth = require('../modules/attendance/providers/webhook.provider');
const service = require('../modules/attendance/university-attendance.service');

describe('university attendance ingestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deviceAuth.identifyDevice.mockResolvedValue({ organizationId: 'org-1' });
    deviceAuth.verifySignature.mockResolvedValue(undefined);
  });

  test('maps USERID to organization-scoped users.employeeId and stores the punch', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-uuid', organizationId: 'org-1' });
    prisma.universityAttendancePunch.create.mockImplementation(({ data }) => Promise.resolve(data));

    const result = await service.ingestPunch({
      serialNumber: 'UNIVERSITY-TMS-1',
      signature: 'signature',
      timestamp: 'timestamp',
      nonce: 'nonce',
      rawBody: Buffer.from('{}'),
      punch: {
        USERID: 36,
        CHECKINTIME: '2026-07-15T10:30:00+05:00',
        TYPE: 'IN',
      },
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', employeeId: '36' },
      select: { id: true, organizationId: true },
    });
    expect(result).toMatchObject({
      organizationId: 'org-1',
      userId: 'user-uuid',
      externalUserId: '36',
      type: 'IN',
    });
  });

  test('rejects a USERID that does not exist in the device organization', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.ingestPunch({
      serialNumber: 'UNIVERSITY-TMS-1',
      rawBody: Buffer.from('{}'),
      punch: {
        USERID: '999',
        CHECKINTIME: '2026-07-15T10:30:00+05:00',
        TYPE: 'IN',
      },
    })).rejects.toMatchObject({ statusCode: 404 });

    expect(prisma.universityAttendancePunch.create).not.toHaveBeenCalled();
  });
});
