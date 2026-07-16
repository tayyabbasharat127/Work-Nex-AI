const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const createAiServiceToken = (organizationId) => {
  if (!organizationId) throw new Error('organizationId is required for an AI service token');
  if (!config.jwt.accessSecret) throw new Error('JWT_SECRET is required for AI service authentication');
  return jwt.sign(
    { sub: 'worknex-backend', organizationId, tokenType: 'ai-service' },
    config.jwt.accessSecret,
    { algorithm: 'HS256', expiresIn: '2m', issuer: config.jwt.issuer, audience: config.jwt.audience },
  );
};

const aiServiceHeaders = (organizationId) => ({
  Authorization: `Bearer ${createAiServiceToken(organizationId)}`,
});

module.exports = { createAiServiceToken, aiServiceHeaders };
