const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { countBusinessDays } = require('../../utils/dateHelpers');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { assertCanAccessUser, getAccessibleUserIds, isAdminRole } = require('../../utils/rbac');
const { getOrganizationScope } = require('../../utils/tenant');
const notificationService = require('../notifications/notification.service');
const { sendEmail } = require('../../config/email');
const automation = require('./leave.automation');
const { getHolidaysInRange } = require('../attendance/attendance.processor');
const leaveSandwich = require('./leave.sandwich');
const logger = require('../../config/logger');
const leaveWorkflow = require('./leave.workflow');

const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);
const { PENDING_LEAVE_STATUSES } = leaveWorkflow;

const getRequestLeaveLabel = async (leave) => {
  if (leave.leaveType === 'EMERGENCY') return 'Emergency Leave';
  if (leave.leaveType === 'OTHER' && leave.otherLeaveName) return leave.otherLeaveName;
  const labels = await automation.getLeaveTypeLabels(leave.organizationId);
  return labels[leave.leaveType] || leave.leaveType;
};

// Fire-and-forget — a broken SMTP config must never block a leave decision.
const notifyByEmail = (to, subject, html) => {
  if (!to) return;
  sendEmail(to, subject, html).catch(() => {});
};

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

const getLeaveOrThrow = async (id, organizationId, include = {}) => {
  if (!organizationId) throw new ApiError(403, 'Organization context required');
  const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId }, include });
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

  const approvalAction = leaveWorkflow.getApprovalAction({
    actorRole: approver.role,
    status: leave.status,
    managerId: leave.employee.managerId,
  });
  if (approver.role === 'MANAGER' && approvalAction !== 'MANAGER_FORWARD') {
    throw new ApiError(409, `Manager cannot ${action} a leave that is not awaiting manager review`);
  }
  if (['ADMIN', 'SUPER_ADMIN'].includes(approver.role) && approvalAction !== 'ADMIN_FINAL') {
    throw new ApiError(409, `Admin cannot ${action} this leave until manager approval is complete`);
  }
};

const getOrganizationAdmins = (organizationId) => prisma.user.findMany({
  where: {
    organizationId,
    isActive: true,
    customRole: { tier: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  },
  select: { id: true, email: true, firstName: true },
});

const notifyAdminsForFinalReview = async (leave, employee) => {
  const leaveLabel = await getRequestLeaveLabel(leave);
  const admins = await getOrganizationAdmins(leave.organizationId);
  await Promise.all(admins.map(async (admin) => {
    await notificationService.create(
      admin.id,
      'LEAVE_APPLIED',
      'Leave Awaiting Final Approval',
      `${employee.firstName} ${employee.lastName}'s ${leaveLabel} is ready for final admin approval`,
    );
    notifyByEmail(
      admin.email,
      'Leave awaiting final approval',
      `<p>Hi ${admin.firstName},</p><p><b>${employee.firstName} ${employee.lastName}</b>'s <b>${leaveLabel}</b> (${fmtDate(leave.startDate)} to ${fmtDate(leave.endDate)}) is ready for final admin approval.</p>`,
    );
  }));
};

const loadPolicyAndBalance = async (organizationId, userId, leaveType, year) => {
  const policy = await prisma.leavePolicy.findFirst({ where: { organizationId, leaveType } });
  const label = (await automation.getLeaveTypeLabels(organizationId))[leaveType] || leaveType;
  if (!policy) throw new ApiError(400, `No active ${label} leave policy exists`);
  const balance = await prisma.leaveBalance.findFirst({
    where: { organizationId, userId, policyId: policy.id, year },
  });
  if (!balance) throw new ApiError(400, `${label} balance does not exist for ${year}`);
  return { policy, balance };
};

const deductBalance = async (tx, leave) => {
  const year = leave.startDate.getFullYear();
  const balanceLeaveType = leave.balanceLeaveType || leaveWorkflow.getBalanceLeaveType(leave.leaveType);
  const policy = await tx.leavePolicy.findFirst({
    where: { organizationId: leave.organizationId, leaveType: balanceLeaveType },
  });
  if (!policy) throw new ApiError(400, `No active ${balanceLeaveType} leave policy exists to fund this request`);
  // No `remainingDays >= totalDays` guard here on purpose: a balance can be
  // deducted into negative territory. The automation engine only lets this
  // path run for AUTO_APPROVED (balance was already sufficient) or for a
  // request an admin explicitly approved as an emergency advance — by the
  // time either happens, the "is this OK" decision has already been made.
  const result = await tx.leaveBalance.updateMany({
    where: { organizationId: leave.organizationId, userId: leave.employeeId, policyId: policy.id, year },
    data: {
      usedDays: { increment: leave.totalDays },
      remainingDays: { decrement: leave.totalDays },
    },
  });
  if (result.count !== 1) throw new ApiError(400, `${leave.leaveType} balance record for ${year} not found`);
};

const restoreBalance = async (tx, leave) => {
  const year = leave.startDate.getFullYear();
  const balanceLeaveType = leave.balanceLeaveType || leaveWorkflow.getBalanceLeaveType(leave.leaveType);
  const policy = await tx.leavePolicy.findFirst({
    where: { organizationId: leave.organizationId, leaveType: balanceLeaveType },
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
  const otherLeaveName = data.leaveType === 'OTHER' ? String(data.otherLeaveName || '').trim() : null;
  if (data.leaveType === 'OTHER' && (otherLeaveName.length < 2 || otherLeaveName.length > 100)) {
    throw new ApiError(400, 'Other leave name must be between 2 and 100 characters');
  }

  const holidays = await getHolidaysInRange(user.organizationId, start, end);
  if (holidays.length) {
    const holiday = holidays[0];
    const observedDate = holiday.observedDate.toISOString().slice(0, 10);
    throw new ApiError(400, `Leave cannot be applied across ${holiday.name} (${observedDate}), which is a configured holiday`);
  }

  const totalDays = countBusinessDays(start, end);
  if (totalDays <= 0) throw new ApiError(400, 'No working days in selected range');

  const employee = await prisma.user.findFirst({
    where: { id: user.id, organizationId: user.organizationId },
    select: {
      id: true, roleId: true, managerId: true, organizationId: true, firstName: true, lastName: true, email: true,
      customRole: { select: { name: true, tier: true } },
    },
  });
  if (!employee) throw new ApiError(404, 'Employee not found');

  const balanceLeaveType = leaveWorkflow.getBalanceLeaveType(data.leaveType);
  const { policy, balance } = await loadPolicyAndBalance(user.organizationId, user.id, balanceLeaveType, start.getFullYear());
  if (!policy.applicableRoleIds.includes(employee.roleId)) {
    const label = (await automation.getLeaveTypeLabels(user.organizationId))[data.leaveType] || data.leaveType;
    throw new ApiError(400, `${label} leave is not applicable to ${employee.customRole.name}`);
  }
  // Insufficient balance no longer blocks submission outright — it's allowed
  // through as a potential emergency-advance request; the automation engine
  // (evaluateLeaveRequest) routes it to an admin instead of auto-rejecting or
  // auto-approving it. The admin's decision, not this draft check, is what
  // actually permits the balance to go negative.

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      organizationId: user.organizationId,
      employeeId: user.id,
      status: { in: [...PENDING_LEAVE_STATUSES, 'APPROVED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) throw new ApiError(409, 'You already have a leave request overlapping these dates');

  const now = new Date();
  const emergencyRecoveryDate = data.leaveType === 'EMERGENCY'
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    : null;
  return { start, end, totalDays, employee, otherLeaveName, balanceLeaveType, emergencyRecoveryDate };
};

const applyAutomation = async (leave, employee, actor) => {
  const leaveLabel = await getRequestLeaveLabel(leave);
  const decision = await automation.evaluateLeaveRequest({
    leave,
    actor,
    excludeLeaveId: leave.id,
  });
  decision.leaveRequestId = leave.id;

  const requesterTier = employee.customRole?.tier || actor.role;
  const requiresApprovalHierarchy = !['ADMIN', 'SUPER_ADMIN'].includes(requesterTier);
  if (decision.decision !== 'AUTO_REJECTED' && requiresApprovalHierarchy) {
    const initialStage = leaveWorkflow.getInitialApprovalStage({ requesterTier, managerId: employee.managerId, leaveType: leave.leaveType });
    const startsWithManager = initialStage === 'PENDING_MANAGER';
    decision.decision = initialStage;
    decision.requiredApprovals = startsWithManager ? ['MANAGER', 'ADMIN'] : ['ADMIN'];
    decision.reasons = [
      startsWithManager
        ? 'Two-stage approval required: manager review followed by final admin approval'
        : 'Final admin approval required',
      ...decision.reasons,
    ];
  }

  // AUTO_APPROVED/AUTO_REJECTED are the engine's decision, not the applicant's —
  // attribute them to the system, not the employee who happened to submit.
  const isSystemDecision = decision.decision.startsWith('AUTO_');
  if (isSystemDecision) decision.reasons = ['[SYSTEM] Automated decision', ...decision.reasons];
  const savedDecision = await automation.saveDecision(decision, isSystemDecision ? null : actor);

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
    notifyByEmail(
      employee.email,
      'Your leave has been auto-approved',
      `<p>Hi ${employee.firstName},</p><p>Your <b>${leaveLabel}</b> leave (${fmtDate(leave.startDate)} to ${fmtDate(leave.endDate)}) has been automatically approved.</p><p>${decision.reasons.join('; ')}</p>`,
    );
    if (employee.managerId) {
      const manager = await prisma.user.findUnique({ where: { id: employee.managerId }, select: { email: true, firstName: true } });
      if (manager) {
        await notificationService.create(employee.managerId, 'LEAVE_APPLIED', 'Team Leave Auto Approved', `${employee.firstName} ${employee.lastName}'s ${leaveLabel} leave was auto-approved`);
        notifyByEmail(
          manager.email,
          `${employee.firstName} ${employee.lastName}'s leave was auto-approved`,
          `<p>Hi ${manager.firstName},</p><p><b>${employee.firstName} ${employee.lastName}</b>'s <b>${leaveLabel}</b> leave (${fmtDate(leave.startDate)} to ${fmtDate(leave.endDate)}) was automatically approved per policy — no action needed from you.</p>`,
        );
      }
    }
    await audit('APPROVE', leave.id, leave.organizationId, actor.id, savedDecision);
    triggerMirrorSandwichCheck(updated);
    return attachDecision(updated);
  }

  if (decision.decision === 'AUTO_REJECTED') {
    const updated = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: 'REJECTED', approverNote: decision.reasons.join('; '), reviewedAt: new Date() },
      include: leaveInclude,
    });
    await notificationService.create(leave.employeeId, 'LEAVE_REJECTED', 'Leave Auto Rejected', decision.reasons.join('; '));
    notifyByEmail(
      employee.email,
      'Your leave request was not approved',
      `<p>Hi ${employee.firstName},</p><p>Your <b>${leaveLabel}</b> leave (${fmtDate(leave.startDate)} to ${fmtDate(leave.endDate)}) could not be approved.</p><p>${decision.reasons.join('; ')}</p>`,
    );
    await audit('REJECT', leave.id, leave.organizationId, actor.id, savedDecision);
    return attachDecision(updated);
  }

  const pendingStatus = decision.decision === 'PENDING_MANAGER' ? 'PENDING_MANAGER' : 'PENDING_ADMIN';
  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: {
      status: pendingStatus,
      approverId: pendingStatus === 'PENDING_MANAGER' ? employee.managerId : null,
    },
    include: leaveInclude,
  });

  if (pendingStatus === 'PENDING_MANAGER' && employee.managerId) {
    await notificationService.create(employee.managerId, 'LEAVE_APPLIED', 'New Leave Request', `${employee.firstName} ${employee.lastName} applied for ${leaveLabel} leave`);
  } else {
    await notifyAdminsForFinalReview(updated, employee);
  }
  await audit('UPDATE', leave.id, leave.organizationId, actor.id, savedDecision);
  return attachDecision({ ...updated, decisionExplanation: savedDecision });
};

const leaveInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true, managerId: true, department: true } },
  approver: { select: { id: true, firstName: true, lastName: true } },
  managerApprover: { select: { id: true, firstName: true, lastName: true } },
  adminApprover: { select: { id: true, firstName: true, lastName: true } },
};

const applyLeave = async (user, data) => {
  const { start, end, totalDays, employee, otherLeaveName, balanceLeaveType, emergencyRecoveryDate } = await validateDraftOrThrow(user, data);

  const leave = await prisma.leaveRequest.create({
    data: {
      organizationId: user.organizationId,
      employeeId: user.id,
      approverId: employee.managerId || null,
      leaveType: data.leaveType,
      otherLeaveName,
      balanceLeaveType,
      emergencyRecoveryDate,
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
  const leave = await getLeaveOrThrow(leaveId, approver.organizationId, {
    employee: { select: { managerId: true, firstName: true, lastName: true, email: true } },
  });
  await assertApproverCanAct(approver, leave, 'approve');
  const leaveLabel = await getRequestLeaveLabel(leave);

  if (approver.role === 'MANAGER') {
    const managerReviewedAt = new Date();
    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: 'PENDING_ADMIN',
        managerApproverId: approver.id,
        managerReviewedAt,
        managerNote: note || null,
        approverId: approver.id,
        approverNote: note || 'Approved by manager; awaiting final admin approval',
        reviewedAt: managerReviewedAt,
      },
      include: leaveInclude,
    });

    const decision = await automation.saveDecision({
      leaveRequestId: leaveId,
      organizationId: leave.organizationId,
      employeeId: leave.employeeId,
      decision: 'PENDING_ADMIN',
      confidence: 1,
      reasons: [note || 'Manager approved; awaiting final admin approval'],
      requiredApprovals: ['ADMIN'],
      policyVersionId: null,
    }, approver);
    await audit('APPROVE', leaveId, leave.organizationId, approver.id, decision);
    await notificationService.create(
      leave.employeeId,
      'LEAVE_APPLIED',
      'Manager Approved Your Leave',
      `Your ${leaveLabel} passed manager review and is awaiting final admin approval`,
    );
    await notifyAdminsForFinalReview(updated, leave.employee);
    return attachDecision(updated);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await deductBalance(tx, leave);
    return tx.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: 'APPROVED',
        adminApproverId: approver.id,
        adminReviewedAt: new Date(),
        adminNote: note || null,
        approverId: approver.id,
        approverNote: note,
        reviewedAt: new Date(),
      },
      include: leaveInclude,
    });
  });

  const decision = await automation.saveDecision({
    leaveRequestId: leaveId,
    organizationId: leave.organizationId,
    employeeId: leave.employeeId,
    decision: 'APPROVED',
    confidence: 1,
    reasons: [note || 'Final approval granted by admin'],
    requiredApprovals: [],
    policyVersionId: null,
  }, approver);
  await audit('APPROVE', leaveId, leave.organizationId, approver.id, decision);
  await notificationService.create(leave.employeeId, 'LEAVE_APPROVED', 'Leave Finally Approved', `Your ${leaveLabel} request has received final admin approval`);
  triggerMirrorSandwichCheck(updated);
  return attachDecision(updated);
};

const rejectLeave = async (approver, leaveId, note) => {
  const leave = await getLeaveOrThrow(leaveId, approver.organizationId, {
    employee: { select: { managerId: true, firstName: true, lastName: true, email: true } },
  });
  await assertApproverCanAct(approver, leave, 'reject');
  const leaveLabel = await getRequestLeaveLabel(leave);

  const isManagerDecision = approver.role === 'MANAGER';
  const reviewedAt = new Date();

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: 'REJECTED',
      approverId: approver.id,
      approverNote: note,
      reviewedAt,
      ...(isManagerDecision
        ? { managerApproverId: approver.id, managerReviewedAt: reviewedAt, managerNote: note || null }
        : { adminApproverId: approver.id, adminReviewedAt: reviewedAt, adminNote: note || null }),
    },
    include: leaveInclude,
  });
  const decision = await automation.saveDecision({
    leaveRequestId: leaveId,
    organizationId: leave.organizationId,
    employeeId: leave.employeeId,
    decision: isManagerDecision ? 'REJECTED_BY_MANAGER' : 'REJECTED_BY_ADMIN',
    confidence: 1,
    reasons: [note || `Rejected by ${isManagerDecision ? 'manager' : 'admin'}`],
    requiredApprovals: [],
    policyVersionId: null,
  }, approver);
  await audit('REJECT', leaveId, leave.organizationId, approver.id, decision);
  await notificationService.create(leave.employeeId, 'LEAVE_REJECTED', 'Leave Rejected', `Your ${leaveLabel} request was rejected by ${isManagerDecision ? 'your manager' : 'an admin'}. Reason: ${note || 'N/A'}`);
  return attachDecision(updated);
};

const triggerMirrorSandwichCheck = (leave) => {
  leaveSandwich.detectSandwichForNewLeave(leave, leave.organizationId)
    .then((match) => match && applySandwichPenalty(
      match.leaveRequestId,
      match.extraDays,
      match.gapDescription,
      leave.organizationId,
    ))
    .catch((error) => logger.error('Sandwich mirror check failed', { error: error.message, stack: error.stack }));
};

const applySandwichPenalty = async (leaveRequestId, extraDays, gapDescription, organizationId) => {
  const leave = await getLeaveOrThrow(leaveRequestId, organizationId, {
    employee: { select: { id: true, firstName: true, lastName: true, managerId: true } },
  });
  const year = leave.startDate.getFullYear();

  const updated = await prisma.$transaction(async (tx) => {
    const balanceLeaveType = leave.balanceLeaveType || leaveWorkflow.getBalanceLeaveType(leave.leaveType);
    const policy = await tx.leavePolicy.findFirst({ where: { organizationId: leave.organizationId, leaveType: balanceLeaveType } });
    if (policy) {
      await tx.leaveBalance.updateMany({
        where: { organizationId: leave.organizationId, userId: leave.employeeId, policyId: policy.id, year },
        data: { usedDays: { increment: extraDays }, remainingDays: { decrement: extraDays } },
      });
    }
    return tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        totalDays: { increment: extraDays },
        isSandwiched: true,
        sandwichExtraDays: extraDays,
        approverNote: [leave.approverNote, `Sandwich rule applied: ${gapDescription}`].filter(Boolean).join(' | '),
      },
      include: leaveInclude,
    });
  });

  await audit('UPDATE', leaveRequestId, leave.organizationId, null, { action: 'SANDWICH_ADJUSTMENT', extraDays, gapDescription });
  await notificationService.create(leave.employeeId, 'SYSTEM', 'Leave Adjusted — Sandwich Rule', `Your ${leave.leaveType} leave now deducts ${extraDays} extra day(s): ${gapDescription}`);
  if (leave.employee.managerId) {
    await notificationService.create(leave.employee.managerId, 'SYSTEM', 'Sandwich Leave Adjustment', `${leave.employee.firstName} ${leave.employee.lastName}'s leave was adjusted (+${extraDays} day(s)) per sandwich policy: ${gapDescription}`);
  }
  return attachDecision(updated);
};

const cancelLeave = async (user, leaveId) => {
  const leave = await getLeaveOrThrow(leaveId, user.organizationId);
  if (leave.organizationId !== user.organizationId) throw new ApiError(403, 'Not authorized');
  if (leave.employeeId !== user.id) throw new ApiError(403, 'Not authorized');
  if (![...PENDING_LEAVE_STATUSES, 'APPROVED'].includes(leave.status)) throw new ApiError(400, 'Cannot cancel this leave');

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
  const where = { ...getOrganizationScope(user) };
  if (user.role === 'MANAGER') {
    where.status = { in: ['PENDING_MANAGER', 'PENDING'] };
    where.employeeId = { in: await getAccessibleUserIds(user) };
  } else {
    where.OR = [
      { status: 'PENDING_ADMIN' },
      { status: 'PENDING', employee: { managerId: null } },
    ];
  }
  const leaves = await prisma.leaveRequest.findMany({ where, include: leaveInclude, orderBy: { appliedAt: 'asc' } });
  return Promise.all(leaves.map(attachDecision));
};

const getLeaveById = async (id, user) => {
  const leave = await getLeaveOrThrow(id, user.organizationId, leaveInclude);
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

const getActivePolicyVersion = async (requestingUser) => automation.getActivePolicyVersion(requestingUser.organizationId);

const getLeaveTypeLabels = async (requestingUser) => automation.getLeaveTypeLabels(requestingUser.organizationId);

// Real recent leave-demand history — used by the AI service to seed the leave
// forecast's rolling average instead of a fixed constant (see forecast_service.py).
const getDailyLeaveCounts = async (requestingUser, days = 14) => {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const [leaves, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
    where: {
      ...getOrganizationScope(requestingUser),
      status: 'APPROVED',
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { startDate: true, endDate: true },
    }),
    getHolidaysInRange(requestingUser.organizationId, start, end),
  ]);
  const holidayDates = new Set(holidays.map((holiday) => holiday.observedDate.toISOString().slice(0, 10)));

  const counts = {};
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !holidayDates.has(key)) counts[key] = 0;
  }

  leaves.forEach((leave) => {
    const from = leave.startDate < start ? start : leave.startDate;
    const to = leave.endDate > end ? end : leave.endDate;
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= to) {
      const key = cursor.toISOString().slice(0, 10);
      if (key in counts) counts[key] += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  });

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const createPolicy = async (data, requestingUser) => {
  const allowed = ['leaveType', 'totalDays', 'carryForward', 'maxCarryForward', 'applicableRoleIds', 'description'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
  return prisma.leavePolicy.create({ data: { ...safeData, organizationId: requestingUser.organizationId } });
};

const updatePolicy = async (id, data, requestingUser) => {
  const policy = await prisma.leavePolicy.findFirst({ where: { id, ...getOrganizationScope(requestingUser) }, select: { organizationId: true } });
  if (!policy) throw new ApiError(404, 'Policy not found');
  if (requestingUser.role !== 'SUPER_ADMIN' && policy.organizationId !== requestingUser.organizationId) throw new ApiError(403, 'Not authorized for this organization');
  const allowed = ['leaveType', 'totalDays', 'carryForward', 'maxCarryForward', 'applicableRoleIds', 'description'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
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
  applySandwichPenalty,
  getLeaves,
  getMyLeaves,
  getPendingLeaves,
  getLeaveById,
  getMyBalances,
  getUserBalances,
  getPolicies,
  getActivePolicyVersion,
  getLeaveTypeLabels,
  getDailyLeaveCounts,
  createPolicy,
  updatePolicy,
  evaluateExistingLeave,
  getDecisionExplanation,
  uploadPolicyDocument: automation.uploadPolicyDocument,
  extractPolicyDocument: automation.extractPolicyDocument,
  aiParsePolicyDocument: automation.aiParsePolicyDocument,
  approvePolicyRules: automation.approvePolicyRules,
  saveManualPolicyRules: automation.saveManualPolicyRules,
};
