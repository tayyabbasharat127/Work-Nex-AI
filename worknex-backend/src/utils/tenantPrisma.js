const { ApiError } = require('./ApiError');

/**
 * Narrow repository facade for tenant-owned models. Callers cannot construct
 * an ID lookup without the immutable organization scope being merged in.
 */
const tenantRepository = (prisma, organizationId) => {
  if (!organizationId) throw new ApiError(403, 'Organization context required');
  const model = (name) => {
    const delegate = prisma[name];
    if (!delegate) throw new Error(`Unknown Prisma model: ${name}`);
    return {
      findById: (id, args = {}) => delegate.findFirst({
        ...args,
        where: { ...(args.where || {}), id, organizationId },
      }),
      findMany: (args = {}) => delegate.findMany({
        ...args,
        where: { ...(args.where || {}), organizationId },
      }),
      count: (args = {}) => delegate.count({
        ...args,
        where: { ...(args.where || {}), organizationId },
      }),
      create: (data, args = {}) => delegate.create({ ...args, data: { ...data, organizationId } }),
      updateById: async (id, data, args = {}) => {
        const existing = await delegate.findFirst({ where: { id, organizationId }, select: { id: true } });
        if (!existing) throw new ApiError(404, 'Record not found');
        return delegate.update({ ...args, where: { id }, data });
      },
    };
  };
  return { organizationId, model };
};

module.exports = { tenantRepository };
