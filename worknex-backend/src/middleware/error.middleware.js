const logger = require('../config/logger');
const { config } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${err.meta?.target?.join(', ')}`,
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  // Prisma table does not exist — migrations not applied
  if (err.code === 'P2021' || /does not exist in the current database/i.test(err.message || '')) {
    logger.error('Migration check failed on request:', req.method, req.originalUrl, err.message);
    return res.status(503).json({
      success: false,
      message: 'Database is not migrated. Run database setup.',
    });
  }

  return res.status(500).json({
    success: false,
    message: config.isProduction ? 'Internal server error' : err.message,
  });
};

module.exports = { errorHandler };
