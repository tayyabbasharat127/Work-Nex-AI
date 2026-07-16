const prisma = require('../../config/db');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { getOrganizationScope, getUserOrganizationId } = require('../../utils/tenant');

const defaultTargetRoute = (type, role) => {
  const base = role === 'ADMIN' || role === 'SUPER_ADMIN'
    ? '/dashboard/admin'
    : role === 'MANAGER'
      ? '/dashboard/manager'
      : '/dashboard/employee';
  if (type.startsWith('LEAVE_')) return `${base}/${role === 'EMPLOYEE' ? 'leaves' : 'leaves'}`;
  if (type === 'ATTENDANCE_ALERT') return `${base}/attendance`;
  return base;
};

const navigationMetadata = (type, role, metadata = null) => {
  const supplied = metadata && typeof metadata === 'object' ? metadata : {};
  const requested = supplied.targetRoute || supplied.deepLink;
  const targetRoute = typeof requested === 'string' && requested.startsWith('/dashboard/')
    ? requested
    : defaultTargetRoute(type, role);
  return {
    action: 'VIEW',
    ...supplied,
    targetRoute,
    deepLink: targetRoute,
  };
};

/**
 * Create a notification for a user
 */
const create = async (userId, type, title, message, metadata = null) => {
  const organizationId = await getUserOrganizationId(userId);
  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: { customRole: { select: { tier: true } } },
  });
  return prisma.notification.create({
    data: {
      organizationId,
      userId,
      type,
      title,
      message,
      metadata: navigationMetadata(type, recipient?.customRole?.tier, metadata),
    },
  });
};

const getMyNotifications = async (user, query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = { userId: user.id, organizationId: user.organizationId };
  if (query.isRead !== undefined) where.isRead = query.isRead === 'true';

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, meta: paginateMeta(total, page, limit) };
};

const getUnreadCount = async (user) => {
  return prisma.notification.count({
    where: { userId: user.id, organizationId: user.organizationId, isRead: false },
  });
};

const markAsRead = async (id, user) => {
  return prisma.notification.updateMany({
    where: { id, userId: user.id, organizationId: user.organizationId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (user) => {
  return prisma.notification.updateMany({
    where: { userId: user.id, organizationId: user.organizationId, isRead: false },
    data: { isRead: true },
  });
};

const deleteNotification = async (id, user) => {
  return prisma.notification.deleteMany({
    where: { id, userId: user.id, organizationId: user.organizationId },
  });
};

const broadcast = async (type, title, message, roleFilter = null, requestingUser) => {
  const where = { isActive: true, ...getOrganizationScope(requestingUser) };
  if (roleFilter) where.customRole = { tier: roleFilter };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, organizationId: true, customRole: { select: { tier: true } } },
  });
  const data = users.map((u) => ({
    organizationId: u.organizationId,
    userId: u.id,
    type,
    title,
    message,
    metadata: navigationMetadata(type, u.customRole.tier),
  }));
  return prisma.notification.createMany({ data });
};

module.exports = {
  create, getMyNotifications, getUnreadCount,
  markAsRead, markAllAsRead, deleteNotification, broadcast,
  navigationMetadata,
};
