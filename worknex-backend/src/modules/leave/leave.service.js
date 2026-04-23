const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { countBusinessDays } = require('../../utils/dateHelpers');
const { paginate, paginateMeta } = require('../../utils/pagination');
const notificationService = require('../notifications/notification.service');

const applyLeave = async (employeeId, data) => {
  const { leaveType, startDate, endDate, reason } = data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) throw new ApiError(400, 'End date must be after start date');

  const totalDays = countBusinessDays(start, end);
  if (totalDays === 0) throw new ApiError(400, 'No working days in selected range');

  // Check leave balance
  const year = start.getFullYear();
  const policy = await prisma.leavePolicy.findFirst({ where: { leaveType } });
  if (policy) {
    const balance = await prisma.leaveBalance.findFirst({
      where: { userId: employeeId, policyId: policy.id, year },
    });
    if (balance && balance.remainingDays < totalDays) {
      throw new ApiError(400, `Insufficient leave balance. Available: ${balance.remainingDays} days`);
    }
  }

  // Check for overlapping leaves
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    },
  });
  if (overlap) throw new ApiError(409, 'You already have a leave request overlapping these dates');

  // Find approver (manager or admin)
  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  const approverId = employee.managerId || null;

  const leave = await prisma.leaveRequest.create({
    data: { employeeId, approverId, leaveType, startDate: start, endDate: end, totalDays, reason },
    include: { employee: { select: { firstName: true, lastName: true, email: true } } },
  });

  // Notify approver
  if (approverId) {
    await notificationService.create(approverId, 'LEAVE_APPLIED', 'New Leave Request',
      `${employee.firstName} ${employee.lastName} applied for ${leaveType} leave`);
  }

  return leave;
};

const approveLeave = async (approverId, leaveId, note) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'Leave is not in pending state');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: 'APPROVED', approverId, approverNote: note, reviewedAt: new Date() },
    });

    // Deduct from balance
    const year = leave.startDate.getFullYear();
    const policy = await tx.leavePolicy.findFirst({ where: { leaveType: leave.leaveType } });
    if (policy) {
      await tx.leaveBalance.updateMany({
        where: { userId: leave.employeeId, policyId: policy.id, year },
        data: { usedDays: { increment: leave.totalDays }, remainingDays: { decrement: leave.totalDays } },
      });
    }

    return result;
  });

  await notificationService.create(leave.employeeId, 'LEAVE_APPROVED', 'Leave Approved',
    `Your ${leave.leaveType} leave request has been approved`);

  return updated;
};

const rejectLeave = async (approverId, leaveId, note) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) throw new ApiError(404, 'Leave request not found');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'Leave is not in pending state');

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: 'REJECTED', approverId, approverNote: note, reviewedAt: new Date() },
  });

  await notificationService.create(leave.employeeId, 'LEAVE_REJECTED', 'Leave Rejected',
    `Your ${leave.leaveType} leave request has been rejected. Reason: ${note || 'N/A'}`);

  return updated;
};

const cancelLeave = async (userId, leaveId) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.employeeId !== userId) throw new ApiError(403, 'Not authorized');
  if (!['PENDING', 'APPROVED'].includes(leave.status)) throw new ApiError(400, 'Cannot cancel this leave');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: 'CANCELLED' },
    });

    // Restore balance if was approved
    if (leave.status === 'APPROVED') {
      const year = leave.startDate.getFullYear();
      const policy = await tx.leavePolicy.findFirst({ where: { leaveType: leave.leaveType } });
      if (policy) {
        await tx.leaveBalance.updateMany({
          where: { userId, policyId: policy.id, year },
          data: { usedDays: { decrement: leave.totalDays }, remainingDays: { increment: leave.totalDays } },
        });
      }
    }
    return result;
  });

  return updated;
};

const getLeaves = async (query, user) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};

  if (user.role === 'EMPLOYEE') where.employeeId = user.id;
  else if (user.role === 'MANAGER') {
    where.OR = [{ employeeId: user.id }, { approverId: user.id }];
  }

  if (query.status) where.status = query.status;
  if (query.leaveType) where.leaveType = query.leaveType;
  if (query.employeeId && user.role !== 'EMPLOYEE') where.employeeId = query.employeeId;

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where, skip, take,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { appliedAt: 'desc' },
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { leaves, meta: paginateMeta(total, page, limit) };
};

const getMyLeaves = async (userId, query) => {
  return getLeaves(query, { id: userId, role: 'EMPLOYEE' });
};

const getPendingLeaves = async (user) => {
  const where = { status: 'PENDING' };
  if (user.role === 'MANAGER') where.approverId = user.id;

  return prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } },
    },
    orderBy: { appliedAt: 'asc' },
  });
};

const getLeaveById = async (id) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      approver: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!leave) throw new ApiError(404, 'Leave not found');
  return leave;
};

const getMyBalances = async (userId) => {
  const year = new Date().getFullYear();
  return prisma.leaveBalance.findMany({
    where: { userId, year },
    include: { policy: true },
  });
};

const getUserBalances = async (userId) => {
  const year = new Date().getFullYear();
  return prisma.leaveBalance.findMany({
    where: { userId, year },
    include: { policy: true },
  });
};

const getPolicies = async () => prisma.leavePolicy.findMany();

const createPolicy = async (data) => prisma.leavePolicy.create({ data });

const updatePolicy = async (id, data) => prisma.leavePolicy.update({ where: { id }, data });

module.exports = {
  applyLeave, approveLeave, rejectLeave, cancelLeave,
  getLeaves, getMyLeaves, getPendingLeaves, getLeaveById,
  getMyBalances, getUserBalances, getPolicies, createPolicy, updatePolicy,
};
