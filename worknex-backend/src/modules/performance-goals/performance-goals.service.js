const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { isAdminRole, assertCanAccessUser, getAccessibleUserIds } = require('../../utils/rbac');
const { getOrganizationScope } = require('../../utils/tenant');

// `assertCanAccessUser`'s MANAGER branch only checks direct-report access
// (targetUser.managerId === requestingUser.id) — it never treats a manager
// as able to access themselves, since it's designed around "manager viewing
// a report," not "manager viewing their own record." Goals/reviews need a
// manager (or anyone) to always be able to touch their own resources, so
// self-access is checked first here rather than changing the shared utility.
const assertSelfOrAccessibleUser = async (requestingUser, targetUserId) => {
  if (requestingUser.id === targetUserId) return;
  await assertCanAccessUser(requestingUser, targetUserId);
};

// Real, manager-driven goals + reviews — a genuinely separate signal from the
// existing attendance-derived PerformanceRecord score (which stays untouched
// in the DB and is only relabeled in the UI). See getPerformanceSummary for
// how the two are combined for display without ever being blended together.

// ─── Goals ──────────────────────────────────────────────────────────────────

const getMyGoals = async (requestingUser) => {
  return prisma.goal.findMany({
    where: { userId: requestingUser.id, ...getOrganizationScope(requestingUser) },
    orderBy: { createdAt: 'desc' },
  });
};

const getUserGoals = async (userId, requestingUser) => {
  await assertSelfOrAccessibleUser(requestingUser, userId);
  return prisma.goal.findMany({
    where: { userId, ...getOrganizationScope(requestingUser) },
    orderBy: { createdAt: 'desc' },
  });
};

const createGoal = async (data, requestingUser) => {
  const targetUserId = data.userId || requestingUser.id;
  await assertSelfOrAccessibleUser(requestingUser, targetUserId);
  if (!data.title) throw new ApiError(400, 'Goal title is required');

  return prisma.goal.create({
    data: {
      organizationId: requestingUser.organizationId,
      userId: targetUserId,
      title: data.title,
      description: data.description || null,
      metric: data.metric || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      progress: Number.isFinite(Number(data.progress)) ? Math.max(0, Math.min(100, Number(data.progress))) : 0,
      status: data.status || 'NOT_STARTED',
      createdById: requestingUser.id,
    },
  });
};

const updateGoal = async (id, data, requestingUser) => {
  const goal = await prisma.goal.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!goal) throw new ApiError(404, 'Goal not found');
  await assertSelfOrAccessibleUser(requestingUser, goal.userId);

  // Anyone editing a goal they didn't create (e.g. the employee on a goal a
  // manager set for them) can only move progress/status forward, not rewrite
  // the goal's definition.
  const isCreator = requestingUser.id === goal.createdById;
  const allowedFields = isCreator
    ? ['title', 'description', 'metric', 'dueDate', 'progress', 'status']
    : ['progress', 'status'];

  const safeData = {};
  for (const field of allowedFields) {
    if (data[field] === undefined) continue;
    if (field === 'dueDate') {
      safeData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    } else if (field === 'progress') {
      safeData.progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
    } else {
      safeData[field] = data[field];
    }
  }

  return prisma.goal.update({ where: { id }, data: safeData });
};

const deleteGoal = async (id, requestingUser) => {
  const goal = await prisma.goal.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!goal) throw new ApiError(404, 'Goal not found');
  if (requestingUser.id !== goal.createdById && !isAdminRole(requestingUser)) {
    throw new ApiError(403, 'Only the creator or an admin can delete this goal');
  }
  await prisma.goal.delete({ where: { id } });
};

// ─── Reviews ────────────────────────────────────────────────────────────────

const getMyReviews = async (requestingUser) => {
  return prisma.performanceReview.findMany({
    where: { userId: requestingUser.id, ...getOrganizationScope(requestingUser) },
    include: { manager: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

const getUserReviews = async (userId, requestingUser) => {
  await assertSelfOrAccessibleUser(requestingUser, userId);
  return prisma.performanceReview.findMany({
    where: { userId, ...getOrganizationScope(requestingUser) },
    include: { manager: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

const createReview = async (data, requestingUser) => {
  if (!data.userId) throw new ApiError(400, 'userId is required');
  if (!data.cycle) throw new ApiError(400, 'cycle is required (e.g. "Q1 2026")');
  await assertCanAccessUser(requestingUser, data.userId);
  if (data.userId === requestingUser.id) throw new ApiError(400, 'Cannot create a review for yourself');

  return prisma.performanceReview.create({
    data: {
      organizationId: requestingUser.organizationId,
      userId: data.userId,
      managerId: requestingUser.id,
      cycle: data.cycle,
      managerRating: data.managerRating ?? null,
      managerComments: data.managerComments || null,
      status: 'DRAFT',
    },
  });
};

const updateReview = async (id, data, requestingUser) => {
  const review = await prisma.performanceReview.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.managerId !== requestingUser.id && !isAdminRole(requestingUser)) {
    throw new ApiError(403, 'Only the reviewing manager or an admin can edit this review');
  }
  if (review.status === 'SUBMITTED') throw new ApiError(409, 'Cannot edit a submitted review');

  const safeData = {};
  if (data.managerRating !== undefined) {
    const rating = Number(data.managerRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'managerRating must be an integer 1-5');
    safeData.managerRating = rating;
  }
  if (data.managerComments !== undefined) safeData.managerComments = data.managerComments;

  return prisma.performanceReview.update({ where: { id }, data: safeData });
};

const submitReview = async (id, requestingUser) => {
  const review = await prisma.performanceReview.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.managerId !== requestingUser.id && !isAdminRole(requestingUser)) {
    throw new ApiError(403, 'Only the reviewing manager or an admin can submit this review');
  }
  if (review.status === 'SUBMITTED') throw new ApiError(409, 'Review already submitted');
  if (!review.managerRating) throw new ApiError(400, 'A rating is required before submitting');

  return prisma.performanceReview.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });
};

const getTeamStatus = async (requestingUser) => {
  const accessibleUserIds = await getAccessibleUserIds(requestingUser);
  const where = { ...getOrganizationScope(requestingUser) };
  if (accessibleUserIds !== null) where.userId = { in: accessibleUserIds };

  const reviews = await prisma.performanceReview.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
  });

  const counts = { DRAFT: 0, SUBMITTED: 0 };
  reviews.forEach((row) => { counts[row.status] = row._count.status; });
  return counts;
};

// ─── Summary — combines Goals + Reviews into a real "Overall Performance"
// figure, kept separate from the existing attendance-derived score ──────────

const getPerformanceSummary = async (userId, requestingUser) => {
  await assertSelfOrAccessibleUser(requestingUser, userId);

  const [goals, reviews, latestRecord] = await Promise.all([
    prisma.goal.findMany({ where: { userId, ...getOrganizationScope(requestingUser) }, select: { progress: true } }),
    prisma.performanceReview.findMany({
      where: { userId, status: 'SUBMITTED', ...getOrganizationScope(requestingUser) },
      select: { managerRating: true },
    }),
    prisma.performanceRecord.findFirst({
      where: { userId, ...getOrganizationScope(requestingUser) },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
  ]);

  const avgGoalCompletion = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : null;
  const avgManagerRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + (r.managerRating || 0), 0) / reviews.length) * 10) / 10
    : null;

  let overallPerformanceScore = null;
  if (avgGoalCompletion !== null || avgManagerRating !== null) {
    const goalPart = (avgGoalCompletion ?? 0) * 0.6;
    const ratingPart = ((avgManagerRating ?? 0) / 5) * 100 * 0.4;
    overallPerformanceScore = Math.round(goalPart + ratingPart);
  }

  return {
    overallPerformanceScore,
    avgGoalCompletion,
    avgManagerRating,
    goalCount: goals.length,
    reviewCount: reviews.length,
    attendanceReliabilityScore: latestRecord?.overallScore ?? null,
  };
};

module.exports = {
  getMyGoals, getUserGoals, createGoal, updateGoal, deleteGoal,
  getMyReviews, getUserReviews, createReview, updateReview, submitReview, getTeamStatus,
  getPerformanceSummary,
};
