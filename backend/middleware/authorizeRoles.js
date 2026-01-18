const jwt = require('jsonwebtoken');
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.roleId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};