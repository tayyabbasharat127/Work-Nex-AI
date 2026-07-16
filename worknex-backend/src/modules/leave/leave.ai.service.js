/**
 * AI Leave Advisor — generates a non-binding recommendation for a leave
 * request, for managers/admins to consider. Never approves, rejects, or
 * changes workflow state, balances, or notifications; it only writes the
 * six `ai*` scalar fields on the LeaveRequest row.
 *
 * Contract: generateRecommendation() NEVER throws. Any failure (toggle off,
 * AI service unreachable, timeout, malformed response) is logged and the
 * original leave is returned unchanged — leave submission must never fail
 * because the advisor failed.
 */
const axios = require('axios');
const prisma = require('../../config/db');
const { config } = require('../../config/env');
const logger = require('../../config/logger');
const { aiServiceHeaders } = require('../../utils/aiServiceAuth');
const leaveSandwich = require('./leave.sandwich');

const AI_SERVICE_URL = config.aiServiceUrl;
const AI_ADVISOR_TIMEOUT_MS = 15000;
const VALID_RECOMMENDATIONS = ['APPROVE', 'REJECT', 'REVIEW'];
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const isAiLeaveAdvisorEnabled = async (organizationId) => {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
  return Boolean(settings?.aiLeaveAdvisorEnabled);
};

const getAttendanceSummary90d = async (userId, organizationId) => {
  const since = new Date(Date.now() - NINETY_DAYS_MS);
  const grouped = await prisma.attendance.groupBy({
    by: ['status'],
    where: { userId, organizationId, date: { gte: since } },
    _count: { status: true },
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count.status]));
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const presentLike = (counts.PRESENT || 0) + (counts.LATE || 0) + (counts.HALF_DAY || 0);
  return {
    attendancePercent: total ? Math.round((presentLike / total) * 100) : null,
    absenceCount: counts.ABSENT || 0,
    lateCount: counts.LATE || 0,
  };
};

const getPolicyContext = async (organizationId, leaveType) => {
  const sandwichEnabled = await leaveSandwich.isSandwichEnabled(organizationId);
  const activeVersion = await prisma.leavePolicyVersion.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });
  const rule = activeVersion?.rulesJson?.leavePolicies?.find((r) => r.leaveType === leaveType);
  return { sandwichEnabled, maxConsecutiveDays: rule?.maxConsecutiveDays ?? null };
};

// Advisory-only balance lookup — tolerant of a missing policy/balance (unlike
// leave.service.js's loadPolicyAndBalance, this never throws; it just omits
// the figures from the prompt).
const getBalanceContext = async (leave) => {
  const policy = await prisma.leavePolicy.findFirst({
    where: { organizationId: leave.organizationId, leaveType: leave.balanceLeaveType },
  });
  if (!policy) return { remainingDays: null, totalDays: null };
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      organizationId: leave.organizationId,
      userId: leave.employeeId,
      policyId: policy.id,
      year: new Date(leave.startDate).getFullYear(),
    },
  });
  return { remainingDays: balance?.remainingDays ?? null, totalDays: balance?.totalDays ?? null };
};

const isValidRecommendation = (result) => Boolean(
  result
  && VALID_RECOMMENDATIONS.includes(result.recommendation)
  && Number.isInteger(result.confidence) && result.confidence >= 0 && result.confidence <= 100
  && Array.isArray(result.reasoning)
  && Array.isArray(result.policyObservations),
);

const buildPayload = (leave, employee, balance, attendance, policies) => {
  const empRow = leave.employee || {};
  return {
    employee: {
      role: employee?.customRole?.tier || null,
      department: empRow.department?.name || null,
      hasManager: Boolean(empRow.managerId ?? employee?.managerId),
      remainingDays: balance?.remainingDays ?? null,
      totalDays: balance?.totalDays ?? null,
    },
    leave: {
      type: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      totalDays: leave.totalDays,
      isEmergency: leave.leaveType === 'EMERGENCY',
      reason: leave.reason,
    },
    attendance,
    policies,
  };
};

const generateRecommendation = async (leave, { employee, organizationId }) => {
  try {
    if (!(await isAiLeaveAdvisorEnabled(organizationId))) return leave;
    if (!(AI_SERVICE_URL || config.modelKeysConfigured)) return leave;

    const [attendance, policies, balance] = await Promise.all([
      getAttendanceSummary90d(leave.employeeId, organizationId),
      getPolicyContext(organizationId, leave.leaveType),
      getBalanceContext(leave),
    ]);
    const payload = buildPayload(leave, employee, balance, attendance, policies);

    const resp = await axios.post(
      `${AI_SERVICE_URL}/predict/leave-advisor`,
      payload,
      { headers: aiServiceHeaders(organizationId), timeout: AI_ADVISOR_TIMEOUT_MS },
    );
    const result = resp.data;
    if (!isValidRecommendation(result)) {
      if (result) logger.warn('AI leave advisor returned a malformed response', { leaveId: leave.id });
      return leave;
    }

    const aiFields = {
      aiRecommendation: result.recommendation,
      aiConfidence: result.confidence,
      aiReasoning: result.reasoning,
      aiPolicyObservations: result.policyObservations,
      aiGeneratedAt: new Date(),
      aiModel: result.model || null,
    };
    await prisma.leaveRequest.update({ where: { id: leave.id }, data: aiFields });
    return { ...leave, ...aiFields };
  } catch (error) {
    logger.warn('AI leave advisor failed', { leaveId: leave?.id, error: error.message });
    return leave;
  }
};

module.exports = {
  isAiLeaveAdvisorEnabled,
  generateRecommendation,
};
