const jwt = require('jsonwebtoken');
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  // Super admin (roleId = 0) bypasses all role checks
  if (req.user.roleId === 0) {
    return next();
  }
  
  if (!allowedRoles.includes(req.user.roleId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  next();
};