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
        id: true, email: true, role: true, isActive: true,
        firstName: true, lastName: true, employeeId: true,
        departmentId: true, managerId: true,
      },
    });

    if (!user || !user.isActive) {
      return next(new ApiError(401, 'User not found or inactive'));
    }

    req.user = user;
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

module.exports = { authenticate, authorize };
