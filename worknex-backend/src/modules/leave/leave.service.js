const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { countBusinessDays } = require('../../utils/dateHelpers');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { assertCanAccessUser, getAccessibleUserIds, isAdminRole } = require('../../utils/rbac');
const { getOrganizationScope } = require('../../utils/tenant');
const notificationService = require('../notifications/notification.service');
const automation = require('./leave.automation');

const attachDecision = async (leave) => ({
  ...leave,
  decisionExplanation: leave.decisionExplanation || await automation.getDecisionForLeave(leave.id),
});

const audit = async (action, entityId, organizationId, userId, values) => {
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: userId || null,
      action,
      entity: 'LeaveRequest',
      entityId,
      newValues: values || null,
    },
  }).catch(() => {});
};

const getLeaveOrThrow = async (id, include = {}) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id }, include });
  if (!leave) throw new ApiError(404, 'Leave request not found');
  return leave;
};

const assertApproverCanAct = async (approver, leave, action) => {
  if (approver.role !== 'SUPER_ADMIN' && leave.organizationId !== approver.organizationId) {
    throw new ApiError(403, 'Not authorized for this organization');
  }
  if (approver.role === 'MANAGER' && leave.employee.managerId !== approver.id) {
    throw new ApiError(403, `Not authorized to ${action} this leave`);
  }
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(approver.role)) {
    throw new ApiError(403, 'Not authorized');
  }
};

const loadPolicyAndBalance = async (organizationId, userId, leaveType, year) => {
  const policy = await prisma.leavePolicy.findFirst({ where: { organizationId, leaveType } });
  if (!policy) throw new ApiError(400, `No active ${leaveType} leave policy exists`);
  const balance = await prisma.leaveBalance.findFirst({
    where: { organizationId, userId, policyId: policy.id, year },
  });
  if (!balance) throw new ApiError(400, `${leaveType} balance does not exist for ${year}`);
  return { policy, balance };
};

const deductBalance = async (tx, leave) => {
  const year = leave.startDate.getFullYear();
  const policy = await tx.leavePolicy.findFirst({
    where: { organizationId: leave.organizationId, leaveType: leave.leaveType },
  });
  if (!policy) throw new ApiError(400, `No active ${leave.leaveType} leave policy exists`);
  const result = await tx.leaveBalance.updateMany({
    where: {
      organizationId: leave.organizationId,
      userId: leave.employeeId,
      policyId: policy.id,
      year,
      remainingDays: { gte: leave.totalDays },
    },
    data: {
      usedDays: { increment: leave.totalDays },
      remainingDays: { decrement: leave.totalDays },
    },
  });
  if (result.count !== 1) throw new ApiError(400, 'Insufficient leave balance');
};

const restoreBalance = async (tx, leave) => {
  const year = leave.startDate.getFullYear();
  const policy = await tx.leavePolicy.findFirst({
    where: { organizationId: leave.organizationId, leaveType: leave.leaveType },
  });
  if (!policy) return;
  await tx.leaveBalance.updateMany({
    where: { organizationId: leave.organizationId, userId: leave.employeeId, policyId: policy.id, year },
    data: {
      usedDays: { decrement: leave.totalDays },
      remainingDays: { increment: leave.totalDays },
    },
  });
};

const validateDraftOrThrow = async (user, data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'Invalid date range');
  if (end < start) throw new ApiError(400, 'End date must be after start date');

  const totalDays = countBusinessDays(start, end);
  if (totalDays <= 0) throw new ApiError(400, 'No working days in selected range');

  const employee = await prisma.user.findFirst({
    where: { id: user.id, organizationId: user.organizationId },
    select: { id: true, role: true, managerId: true, organizationId: true, firstName: true, lastName: true },
  });
  if (!employee) throw new ApiError(404, 'Employee not found');

  const { policy, balance } = await loadPolicyAndBalance(user.organizationId, user.id, data.leaveType, start.getFullYear());
  if (!policy.applicableRoles.includes(employee.role)) {
    throw new ApiError(400, `${data.leaveType} leave is not applicable to ${employee.role}`);
  }
  if (balance.remainingDays < totalDays) {
    throw new ApiError(400, `Insufficient leave balance. Available: ${balance.remainingDays} days`);
  }

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      organizationId: user.organizationId,
      employeeId: user.id,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) throw new ApiError(409, 'You already have a leave request overlapping these dates');

  return { start, end, totalDays, employee };
};

const applyAutomation = async (leave, employee, actor) => {
  const decision = await automation.evaluateLeaveRequest({
    leave,
    actor,
    excludeLeaveId: leave.id,
  });
  decision.leaveRequestId = leave.id;
  const savedDecision = await automation.saveDecision(decision, actor);

  if (decision.decision === 'AUTO_APPROVED') {
    const updated = await prisma.$transaction(async (tx) => {
      await deductBalance(tx, leave);
      return tx.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'APPROVED', approverId: employee.managerId || null, approverNote: decision.reasons.join('; '), reviewedAt: new Date() },
        include: leaveInclude,
      });
    });
    await notificationService.create(leave.employeeId, 'LEAVE_APPROVED', 'Leave Auto Approved', decision.reasons.join('; '));
    await audit('APPROVE', leave.id, leave.organizationId, actor.id, savedDecision);
    return attachDecision(updated);
  }

  if (decision.decision === 'AUTO_REJECTED') {
    const updated = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: 'REJECTED', approverNote: decision.reasons.join('; '), reviewedAt: new Date() },
      include: leaveInclude,
    });
    await notificationService.create(leave.employeeId, 'LEAVE_REJECTED', 'Leave Auto Rejected', decision.reasons.join('; '));
    await audit('REJECT', leave.id, leave.organizationId, actor.id, savedDecision);
    return attachDecision(updated);
  }

  if (employee.managerId) {
    await notificationService.create(employee.managerId, 'LEAVE_APPLIED', 'New Leave Request', `${employee.firstName} ${employee.lastName} applied for ${leave.leaveType} leave`);
  }
  await audit('UPDATE', leave.id, leave.organizationId, actor.id, savedDecision);
  return attachDecision({ ...leave, decisionExplanation: savedDecision });
};

const leaveInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true, managerId: true, department: true } },
  approver: { select: { id: true, firstName: true, lastName: true } },
};

const applyLeave = async (user, data) => {
  const { start, end, totalDays, employee } = await validateDraftOrThrow(user, data);

  const leave = await prisma.leaveRequest.create({
    data: {
      organizationId: user.organizationId,
      employeeId: user.id,
      approverId: employee.managerId || null,
      leaveType: data.leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason: data.reason,
    },
    include: leaveInclude,
  });

  return applyAutomation(leave, employee, user);
};

const approveLeave = async (approver, leaveId, note) => {
  const leave = await getLeaveOrThrow(leaveId, { employee: { select: { managerId: true } } });
  await assertApproverCanAct(approver, leave, 'approve');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'Leave is not in pending state');

  const updated = await prisma.$transaction(async (tx) => {
    await deductBalance(tx, leave);
    return tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: 'APPROVED', approverId: approver.id, approverNote: note, reviewedAt: new Date() },
      include: leaveInclude,
    });
  });

  const decision = await automation.saveDecision({
    leaveRequestId: leaveId,
    organizationId: leave.organizationId,
    employeeId: leave.employeeId,
    decision: 'APPROVED',
    confidence: 1,
    reasons: [note || 'Approved by authorized approver'],
    requiredApprovals: [],
    policyVersionId: null,
  }, approver);
  await audit('APPROVE', leaveId, leave.organizationId, approver.id, decision);
  await notificationService.create(leave.employeeId, 'LEAVE_APPROVED', 'Leave Approved', `Your ${leave.leaveType} leave request has been approved`);
  return attachDecision(updated);
};

const rejectLeave = async (approver, leaveId, note) => {
  const leave = await getLeaveOrThrow(leaveId, { employee: { select: { managerId: true } } });
  await assertApproverCanAct(approver, leave, 'reject');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'Leave is not in pending state');

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: 'REJECTED', approverId: approver.id, approverNote: note, reviewedAt: new Date() },
    include: leaveInclude,
  });
  const decision = await automation.saveDecision({
    leaveRequestId: leaveId,
    organizationId: leave.organizationId,
    employeeId: leave.employeeId,
    decision: 'REJECTED',
    confidence: 1,
    reasons: [note || 'Rejected by authorized approver'],
    requiredApprovals: [],
    policyVersionId: null,
  }, approver);
  await audit('REJECT', leaveId, leave.organizationId, approver.id, decision);
  await notificationService.create(leave.employeeId, 'LEAVE_REJECTED', 'Leave Rejected', `Your ${leave.leaveType} leave request has been rejected. Reason: ${note || 'N/A'}`);
  return attachDecision(updated);
};

const cancelLeave = async (user, leaveId) => {
  const leave = await getLeaveOrThrow(leaveId);
  if (leave.organizationId !== user.organizationId) throw new ApiError(403, 'Not authorized');
  if (leave.employeeId !== user.id) throw new ApiError(403, 'Not authorized');
  if (!['PENDING', 'APPROVED'].includes(leave.status)) throw new ApiError(400, 'Cannot cancel this leave');

  const updated = await prisma.$transaction(async (tx) => {
    if (leave.status === 'APPROVED') await restoreBalance(tx, leave);
    return tx.leaveRequest.update({ where: { id: leaveId }, data: { status: 'CANCELLED' }, include: leaveInclude });
  });
  await audit('UPDATE', leaveId, leave.organizationId, user.id, { action: 'CANCELLED' });
  await notificationService.create(leave.employeeId, 'LEAVE_REJECTED', 'Leave Cancelled', `Your ${leave.leaveType} leave request was cancelled`);
  return attachDecision(updated);
};

const getLeaves = async (query, user) => {
  const { skip, take, page, limit } = paginate(query);
  const where = { ...getOrganizationScope(user) };
  if (user.role === 'EMPLOYEE') where.employeeId = user.id;
  else if (user.role === 'MANAGER') where.employeeId = { in: await getAccessibleUserIds(user) };
  if (query.status) where.status = query.status;
  if (query.leaveType) where.leaveType = query.leaveType;
  if (query.employeeId && user.role !== 'EMPLOYEE') {
    await assertCanAccessUser(user, query.employeeId);
    where.employeeId = query.employeeId;
  }

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({ where, skip, take, include: leaveInclude, orderBy: { appliedAt: 'desc' } }),
    prisma.leaveRequest.count({ where }),
  ]);
  return { leaves: await Promise.all(leaves.map(attachDecision)), meta: paginateMeta(total, page, limit) };
};

const getMyLeaves = async (user, query) => getLeaves(query, { ...user, role: 'EMPLOYEE' });

const getPendingLeaves = async (user) => {
  const where = { status: 'PENDING', ...getOrganizationScope(user) };
  if (user.role === 'MANAGER') where.employeeId = { in: await getAccessibleUserIds(user) };
  const leaves = await prisma.leaveRequest.findMany({ where, include: leaveInclude, orderBy: { appliedAt: 'asc' } });
  return Promise.all(leaves.map(attachDecision));
};

const getLeaveById = async (id, user) => {
  const leave = await getLeaveOrThrow(id, leaveInclude);
  if (user.role !== 'SUPER_ADMIN' && leave.organizationId !== user.organizationId) throw new ApiError(403, 'Not authorized for this organization');
  if (user.role === 'EMPLOYEE' && leave.employeeId !== user.id) throw new ApiError(403, 'Not authorized to access this leave');
  if (user.role === 'MANAGER' && leave.employee.managerId !== user.id) throw new ApiError(403, 'Not authorized to access this leave');
  return attachDecision(leave);
};

const getMyBalances = async (user) => {
  const year = new Date().getFullYear();
  return prisma.leaveBalance.findMany({ where: { userId: user.id, organizationId: user.organizationId, year }, include: { policy: true } });
};

const getUserBalances = async (userId, requestingUser) => {
  await assertCanAccessUser(requestingUser, userId);
  const year = new Date().getFullYear();
  return prisma.leaveBalance.findMany({ where: { userId, ...getOrganizationScope(requestingUser), year }, include: { policy: true } });
};

const getPolicies = async (requestingUser) => prisma.leavePolicy.findMany({ where: getOrganizationScope(requestingUser) });

const createPolicy = async (data, requestingUser) => {
  return prisma.leavePolicy.create({ data: { ...data, organizationId: requestingUser.organizationId } });
};

const updatePolicy = async (id, data, requestingUser) => {
  const policy = await prisma.leavePolicy.findUnique({ where: { id }, select: { organizationId: true } });
  if (!policy) throw new ApiError(404, 'Policy not found');
  if (requestingUser.role !== 'SUPER_ADMIN' && policy.organizationId !== requestingUser.organizationId) throw new ApiError(403, 'Not authorized for this organization');
  const { organizationId, ...safeData } = data;
  return prisma.leavePolicy.update({ where: { id }, data: safeData });
};

const evaluateExistingLeave = async (id, user) => {
  const leave = await getLeaveById(id, user);
  const decision = await automation.evaluateLeaveRequest({ leave, actor: user, excludeLeaveId: leave.id });
  decision.leaveRequestId = leave.id;
  return automation.saveDecision(decision, user);
};

const getDecisionExplanation = async (id, user) => {
  await getLeaveById(id, user);
  return await automation.getDecisionForLeave(id) || {
    leaveRequestId: id,
    decision: 'NEEDS_HUMAN_REVIEW',
    confidence: 0,
    reasons: ['No decision log exists for this leave request yet'],
    requiredApprovals: [],
    policyVersionId: null,
  };
};

module.exports = {
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaves,
  getMyLeaves,
  getPendingLeaves,
  getLeaveById,
  getMyBalances,
  getUserBalances,
  getPolicies,
  createPolicy,
  updatePolicy,
  evaluateExistingLeave,
  getDecisionExplanation,
  uploadPolicyDocument: automation.uploadPolicyDocument,
  extractPolicyDocument: automation.extractPolicyDocument,
  aiParsePolicyDocument: automation.aiParsePolicyDocument,
  approvePolicyRules: automation.approvePolicyRules,
};
