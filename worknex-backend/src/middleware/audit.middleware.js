const prisma = require('../config/db');

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
              newValues: res.locals?.auditData || null,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch {
          // Non-blocking — audit failure should not break the request
        }
      }
    });
    next();
  };
};

const auditHrAccess = (entity) => auditLog(entity, 'READ');

module.exports = { auditLog, auditHrAccess };
