const jwt = require('jsonwebtoken');
module.exports = (...allowedRoles) => (req, res, next) => {
  console.log('=== Authorization Check ===');
  console.log('User:', req.user);
  console.log('Allowed roles:', allowedRoles);
  console.log('User roleId:', req.user?.roleId);
  
  if (!req.user) {
    console.log('❌ No user in request');
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  // Super admin (roleId = 0) bypasses all role checks
  if (req.user.roleId === 0) {
    console.log('✓ Super admin - bypassing role check');
    return next();
  }
  
  if (!allowedRoles.includes(req.user.roleId)) {
    console.log('❌ Role not allowed. User has roleId:', req.user.roleId, 'but needs one of:', allowedRoles);
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  console.log('✓ Role authorized');
  next();
};