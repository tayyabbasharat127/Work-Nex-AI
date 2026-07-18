const reportsService = require('./reports.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getReports = async (req, res) => {
  const reports = await reportsService.getReports(req.query, req.user);
  apiResponse(res, 200, 'Reports fetched', reports);
};

const generateReport = async (req, res) => {
  const report = await reportsService.generateReport(req.body, req.user);
  apiResponse(res, 200, 'Report generated', report);
};

const getAttendanceReport = async (req, res) => apiResponse(res, 200, 'Attendance report generated', await reportsService.getAttendanceReport(req.query, req.user));
const getLeaveReport = async (req, res) => apiResponse(res, 200, 'Leave report generated', await reportsService.getLeaveReport(req.query, req.user));
const getPerformanceReport = async (req, res) => apiResponse(res, 200, 'Performance report generated', await reportsService.getPerformanceReport(req.query, req.user));
const getDepartmentReport = async (req, res) => apiResponse(res, 200, 'Department report generated', await reportsService.getDepartmentReport(req.query, req.user));

const exportCsv = async (req, res) => {
  const report = await reportsService.generateReport({ reportType: req.query.type || 'attendance', filters: req.query }, req.user);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${report.reportType}-report.csv"`);
  res.status(200).send(reportsService.toCsv(report.rows));
};

module.exports = {
  getReports,
  generateReport,
  getAttendanceReport,
  getLeaveReport,
  getPerformanceReport,
  getDepartmentReport,
  exportCsv,
};
