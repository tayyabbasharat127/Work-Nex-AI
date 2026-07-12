/**
 * Web attendance provider — the browser check-in/check-out/ping flow.
 *
 * Owns the verification signals specific to this source: office-network
 * (IP) and GPS geofencing. These are gates on *this provider*, not the
 * attendance business logic itself — the processor doesn't know or care
 * that a web check-in happened to be network/location-verified.
 */

const prisma = require('../../../config/db');
const { ApiError } = require('../../../utils/ApiError');
const { verifyOfficeNetwork } = require('../../../utils/wifiVerification');
const processor = require('../attendance.processor');

const ATTENDANCE_SOURCE = {
  CHECK_IN: 'WEB_CHECK_IN',
  AUTO_PING: 'AUTO_PING',
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const distanceMeters = (fromLat, fromLng, toLat, toLng) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getLocationPolicy = async (organizationId) => {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
  const policy = settings?.attendancePolicyJson || {};
  const location = policy.location || policy.gps || {};
  const enabled = Boolean(
    policy.locationVerificationEnabled
    || policy.gpsVerificationEnabled
    || location.enabled
  );

  return {
    enabled,
    latitude: toFiniteNumber(location.latitude ?? policy.officeLatitude),
    longitude: toFiniteNumber(location.longitude ?? policy.officeLongitude),
    radiusMeters: toFiniteNumber(location.radiusMeters ?? policy.officeRadiusMeters) || 100,
  };
};

const verifyAttendanceLocation = async (user, latitude, longitude) => {
  const policy = await getLocationPolicy(user.organizationId);
  if (!policy.enabled) {
    return { latitude: toFiniteNumber(latitude), longitude: toFiniteNumber(longitude), verified: false };
  }

  if (policy.latitude === null || policy.longitude === null) {
    throw new ApiError(500, 'Attendance GPS verification is enabled but office coordinates are not configured');
  }

  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, 'Valid latitude and longitude are required for attendance check-in');
  }

  const distance = distanceMeters(lat, lng, policy.latitude, policy.longitude);
  if (distance > policy.radiusMeters) {
    throw new ApiError(403, `Attendance check-in requires office location. Device is ${Math.round(distance)}m from the configured office radius.`);
  }

  return { latitude: lat, longitude: lng, verified: true, distanceMeters: Math.round(distance) };
};

const checkIn = async (user, latitude, longitude, req) => {
  const networkCheck = verifyOfficeNetwork(req);
  if (!networkCheck.allowed) {
    throw new ApiError(403, `Attendance check-in requires office network. ${networkCheck.reason}`);
  }
  const locationCheck = await verifyAttendanceLocation(user, latitude, longitude);

  const date = processor.toAttendanceDate();
  return processor.processCheckIn({
    userId: user.id,
    organizationId: user.organizationId,
    date,
    checkInTime: new Date(),
    source: ATTENDANCE_SOURCE.CHECK_IN,
    ipAddress: networkCheck.ip,
    latitude: locationCheck.latitude,
    longitude: locationCheck.longitude,
    notes: locationCheck.verified ? `GPS verified within ${locationCheck.distanceMeters}m` : undefined,
  });
};

const checkOut = async (user) => {
  const date = processor.toAttendanceDate();
  return processor.processCheckOut({
    userId: user.id,
    organizationId: user.organizationId,
    date,
    checkOutTime: new Date(),
  });
};

const autoPing = async (user, req) => {
  const networkCheck = verifyOfficeNetwork(req);
  if (!networkCheck.allowed) {
    return { action: 'ignored', reason: 'Not on office network', ip: networkCheck.ip };
  }

  const date = processor.toAttendanceDate();
  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date } } });
  if (existing?.checkIn) return { action: 'already_checked_in', ip: networkCheck.ip };

  const record = await processor.processCheckIn({
    userId: user.id,
    organizationId: user.organizationId,
    date,
    checkInTime: new Date(),
    source: ATTENDANCE_SOURCE.AUTO_PING,
    ipAddress: networkCheck.ip,
  });

  return { action: 'auto_checked_in', status: record.status, ip: networkCheck.ip };
};

module.exports = { checkIn, checkOut, autoPing, verifyAttendanceLocation };
