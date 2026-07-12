const prisma = require('../src/config/db');

function dateOnly(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function dateTime(year, month, day, hour, minute) {
  if (hour === null || minute === null) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

async function main() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const date = dateOnly(year, month, day);

  const rows = [
    { email: 'bilal.ahmed@novapay.pk', status: 'PRESENT', inHour: 9, inMin: 1, outHour: 17, outMin: 20, hours: 8.32 },
    { email: 'ayesha.s@novapay.pk', status: 'LATE', inHour: 10, inMin: 12, outHour: 17, outMin: 5, hours: 6.88 },
    { email: 'hamza.tariq@novapay.pk', status: 'PRESENT', inHour: 8, inMin: 57, outHour: 17, outMin: 14, hours: 8.28 },
    { email: 'zara.q@novapay.pk', status: 'ON_LEAVE', inHour: null, inMin: null, outHour: null, outMin: null, hours: 0 },
    { email: 'faisal.m@novapay.pk', status: 'PRESENT', inHour: 9, inMin: 7, outHour: 17, outMin: 2, hours: 7.92 },
  ];

  let count = 0;
  for (const row of rows) {
    const user = await prisma.user.findUnique({ where: { email: row.email } });
    if (!user) {
      console.warn(`Missing user: ${row.email}`);
      continue;
    }

    await prisma.attendance.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {
        organizationId: user.organizationId,
        checkIn: dateTime(year, month, day, row.inHour, row.inMin),
        checkOut: dateTime(year, month, day, row.outHour, row.outMin),
        status: row.status,
        workingHours: row.hours,
        source: 'MANUAL',
        ipAddress: row.status === 'ON_LEAVE' ? null : '192.168.1.25',
        notes: 'Demo team attendance snapshot for user manual screenshots',
      },
      create: {
        organizationId: user.organizationId,
        userId: user.id,
        date,
        checkIn: dateTime(year, month, day, row.inHour, row.inMin),
        checkOut: dateTime(year, month, day, row.outHour, row.outMin),
        status: row.status,
        workingHours: row.hours,
        source: 'MANUAL',
        ipAddress: row.status === 'ON_LEAVE' ? null : '192.168.1.25',
        notes: 'Demo team attendance snapshot for user manual screenshots',
      },
    });
    count += 1;
  }

  console.log(`Upserted ${count} team attendance records for ${date.toISOString().slice(0, 10)}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
