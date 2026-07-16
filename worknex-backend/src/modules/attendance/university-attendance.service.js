const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { identifyDevice, verifySignature } = require('./providers/webhook.provider');

const ingestPunch = async ({ serialNumber, signature, timestamp, nonce, rawBody, punch }) => {
  const device = await identifyDevice(serialNumber);
  await verifySignature(device, { signature, timestamp, nonce, rawBody });

  const externalUserId = String(punch.USERID).trim();
  const user = await prisma.user.findFirst({
    where: {
      organizationId: device.organizationId,
      employeeId: externalUserId,
    },
    select: { id: true, organizationId: true },
  });

  if (!user) {
    throw new ApiError(404, `No WorkNex user found for USERID ${externalUserId}`);
  }

  return prisma.universityAttendancePunch.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      externalUserId,
      checkInTime: new Date(punch.CHECKINTIME),
      type: punch.TYPE,
    },
  });
};

module.exports = { ingestPunch };
