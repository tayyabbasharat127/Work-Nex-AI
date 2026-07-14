const axios = require('axios');
const prisma = require('../../config/db');
const { config } = require('../../config/env');
const { ApiError } = require('../../utils/ApiError');
const { assertCanAccessUser, getAccessibleUserIds } = require('../../utils/rbac');
const { getHolidaysInRange } = require('../attendance/attendance.processor');

const AI_SERVICE = config.aiServiceUrl;

const requireAiServiceUrl = () => {
  if (!AI_SERVICE) throw new ApiError(503, 'AI service is not configured');
  return AI_SERVICE;
};

const normalizeChatResponse = (data) => ({
  answer: data.answer || data.message || data.response || '',
  message: data.message || data.answer || data.response || '',
  sources: data.sources || [],
  confidence: data.confidence ?? 0.5,
  actions: data.actions || data.data?.actions || [],
  fallback: data.fallback ?? false,
  intent: data.intent,
  data: data.data || {},
});

const status = async (authorization) => {
  const response = await axios.get(`${requireAiServiceUrl()}/chat/status`, { headers: { Authorization: authorization }, timeout: 5000 });
  return response.data;
};

const chat = async (userId, message, authToken = '') => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true,
      departmentId: true, organizationId: true,
      customRole: { select: { tier: true } },
    },
  });
  try {
    const response = await axios.post(`${requireAiServiceUrl()}/chat`, { message,
    }, { headers: { Authorization: `Bearer ${authToken}` }, timeout: 30000 });
    return normalizeChatResponse(response.data);
  } catch {
    return buildFallbackChat(message, user);
  }
};

const fallbackPayload = (message, sources = [], actions = [], confidence = 0.5) => ({
  answer: message,
  message,
  sources,
  confidence,
  actions,
  fallback: true,
});

const buildFallbackChat = (message, user) => {
  const msg = message.toLowerCase();
  const name = user?.firstName || 'there';

  if (msg.includes('hello') || msg.includes('hi')) {
    return fallbackPayload(
      `Hello ${name}! I'm your WorkNex AI assistant. I can help with leave balances, attendance insights, policy questions, and performance analytics.`,
      ['system_help.md'],
    );
  }
  if (msg.includes('leave balance') || msg.includes('leaves left')) {
    return fallbackPayload(
      `Hi ${name}! Your leave balance is available from the My Leaves page. Scoped balance data must come from the backend leave balance API.`,
      ['leave_policy.md'],
      [{ type: 'navigate', path: '/dashboard/employee/leaves', label: 'Open My Leaves' }],
      0.58,
    );
  }
  if (msg.includes('attendance')) {
    return fallbackPayload(
      'Attendance is self-scoped for employees and team-scoped for managers. Use the Attendance page for check-in times, working hours, and monthly records.',
      ['attendance_policy.md', 'roles_permissions.md'],
      [{ type: 'navigate', path: '/dashboard/employee/attendance', label: 'Open Attendance' }],
      0.58,
    );
  }
  if (msg.includes('performance')) {
    return fallbackPayload(
      'Performance predictions use attendance rate, late and absence counts, leave count, working hours, prior score, department average, overtime, and half-day count.',
      ['system_help.md'],
      [],
      0.55,
    );
  }
  return fallbackPayload(
    `I understand you're asking about: "${message}". I can help with leave management, attendance, permissions, Power BI setup, and performance analytics. Could you be more specific?`,
    [],
    [],
    0.35,
  );
};

const applyNonWorkingCalendar = async (payload, organizationId) => {
  if (!Array.isArray(payload?.forecast) || payload.forecast.length === 0) return payload;
  const validDates = payload.forecast
    .map((row) => new Date(`${row.date}T00:00:00.000Z`))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!validDates.length) return payload;

  const holidays = await getHolidaysInRange(organizationId, validDates[0], validDates[validDates.length - 1]);
  const holidayByDate = new Map(holidays.map((holiday) => [
    holiday.observedDate.toISOString().slice(0, 10),
    holiday,
  ]));
  const forecast = payload.forecast.map((row) => {
    const date = new Date(`${row.date}T00:00:00.000Z`);
    const holiday = holidayByDate.get(row.date);
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    if (!holiday && !isWeekend) return { ...row, forecastAvailable: true };
    return {
      ...row,
      predicted: 0,
      ...(row.low !== undefined ? { low: 0 } : {}),
      ...(row.high !== undefined ? { high: 0 } : {}),
      riskLevel: 'NONE',
      forecastAvailable: false,
      nonWorkingReason: holiday ? 'HOLIDAY' : 'WEEKEND',
      holidayName: holiday?.name || null,
    };
  });
  const total = forecast.reduce((sum, row) => sum + Number(row.predicted || 0), 0);
  const available = forecast.filter((row) => row.forecastAvailable);
  const peak = available.reduce((current, row) => (
    !current || Number(row.predicted || 0) > Number(current.predicted || 0) ? row : current
  ), null);

  return {
    ...payload,
    forecast,
    totalPredicted: Math.round(total),
    avgPerDay: Number((total / Math.max(available.length, 1)).toFixed(1)),
    peakDay: peak?.date || null,
    peakPredicted: peak?.predicted || 0,
    calendarAdjusted: true,
  };
};

const leaveForecast = async (requestingUser, departmentId, authorization) => {
  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, organizationId: requestingUser.organizationId },
      select: { id: true },
    });
    if (!department) throw new ApiError(404, 'Department not found');
  }

  try {
    const accessibleUserIds = await getAccessibleUserIds(requestingUser);
    const response = await axios.get(`${requireAiServiceUrl()}/predict/leave-forecast`, {
      params: {
        departmentId,
        organizationId: requestingUser.organizationId,
        userIds: accessibleUserIds || undefined,
      },
      headers: { Authorization: authorization },
      timeout: 15000,
    });
    return await applyNonWorkingCalendar(response.data, requestingUser.organizationId);
  } catch {
    return await buildStatisticalForecast(requestingUser, departmentId);
  }
};

const buildStatisticalForecast = async (requestingUser, departmentId) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const accessibleUserIds = await getAccessibleUserIds(requestingUser);

  const historicalLeaves = await prisma.leaveRequest.findMany({
    where: {
      organizationId: requestingUser.organizationId,
      ...(accessibleUserIds === null ? {} : { employeeId: { in: accessibleUserIds } }),
      ...(departmentId ? { employee: { departmentId } } : {}),
      status: 'APPROVED',
      startDate: { gte: threeMonthsAgo },
    },
    select: { startDate: true, totalDays: true },
  });

  const totalDays = historicalLeaves.reduce((s, l) => s + l.totalDays, 0);
  const avgPerDay = historicalLeaves.length > 0 ? totalDays / 90 : 2;
  const forecast = [];
  const dayWeights = [1.3, 0.9, 0.8, 0.9, 1.4, 0.3, 0.1];

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    const predicted = parseFloat((avgPerDay * dayWeights[date.getDay()]).toFixed(1));
    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
      riskLevel: predicted > 4 ? 'HIGH' : predicted > 2 ? 'MEDIUM' : 'LOW',
    });
  }

  const predictions = forecast.map((f) => f.predicted);
  const total = predictions.reduce((s, v) => s + v, 0);

  return applyNonWorkingCalendar({
    forecast,
    totalPredicted: Math.round(total),
    avgPerDay: parseFloat((total / 30).toFixed(1)),
    riskLevel: total / 30 > 3 ? 'HIGH' : 'MEDIUM',
    algorithm: 'statistical-fallback',
    fallback: true,
    departmentId,
    message: 'Generated from historical data because AI service is unavailable',
  }, requestingUser.organizationId);
};

const attendanceAnomaly = async (requestingUser, userId, authorization) => {
  await assertCanAccessUser(requestingUser, userId);
  try {
    const response = await axios.get(`${requireAiServiceUrl()}/predict/attendance-anomaly`, {
      params: { userId, organizationId: requestingUser.organizationId },
      headers: { Authorization: authorization },
      timeout: 15000,
    });
    return response.data;
  } catch {
    return await buildAttendanceAnomalies(requestingUser, userId);
  }
};

const buildAttendanceAnomalies = async (requestingUser, userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const records = await prisma.attendance.findMany({
    where: {
      userId,
      organizationId: requestingUser.organizationId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: 'desc' },
  });
  const anomalies = [];

  if (records.length > 0) {
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const workingDays = records.length;
    if (lateCount / workingDays > 0.2) anomalies.push({ type: 'FREQUENT_LATE', description: `Late ${lateCount} times in the last 30 days`, severity: lateCount > 5 ? 'HIGH' : 'MEDIUM', recommendation: 'Review commute or work schedule patterns' });
    if (absentCount / workingDays > 0.15) anomalies.push({ type: 'HIGH_ABSENTEEISM', description: `Absent ${absentCount} times in the last 30 days`, severity: 'HIGH', recommendation: 'Schedule a wellness check-in with HR' });
  }

  return {
    anomalies,
    count: anomalies.length,
    userId,
    analysisDate: new Date().toISOString(),
    algorithm: 'rule-based-statistical',
    fallback: true,
    message: anomalies.length > 0 ? `Found ${anomalies.length} attendance pattern(s)` : 'No anomalies detected',
  };
};

const attritionRisk = async (requestingUser, authorization) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(requestingUser);
    const response = await axios.get(`${requireAiServiceUrl()}/predict/attrition-risk`, {
      params: {
        organizationId: requestingUser.organizationId,
        userIds: accessibleUserIds || undefined,
      },
      headers: { Authorization: authorization },
      timeout: 15000,
    });
    return response.data;
  } catch {
    return await buildAttritionRisk(requestingUser);
  }
};

const buildAttritionRisk = async (requestingUser) => {
  const accessibleUserIds = await getAccessibleUserIds(requestingUser);
  const perfRecords = await prisma.performanceRecord.findMany({
    where: {
      organizationId: requestingUser.organizationId,
      ...(accessibleUserIds === null ? {} : { userId: { in: accessibleUserIds } }),
      year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
    orderBy: { overallScore: 'asc' },
    take: 20,
  });

  const employees = perfRecords.map((p) => {
    const riskScore = Math.max(0, Math.min(100, 100 - p.overallScore));
    const factors = [];
    if (p.attendanceScore < 70) factors.push('low_attendance');
    if (p.leaveScore < 70) factors.push('excessive_leave');
    if (p.lateDays > 5) factors.push('late_pattern');
    if (p.absentDays > 3) factors.push('high_absenteeism');
    return {
      name: `${p.user.firstName} ${p.user.lastName}`,
      department: p.user.department?.name || 'Unknown',
      riskScore: Math.round(riskScore),
      overallScore: p.overallScore,
      factors,
    };
  });

  const highRisk = employees.filter((e) => e.riskScore >= 60);
  const mediumRisk = employees.filter((e) => e.riskScore >= 30 && e.riskScore < 60);
  return {
    employees: employees.sort((a, b) => b.riskScore - a.riskScore),
    highRiskCount: highRisk.length,
    mediumRiskCount: mediumRisk.length,
    totalAnalyzed: employees.length,
    overallRiskLevel: highRisk.length > 3 ? 'HIGH' : highRisk.length > 0 ? 'MEDIUM' : 'LOW',
    recommendations: ['Schedule 1-on-1 meetings with high-risk employees', 'Review attendance policies for employees with patterns', 'Consider performance improvement plans for low scorers'],
    generatedAt: new Date().toISOString(),
    algorithm: 'performance-based-risk-scoring',
    fallback: true,
  };
};

const getPerformanceFeatures = async (employeeId, requestingUser) => {
  await assertCanAccessUser(requestingUser, employeeId);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [attendance, leaves, previousPerformance, employee] = await Promise.all([
    prisma.attendance.findMany({ where: { userId: employeeId, organizationId: requestingUser.organizationId, date: { gte: start, lte: end } } }),
    prisma.leaveRequest.findMany({ where: { employeeId, organizationId: requestingUser.organizationId, startDate: { gte: start, lte: end }, status: { in: ['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN', 'APPROVED'] } } }),
    prisma.performanceRecord.findFirst({ where: { userId: employeeId, organizationId: requestingUser.organizationId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    prisma.user.findFirst({ where: { id: employeeId, organizationId: requestingUser.organizationId }, select: { departmentId: true } }),
  ]);

  let departmentAverage = previousPerformance?.overallScore || 75;
  if (employee?.departmentId) {
    const peerRecords = await prisma.performanceRecord.findMany({
      where: {
        organizationId: requestingUser.organizationId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        user: { departmentId: employee.departmentId },
      },
      select: { overallScore: true },
    });
    if (peerRecords.length) departmentAverage = peerRecords.reduce((sum, row) => sum + row.overallScore, 0) / peerRecords.length;
  }

  const workingRecords = attendance.filter((row) => Number(row.workingHours) > 0);
  const present = attendance.filter((row) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(row.status)).length;
  const attendanceRate = attendance.length ? (present / attendance.length) * 100 : 0;
  const averageWorkingHours = workingRecords.length ? workingRecords.reduce((sum, row) => sum + Number(row.workingHours || 0), 0) / workingRecords.length : 0;
  const overtimeHours = workingRecords.reduce((sum, row) => sum + Math.max(0, Number(row.workingHours || 0) - 8), 0);

  return {
    attendanceRate: Number(attendanceRate.toFixed(2)),
    lateCount: attendance.filter((row) => row.status === 'LATE').length,
    absenceCount: attendance.filter((row) => row.status === 'ABSENT').length,
    leaveCount: leaves.reduce((sum, row) => sum + Number(row.totalDays || 0), 0),
    averageWorkingHours: Number(averageWorkingHours.toFixed(2)),
    previousPerformanceScore: previousPerformance?.overallScore || 75,
    departmentAverage: Number(departmentAverage.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    halfDayCount: attendance.filter((row) => row.status === 'HALF_DAY').length,
  };
};

const deterministicPerformancePrediction = (employeeId, features) => {
  const score = Math.max(0, Math.min(100,
    (0.32 * features.attendanceRate)
    + (0.24 * features.previousPerformanceScore)
    + (0.16 * features.departmentAverage)
    + (2.5 * features.averageWorkingHours)
    + (0.4 * Math.min(features.overtimeHours, 10))
    - (1.4 * features.lateCount)
    - (2.1 * features.absenceCount)
    - (0.6 * features.leaveCount)
    - (1.2 * features.halfDayCount)
  ));
  const predictedScore = Number(score.toFixed(2));
  const riskLevel = predictedScore < 55 ? 'HIGH' : predictedScore < 72 ? 'MEDIUM' : 'LOW';
  const reasons = [];
  if (features.attendanceRate < 80) reasons.push('Attendance rate is below target.');
  if (features.lateCount >= 4) reasons.push('Late arrival count is elevated.');
  if (features.absenceCount >= 3) reasons.push('Absence count is elevated.');
  if (features.averageWorkingHours < 7) reasons.push('Average working hours are below baseline.');
  if (!reasons.length) reasons.push('Stable attendance and prior performance support the forecast.');
  return { employeeId, predictedScore, riskLevel, confidence: 0.62, reasons, featuresUsed: features, modelVersion: 'node-deterministic-fallback-v1', fallback: true, advisoryOnly: true, humanReviewRequired: true, disclaimer: 'Advisory model output only. Human review is required before employment action.' };
};

const predictPerformance = async (requestingUser, employeeId, authorization) => {
  const features = await getPerformanceFeatures(employeeId, requestingUser);
  try {
    const response = await axios.post(`${requireAiServiceUrl()}/predict/performance`, { employeeId, features }, {
      headers: { Authorization: authorization }, timeout: 15000,
    });
    return response.data;
  } catch {
    return deterministicPerformancePrediction(employeeId, features);
  }
};

module.exports = { status, chat, leaveForecast, attendanceAnomaly, attritionRisk, predictPerformance };
