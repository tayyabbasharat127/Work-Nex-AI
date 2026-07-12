const prisma = require('../../config/db');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { getOrganizationScope, getUserOrganizationId } = require('../../utils/tenant');

/**
 * Create a notification for a user
 */
const create = async (userId, type, title, message, metadata = null) => {
  const organizationId = await getUserOrganizationId(userId);
  return prisma.notification.create({
    data: { organizationId, userId, type, title, message, metadata },
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

  const users = await prisma.user.findMany({ where, select: { id: true, organizationId: true } });
  const data = users.map((u) => ({ organizationId: u.organizationId, userId: u.id, type, title, message }));
  return prisma.notification.createMany({ data });
};

module.exports = {
  create, getMyNotifications, getUnreadCount,
  markAsRead, markAllAsRead, deleteNotification, broadcast,
};
