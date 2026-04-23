const axios = require('axios');
const prisma = require('../../config/db');

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Check if AI service is available
 */
const isAIAvailable = async () => {
  try {
    await axios.get(`${AI_SERVICE}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
};

/**
 * AI Chat — forwards to Python service, falls back to rule-based
 */
const chat = async (userId, message) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, role: true, departmentId: true },
  });

  try {
    const response = await axios.post(`${AI_SERVICE}/chat`, {
      userId,
      userContext: user,
      message,
    }, { timeout: 30000 });
    return response.data;
  } catch {
    // Fallback rule-based response
    return buildFallbackChat(message, user);
  }
};

const buildFallbackChat = (message, user) => {
  const msg = message.toLowerCase();
  const name = user?.firstName || 'there';

  if (msg.includes('hello') || msg.includes('hi')) {
    return { message: `Hello ${name}! I'm your WorkNex AI assistant. I can help with leave balances, attendance insights, and performance analytics. What do you need?` };
  }
  if (msg.includes('leave balance') || msg.includes('leaves left')) {
    return { message: `Hi ${name}! Check your leave balance on the **My Leaves** page — your remaining days are shown at the top.` };
  }
  if (msg.includes('attendance')) {
    return { message: `Your attendance history is on the **Attendance** page. You can see check-in times, working hours, and monthly records there.` };
  }
  if (msg.includes('performance')) {
    return { message: `Performance scores are calculated monthly from attendance and leave data. Visit the **Performance** page for your detailed breakdown.` };
  }
  return {
    message: `I understand you're asking about: "${message}". I can help with leave management, attendance, and performance analytics. Could you be more specific?`
  };
};

/**
 * Leave Forecast — uses Python AI or statistical fallback
 */
const leaveForecast = async (departmentId) => {
  try {
    const response = await axios.get(`${AI_SERVICE}/predict/leave-forecast`, {
      params: { departmentId },
      timeout: 15000,
    });
    return response.data;
  } catch {
    return await buildStatisticalForecast(departmentId);
  }
};

const buildStatisticalForecast = async (departmentId) => {
  // Get historical leave data from DB
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const historicalLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { gte: threeMonthsAgo }
    },
    select: { startDate: true, totalDays: true }
  });

  // Calculate daily average
  const totalDays = historicalLeaves.reduce((s, l) => s + l.totalDays, 0);
  const avgPerDay = historicalLeaves.length > 0 ? totalDays / 90 : 2;

  // Generate 30-day forecast
  const forecast = [];
  const dayWeights = [1.3, 0.9, 0.8, 0.9, 1.4, 0.3, 0.1]; // Mon-Sun

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    const predicted = parseFloat((avgPerDay * dayWeights[date.getDay()]).toFixed(1));
    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted,
      dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()],
      riskLevel: predicted > 4 ? 'HIGH' : predicted > 2 ? 'MEDIUM' : 'LOW'
    });
  }

  const predictions = forecast.map(f => f.predicted);
  const total = predictions.reduce((s, v) => s + v, 0);

  return {
    forecast,
    totalPredicted: Math.round(total),
    avgPerDay: parseFloat((total / 30).toFixed(1)),
    riskLevel: total / 30 > 3 ? 'HIGH' : 'MEDIUM',
    algorithm: 'statistical-fallback',
    message: 'Generated from historical data (AI service offline)'
  };
};

/**
 * Attendance Anomaly Detection
 */
const attendanceAnomaly = async (userId) => {
  try {
    const response = await axios.get(`${AI_SERVICE}/predict/attendance-anomaly`, {
      params: { userId },
      timeout: 15000,
    });
    return response.data;
  } catch {
    return await buildAttendanceAnomalies(userId);
  }
};

const buildAttendanceAnomalies = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const records = await prisma.attendance.findMany({
    where: { userId, date: { gte: thirtyDaysAgo } },
    orderBy: { date: 'desc' }
  });

  const anomalies = [];

  if (records.length > 0) {
    const lateCount = records.filter(r => r.status === 'LATE').length;
    const absentCount = records.filter(r => r.status === 'ABSENT').length;
    const workingDays = records.length;

    if (lateCount / workingDays > 0.2) {
      anomalies.push({
        type: 'FREQUENT_LATE',
        description: `Late ${lateCount} times in the last 30 days (${Math.round(lateCount/workingDays*100)}% of working days)`,
        severity: lateCount > 5 ? 'HIGH' : 'MEDIUM',
        recommendation: 'Consider adjusting check-in time or reviewing commute options'
      });
    }

    if (absentCount / workingDays > 0.15) {
      anomalies.push({
        type: 'HIGH_ABSENTEEISM',
        description: `Absent ${absentCount} times in the last 30 days`,
        severity: 'HIGH',
        recommendation: 'Schedule a wellness check-in with HR'
      });
    }

    // Check Monday pattern
    const mondayAbsences = records.filter(r => new Date(r.date).getDay() === 1 && r.status === 'ABSENT').length;
    if (mondayAbsences >= 2) {
      anomalies.push({
        type: 'MONDAY_PATTERN',
        description: `Absent on ${mondayAbsences} Mondays in the last month`,
        severity: 'LOW',
        recommendation: 'Review weekend-to-workday transition'
      });
    }
  }

  return {
    anomalies,
    count: anomalies.length,
    userId,
    analysisDate: new Date().toISOString(),
    algorithm: 'rule-based-statistical',
    message: anomalies.length > 0 ? `Found ${anomalies.length} attendance pattern(s)` : 'No anomalies detected'
  };
};

/**
 * Attrition Risk Analysis
 */
const attritionRisk = async () => {
  try {
    const response = await axios.get(`${AI_SERVICE}/predict/attrition-risk`, { timeout: 15000 });
    return response.data;
  } catch {
    return await buildAttritionRisk();
  }
};

const buildAttritionRisk = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get performance records with user info
  const perfRecords = await prisma.performanceRecord.findMany({
    where: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } }
      }
    },
    orderBy: { overallScore: 'asc' },
    take: 20
  });

  const employees = perfRecords.map(p => {
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
      factors
    };
  });

  const highRisk = employees.filter(e => e.riskScore >= 60);
  const mediumRisk = employees.filter(e => e.riskScore >= 30 && e.riskScore < 60);

  return {
    employees: employees.sort((a, b) => b.riskScore - a.riskScore),
    highRiskCount: highRisk.length,
    mediumRiskCount: mediumRisk.length,
    totalAnalyzed: employees.length,
    overallRiskLevel: highRisk.length > 3 ? 'HIGH' : highRisk.length > 0 ? 'MEDIUM' : 'LOW',
    recommendations: [
      'Schedule 1-on-1 meetings with high-risk employees',
      'Review attendance policies for employees with patterns',
      'Consider performance improvement plans for low scorers'
    ],
    generatedAt: new Date().toISOString(),
    algorithm: 'performance-based-risk-scoring'
  };
};

module.exports = { chat, leaveForecast, attendanceAnomaly, attritionRisk };
