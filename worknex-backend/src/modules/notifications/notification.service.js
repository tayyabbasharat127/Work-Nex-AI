const prisma = require('../../config/db');
const { paginate, paginateMeta } = require('../../utils/pagination');

/**
 * Create a notification for a user
 */
const create = async (userId, type, title, message, metadata = null) => {
  return prisma.notification.create({
    data: { userId, type, title, message, metadata },
  });
};

const getMyNotifications = async (userId, query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = { userId };
  if (query.isRead !== undefined) where.isRead = query.isRead === 'true';

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, meta: paginateMeta(total, page, limit) };
};

const getUnreadCount = async (userId) => {
  return prisma.notification.count({ where: { userId, isRead: false } });
};

const markAsRead = async (id, userId) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const deleteNotification = async (id, userId) => {
  return prisma.notification.deleteMany({ where: { id, userId } });
};

const broadcast = async (type, title, message, roleFilter = null) => {
  const where = { isActive: true };
  if (roleFilter) where.role = roleFilter;

  const users = await prisma.user.findMany({ where, select: { id: true } });
  const data = users.map((u) => ({ userId: u.id, type, title, message }));
  return prisma.notification.createMany({ data });
};

module.exports = {
  create, getMyNotifications, getUnreadCount,
  markAsRead, markAllAsRead, deleteNotification, broadcast,
};
