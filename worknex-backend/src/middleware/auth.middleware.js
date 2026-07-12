const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { ApiError } = require('../utils/ApiError');

/**
 * Verify JWT access token and attach user to req
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Access token required'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, isActive: true,
        firstName: true, lastName: true, employeeId: true,
        departmentId: true, managerId: true, organizationId: true,
        customRole: { select: { id: true, name: true, tier: true, permissions: true } },
      },
    });

    if (!user || !user.isActive || !user.customRole) {
      return next(new ApiError(401, 'User not found or inactive'));
    }

    const { customRole, ...rest } = user;
    // `role` stays a tier string (SUPER_ADMIN/ADMIN/MANAGER/EMPLOYEE) so every
    // existing scope check in the codebase keeps working unchanged even
    // though the underlying role is now a dynamic, admin-editable row.
    req.user = {
      ...rest,
      role: customRole.tier,
      roleId: customRole.id,
      roleName: customRole.name,
      permissions: customRole.permissions,
    };
    next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
};

/**
 * Capability-based access control, for routes gating a specific action
 * rather than an org-scope tier. SUPER_ADMIN always passes (platform admin).
 * A custom role passes if any of its `permissions` matches.
 * @param {...string} perms - Any one of these permissions is sufficient
 */
const requirePermission = (...perms) => {
  return (req, res, next) => {
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    const granted = req.user.permissions || [];
    if (!perms.some((perm) => granted.includes(perm))) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
};

module.exports = { authenticate, authorize, requirePermission };
