const prisma = require('../config/db');
const logger = require('../config/logger');

/**
 * Logs every mutating request to the AuditLog table
 */
const auditLog = (entity, action) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await prisma.auditLog.create({
            data: {
              organizationId: req.user?.organizationId || null,
              userId: req.user?.id || null,
              action,
              entity,
              entityId: req.params?.id || res.locals?.entityId || null,
              newValues: {
                auditId: req.auditId,
                ...(res.locals?.auditData && typeof res.locals.auditData === 'object'
                  ? res.locals.auditData
                  : {}),
              },
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch (error) {
          logger.error('Audit log persistence failed', { error: error.message, auditId: req.auditId, entity, action });
        }
      }
    });
    next();
  };
};

const auditHrAccess = (entity) => auditLog(entity, 'READ');

module.exports = { auditLog, auditHrAccess };
