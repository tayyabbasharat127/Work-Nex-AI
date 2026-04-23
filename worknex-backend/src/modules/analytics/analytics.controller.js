const analyticsService = require('./analytics.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getDashboardKPIs = async (req, res) => {
  const data = await analyticsService.getDashboardKPIs();
  apiResponse(res, 200, 'Dashboard KPIs', data);
};

const getAttendanceTrends = async (req, res) => {
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
  const data = await analyticsService.getAttendanceTrends(year, month);
  apiResponse(res, 200, 'Attendance trends', data);
};

const getAttendanceHeatmap = async (req, res) => {
  const { userId = req.user.id, year = new Date().getFullYear() } = req.query;
  const data = await analyticsService.getAttendanceHeatmap(userId, year);
  apiResponse(res, 200, 'Attendance heatmap', data);
};

const getDepartmentAttendance = async (req, res) => {
  const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
  const data = await analyticsService.getDepartmentAttendance(month, year);
  apiResponse(res, 200, 'Department attendance', data);
};

const getLeaveSummary = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const data = await analyticsService.getLeaveSummary(year);
  apiResponse(res, 200, 'Leave summary', data);
};

const getLeaveTrends = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const data = await analyticsService.getLeaveTrends(year);
  apiResponse(res, 200, 'Leave trends', data);
};

const getLeaveByType = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const data = await analyticsService.getLeaveByType(year);
  apiResponse(res, 200, 'Leave by type', data);
};

const getHeadcount = async (req, res) => {
  const data = await analyticsService.getHeadcount();
  apiResponse(res, 200, 'Headcount', data);
};

const getTurnoverRate = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const data = await analyticsService.getTurnoverRate(year);
  apiResponse(res, 200, 'Turnover rate', data);
};

const getPowerBIToken = async (req, res) => {
  const data = await analyticsService.getPowerBIToken();
  apiResponse(res, 200, 'Power BI token', data);
};

const runETL = async (req, res) => {
  const { month, year } = req.body;
  const result = await analyticsService.runETL(month, year);
  apiResponse(res, 200, 'ETL completed', result);
};

const getEtlLogs = async (req, res) => {
  const logs = await analyticsService.getEtlLogs();
  apiResponse(res, 200, 'ETL logs', logs);
};

module.exports = {
  getDashboardKPIs, getAttendanceTrends, getAttendanceHeatmap,
  getDepartmentAttendance, getLeaveSummary, getLeaveTrends, getLeaveByType,
  getHeadcount, getTurnoverRate, getPowerBIToken, runETL, getEtlLogs,
};
