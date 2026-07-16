const attendanceService = require('./attendance.service');
const universityAttendanceService = require('./university-attendance.service');
const webhookProvider = require('./providers/webhook.provider');
const { apiResponse } = require('../../utils/ApiResponse');

// Device push (ADMS). Not a logged-in user — accepts the device serial
// number and an optional communication key from query params, headers, or
// body, whichever the device's firmware sends. Records can arrive as a
// single punch object or an array of punches.
const tmsWebhook = async (req, res) => {
  const serialNumber = req.query.SN || req.query.sn || req.body.SN || req.body.serialNumber;
  const rawRecords = Array.isArray(req.body.records) ? req.body.records : [req.body];

  const result = await webhookProvider.receivePush({
    serialNumber,
    signature: req.headers['x-worknex-signature'],
    timestamp: req.headers['x-worknex-timestamp'],
    nonce: req.headers['x-worknex-nonce'],
    rawBody: req.rawBody,
    records: rawRecords,
  });
  apiResponse(res, 200, 'Push received', result);
};

const universityPunch = async (req, res) => {
  const record = await universityAttendanceService.ingestPunch({
    serialNumber: req.query.SN,
    signature: req.headers['x-worknex-signature'],
    timestamp: req.headers['x-worknex-timestamp'],
    nonce: req.headers['x-worknex-nonce'],
    rawBody: req.rawBody,
    punch: req.body,
  });
  apiResponse(res, 201, 'University attendance punch recorded', record);
};

const checkIn = async (req, res) => {
  const { latitude, longitude } = req.body;
  // Pass req so WiFi/IP verification can read client IP
  const record = await attendanceService.checkIn(req.user, latitude, longitude, req);
  apiResponse(res, 200, 'Checked in successfully', record);
};

const checkOut = async (req, res) => {
  const record = await attendanceService.checkOut(req.user);
  apiResponse(res, 200, 'Checked out successfully', record);
};

const autoPing = async (req, res) => {
  const result = await attendanceService.autoPing(req.user, req);
  apiResponse(res, 200, 'Ping received', result);
};

const getTodayAttendance = async (req, res) => {
  const record = await attendanceService.getTodayAttendance(req.user);
  apiResponse(res, 200, 'Today attendance fetched', record);
};

const getMyAttendance = async (req, res) => {
  const result = await attendanceService.getMyAttendance(req.user.id, req.query, req.user.organizationId);
  apiResponse(res, 200, 'Attendance fetched', result.records, result.meta);
};

const getAllAttendance = async (req, res) => {
  const result = await attendanceService.getAllAttendance(req.query, req.user);
  apiResponse(res, 200, 'Attendance fetched', result.records, result.meta);
};

const getUserAttendance = async (req, res) => {
  const result = await attendanceService.getUserAttendance(req.params.userId, req.query, req.user);
  apiResponse(res, 200, 'User attendance fetched', result.records, result.meta);
};

const getAttendanceSummary = async (req, res) => {
  const summary = await attendanceService.getAttendanceSummary(req.query, req.user);
  apiResponse(res, 200, 'Summary fetched', summary);
};

const getWeeklyHoursShortfall = async (req, res) => {
  const rows = await attendanceService.getWeeklyHoursShortfall(req.user);
  apiResponse(res, 200, 'Weekly hours shortfall fetched', rows);
};

const manualEntry = async (req, res) => {
  const record = await attendanceService.manualEntry(req.body, req.user, req);
  apiResponse(res, 200, 'Attendance recorded', record);
};

const updateAttendance = async (req, res) => {
  const record = await attendanceService.updateAttendance(req.params.id, req.body, req.user, req);
  apiResponse(res, 200, 'Attendance updated', record);
};

const syncFromTMS = async (req, res) => {
  const result = await attendanceService.syncFromTMS(req.body.date, req.user);
  apiResponse(res, 200, 'TMS sync completed', result);
};

const getHolidays = async (req, res) => {
  const holidays = await attendanceService.getHolidays(req.user, req.query.year);
  apiResponse(res, 200, 'Holidays fetched', holidays);
};

const createHoliday = async (req, res) => {
  const holiday = await attendanceService.createHoliday(req.body, req.user);
  res.locals.entityId = holiday.id;
  res.locals.auditData = holiday;
  apiResponse(res, 201, 'Holiday created', holiday);
};

const updateHoliday = async (req, res) => {
  const holiday = await attendanceService.updateHoliday(req.params.id, req.body, req.user);
  res.locals.entityId = holiday.id;
  res.locals.auditData = holiday;
  apiResponse(res, 200, 'Holiday updated', holiday);
};

const deleteHoliday = async (req, res) => {
  const holiday = await attendanceService.deleteHoliday(req.params.id, req.user);
  res.locals.entityId = holiday.id;
  res.locals.auditData = { name: holiday.name, date: holiday.date };
  apiResponse(res, 200, 'Holiday deleted', holiday);
};

const generateAbsences = async (req, res) => {
  const result = await attendanceService.generateAbsences(req.body.date, req.user);
  apiResponse(res, 200, 'Absences generated', result);
};

module.exports = {
  tmsWebhook, universityPunch,
  checkIn, checkOut, autoPing, getTodayAttendance, getMyAttendance,
  getAllAttendance, getUserAttendance, getAttendanceSummary, getWeeklyHoursShortfall,
  manualEntry, updateAttendance, syncFromTMS,
  getHolidays, createHoliday, updateHoliday, deleteHoliday, generateAbsences,
};
