jest.mock('../config/db', () => ({
  holiday: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
}));

const prisma = require('../config/db');
const { getHolidaysInRange } = require('../modules/attendance/attendance.processor');

describe('holiday calendar', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns exact and annual recurring holiday occurrences inside a range', async () => {
    prisma.holiday.findMany.mockResolvedValue([
      {
        id: 'exact', organizationId: 'org-1', name: 'Company Day',
        date: new Date('2026-07-15T00:00:00.000Z'), isRecurring: false,
      },
      {
        id: 'annual', organizationId: 'org-1', name: 'Independence Day',
        date: new Date('2020-08-14T00:00:00.000Z'), isRecurring: true,
      },
    ]);

    const occurrences = await getHolidaysInRange(
      'org-1',
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z'),
    );

    expect(occurrences.map((holiday) => ({
      name: holiday.name,
      date: holiday.observedDate.toISOString().slice(0, 10),
    }))).toEqual([
      { name: 'Company Day', date: '2026-07-15' },
      { name: 'Independence Day', date: '2026-08-14' },
    ]);
  });

  test('returns no occurrences for an inverted range', async () => {
    const occurrences = await getHolidaysInRange(
      'org-1',
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-07-01T00:00:00.000Z'),
    );

    expect(occurrences).toEqual([]);
    expect(prisma.holiday.findMany).not.toHaveBeenCalled();
  });
});
