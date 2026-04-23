const attendanceService = require('./attendance.service');
const { apiResponse } = require('../../utils/ApiResponse');

const checkIn = async (req, res) => {
  const { latitude, longitude } = req.body;
  // Pass req so WiFi/IP verification can read client IP
  const record = await attendanceService.checkIn(req.user.id, latitude, longitude, req);
  apiResponse(res, 200, 'Checked in successfully', record);
};

const checkOut = async (req, res) => {
  const record = await attendanceService.checkOut(req.user.id);
  apiResponse(res, 200, 'Checked out successfully', record);
};

const autoPing = async (req, res) => {
  const result = await attendanceService.autoPing(req.user.id, req);
  apiResponse(res, 200, 'Ping received', result);
};

const getTodayAttendance = async (req, res) => {
  const record = await attendanceService.getTodayAttendance(req.user.id);
  apiResponse(res, 200, 'Today attendance fetched', record);
};

const getMyAttendance = async (req, res) => {
  const result = await attendanceService.getMyAttendance(req.user.id, req.query);
  apiResponse(res, 200, 'Attendance fetched', result.records, result.meta);
};

const getAllAttendance = async (req, res) => {
  const result = await attendanceService.getAllAttendance(req.query);
  apiResponse(res, 200, 'Attendance fetched', result.records, result.meta);
};

const getUserAttendance = async (req, res) => {
  const result = await attendanceService.getUserAttendance(req.params.userId, req.query);
  apiResponse(res, 200, 'User attendance fetched', result.records, result.meta);
};

const getAttendanceSummary = async (req, res) => {
  const summary = await attendanceService.getAttendanceSummary(req.query);
  apiResponse(res, 200, 'Summary fetched', summary);
};

const manualEntry = async (req, res) => {
  const record = await attendanceService.manualEntry(req.body);
  apiResponse(res, 200, 'Attendance recorded', record);
};

const updateAttendance = async (req, res) => {
  const record = await attendanceService.updateAttendance(req.params.id, req.body);
  apiResponse(res, 200, 'Attendance updated', record);
};

const syncFromTMS = async (req, res) => {
  const result = await attendanceService.syncFromTMS(req.body.date);
  apiResponse(res, 200, 'TMS sync completed', result);
};

const getHolidays = async (req, res) => {
  const holidays = await attendanceService.getHolidays();
  apiResponse(res, 200, 'Holidays fetched', holidays);
};

const createHoliday = async (req, res) => {
  const holiday = await attendanceService.createHoliday(req.body);
  apiResponse(res, 201, 'Holiday created', holiday);
};

module.exports = {
  checkIn, checkOut, autoPing, getTodayAttendance, getMyAttendance,
  getAllAttendance, getUserAttendance, getAttendanceSummary,
  manualEntry, updateAttendance, syncFromTMS,
  getHolidays, createHoliday,
};
