const jwt = require('jsonwebtoken');

const createAiServiceToken = (organizationId) => {
  if (!organizationId) throw new Error('organizationId is required for an AI service token');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required for AI service authentication');
  return jwt.sign(
    { sub: 'worknex-backend', organizationId, tokenType: 'ai-service' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2m' },
  );
};

const aiServiceHeaders = (organizationId) => ({
  Authorization: `Bearer ${createAiServiceToken(organizationId)}`,
});

module.exports = { createAiServiceToken, aiServiceHeaders };
