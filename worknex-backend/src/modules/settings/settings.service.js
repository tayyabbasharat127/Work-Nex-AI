const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { assertOrganizationAccess } = require('../../utils/tenant');

const defaults = {
  timezone: 'Asia/Karachi',
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  lateThresholdMinutes: 30,
  officeIpRanges: [],
  wifiVerificationEnabled: false,
  leaveAutomationEnabled: true,
  sandwichLeaveEnabled: false,
  attendancePolicyJson: { halfDayHours: 4 },
};

const resolveOrganizationId = (user, requestedId = null) => {
  const organizationId = user.role === 'SUPER_ADMIN' ? (requestedId || user.organizationId) : user.organizationId;
  if (!organizationId) throw new ApiError(400, 'organizationId is required');
  assertOrganizationAccess(user, organizationId);
  return organizationId;
};

const normalizeLateThreshold = (data) => {
  if (Number.isInteger(data.lateThresholdMinutes)) return data.lateThresholdMinutes;
  if (data.lateThreshold && Number.isInteger(data.lateThreshold.hour) && Number.isInteger(data.lateThreshold.minute)) {
    const startHour = Number((data.workingHours?.start || data.workingHoursStart || defaults.workingHoursStart).split(':')[0]);
    return Math.max(0, (data.lateThreshold.hour - startHour) * 60 + data.lateThreshold.minute);
  }
  return undefined;
};

const normalizeOfficeIpRanges = (value) => {
  const ranges = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return [...new Set(
    ranges
      .filter((range) => typeof range === 'string')
      .map((range) => range.trim())
      .filter(Boolean),
  )];
};

const ensureSettings = (organizationId) => prisma.organizationSettings.upsert({
  where: { organizationId },
  update: {},
  create: { organizationId, ...defaults },
});

const serializeSettings = (org, settings) => {
  const workingHoursStart = settings.workingHoursStart || defaults.workingHoursStart;
  const workingHoursEnd = settings.workingHoursEnd || defaults.workingHoursEnd;
  const lateThresholdMinutes = settings.lateThresholdMinutes ?? defaults.lateThresholdMinutes;
  const startHour = Number(workingHoursStart.split(':')[0]) || 9;
  const thresholdHour = startHour + Math.floor(lateThresholdMinutes / 60);
  const thresholdMinute = lateThresholdMinutes % 60;

  return {
    organizationId: org.id,
    name: org.name,
    industry: org.industry,
    country: org.country,
    phone: org.phone,
    website: org.website,
    address: org.address,
    logoUrl: org.logoUrl,
    timezone: settings.timezone,
    workingHoursStart,
    workingHoursEnd,
    workingHours: { start: workingHoursStart, end: workingHoursEnd },
    lateThresholdMinutes,
    lateThreshold: { hour: thresholdHour, minute: thresholdMinute },
    officeIpRanges: normalizeOfficeIpRanges(settings.officeIpRanges),
    wifiVerificationEnabled: settings.wifiVerificationEnabled,
    attendancePolicyJson: settings.attendancePolicyJson || defaults.attendancePolicyJson,
    attendancePolicy: settings.attendancePolicyJson || defaults.attendancePolicyJson,
    leaveAutomationEnabled: settings.leaveAutomationEnabled,
    sandwichLeaveEnabled: settings.sandwichLeaveEnabled,
    storage: 'database',
    updatedAt: settings.updatedAt,
  };
};

const getOrganizationSettings = async (user, query = {}) => {
  const organizationId = resolveOrganizationId(user, query.organizationId);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new ApiError(404, 'Organization not found');
  const settings = await ensureSettings(organizationId);
  return serializeSettings(org, settings);
};

const updateOrganizationSettings = async (user, data) => {
  const organizationId = resolveOrganizationId(user, data.organizationId);
  const allowedOrgFields = ['name', 'industry', 'country', 'phone', 'website', 'address', 'logoUrl'];
  const orgData = Object.fromEntries(Object.entries(data).filter(([key]) => allowedOrgFields.includes(key)));

  const settingsData = {
    timezone: data.timezone,
    workingHoursStart: data.workingHours?.start || data.workingHoursStart,
    workingHoursEnd: data.workingHours?.end || data.workingHoursEnd,
    lateThresholdMinutes: normalizeLateThreshold(data),
    officeIpRanges: data.officeIpRanges === undefined
      ? undefined
      : normalizeOfficeIpRanges(data.officeIpRanges),
    wifiVerificationEnabled: data.wifiVerificationEnabled,
    leaveAutomationEnabled: data.leaveAutomationEnabled,
    sandwichLeaveEnabled: data.sandwichLeaveEnabled,
    attendancePolicyJson: data.attendancePolicy || data.attendancePolicyJson,
  };
  const cleanSettingsData = Object.fromEntries(Object.entries(settingsData).filter(([, value]) => value !== undefined));

  const [org, settings] = await prisma.$transaction(async (tx) => {
    const updatedOrg = Object.keys(orgData).length
      ? await tx.organization.update({ where: { id: organizationId }, data: orgData })
      : await tx.organization.findUnique({ where: { id: organizationId } });
    const updatedSettings = await tx.organizationSettings.upsert({
      where: { organizationId },
      update: cleanSettingsData,
      create: { organizationId, ...defaults, ...cleanSettingsData },
    });
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'OrganizationSettings',
        entityId: updatedSettings.id,
        newValues: { orgData, settings: cleanSettingsData },
      },
    });
    return [updatedOrg, updatedSettings];
  });

  return serializeSettings(org, settings);
};

module.exports = { getOrganizationSettings, updateOrganizationSettings };
