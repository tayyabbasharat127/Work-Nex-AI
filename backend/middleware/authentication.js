const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const {userId, email, roleId, organizationId:organizationId} = decoded;
    if (!userId || !roleId || !organizationId || !email) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    req.user = { userId, roleId, organizationId, email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};