const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const prisma = require('../../config/db');
const { config } = require('../../config/env');
const { ApiError } = require('../../utils/ApiError');
const { sendEmail } = require('../../config/email');
const { getSystemRoleId } = require('../../utils/systemRoles');
const { encrypt, decrypt } = require('../../utils/encryption');

const userPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.customRole.tier,
  roleId: user.customRole.id,
  roleName: user.customRole.name,
  permissions: user.customRole.permissions,
  firstName: user.firstName,
  lastName: user.lastName,
  organizationId: user.organizationId,
});

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sessionMetadata = (metadata = {}) => ({
  ipAddress: metadata.ipAddress ? String(metadata.ipAddress).slice(0, 64) : null,
  userAgent: metadata.userAgent ? String(metadata.userAgent).slice(0, 512) : null,
});

const signTokens = (user) => {
  const common = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.customRole.tier,
    version: user.authVersion || 0,
  };
  const accessToken = jwt.sign(
    { ...common, tokenType: 'access' },
    config.jwt.accessSecret,
    {
      algorithm: 'HS256',
      expiresIn: config.jwt.accessExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      jwtid: uuidv4(),
    },
  );
  const refreshToken = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, tokenType: 'refresh' },
    config.jwt.refreshSecret,
    {
      algorithm: 'HS256',
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      jwtid: uuidv4(),
    },
  );
  const decodedRefresh = jwt.decode(refreshToken);
  return {
    accessToken,
    refreshToken,
    refreshExpiresAt: new Date(decodedRefresh.exp * 1000),
  };
};

const persistSession = async (db, user, metadata = {}) => {
  const tokens = signTokens(user);
  await db.refreshToken.create({
    data: {
      tokenHash: tokenHash(tokens.refreshToken),
      userId: user.id,
      expiresAt: tokens.refreshExpiresAt,
      ...sessionMetadata(metadata),
    },
  });
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

const verifyRefreshJwt = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  } catch (strictError) {
    try {
      const legacy = jwt.verify(token, config.jwt.refreshSecret, { algorithms: ['HS256'] });
      if (legacy.tokenType) throw strictError;
      return legacy;
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }
};

const encryptTwoFactorSecret = (secret) => `enc:${encrypt(secret)}`;
const decryptTwoFactorSecret = (stored) => {
  if (!stored) return null;
  return stored.startsWith('enc:') ? decrypt(stored.slice(4)) : stored;
};

const register = async (data, requestingUser = null) => {
  if (requestingUser?.role !== 'SUPER_ADMIN' && data.organizationId !== requestingUser?.organizationId) {
    throw new ApiError(403, 'Cannot create user in another organization');
  }

  let roleId;
  let tier;
  if (data.roleId) {
    const customRole = await prisma.role.findFirst({
      where: { id: data.roleId, organizationId: data.organizationId },
      select: { id: true, tier: true },
    });
    if (!customRole) throw new ApiError(400, 'Role not found in organization');
    roleId = customRole.id;
    tier = customRole.tier;
  } else {
    tier = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(data.role) ? data.role : 'EMPLOYEE';
    roleId = await getSystemRoleId(prisma, data.organizationId, tier);
    if (!roleId) throw new ApiError(400, `No system role found for tier ${tier} in this organization`);
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const empExists = await prisma.user.findFirst({
    where: { employeeId: data.employeeId, organizationId: data.organizationId },
  });
  if (empExists) throw new ApiError(409, 'Employee ID already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  if (!data.organizationId) throw new ApiError(400, 'organizationId is required');

  if (data.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, organizationId: data.organizationId },
    });
    if (!department) throw new ApiError(400, 'Department not found in organization');
  }

  if (data.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: data.managerId, organizationId: data.organizationId },
    });
    if (!manager) throw new ApiError(400, 'Manager not found in organization');
  }

  // Whitelist only known User fields — never spread raw input into Prisma
  const user = await prisma.user.create({
    data: {
      organizationId: data.organizationId,
      employeeId:   data.employeeId,
      firstName:    data.firstName,
      lastName:     data.lastName,
      email:        data.email,
      passwordHash,
      roleId,
      departmentId: data.departmentId || null,
      managerId:    data.managerId    || null,
      designation:  data.designation  || null,
      joiningDate:  data.joiningDate  ? new Date(data.joiningDate) : null,
      phone:        data.phone        || null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      organizationId: true,
      customRole: { select: { id: true, name: true, tier: true } },
    },
  });
  return { ...user, role: user.customRole.tier, roleId: user.customRole.id, roleName: user.customRole.name };
};

const login = async (email, password, metadata = {}) => {
  const user = await prisma.user.findUnique({ where: { email }, include: { customRole: true } });
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  if (user.twoFAEnabled) {
    const challengeId = uuidv4();
    const challengeToken = jwt.sign(
      { userId: user.id, tokenType: '2fa-challenge' },
      config.jwt.accessSecret,
      {
        algorithm: 'HS256',
        expiresIn: config.jwt.twoFactorChallengeExpiresIn,
        issuer: config.jwt.issuer,
        audience: `${config.jwt.audience}:2fa`,
        jwtid: challengeId,
      },
    );
    const decoded = jwt.decode(challengeToken);
    await prisma.authenticationChallenge.create({
      data: {
        id: challengeId,
        userId: user.id,
        type: 'LOGIN_2FA',
        expiresAt: new Date(decoded.exp * 1000),
      },
    });
    return { requires2FA: true, userId: challengeToken };
  }

  const tokens = await persistSession(prisma, user, metadata);

  return {
    ...tokens,
    user: userPayload(user),
  };
};

const createSessionForUser = async (userId, metadata = {}) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { customRole: true } });
  if (!user || !user.isActive) throw new ApiError(401, 'Unable to create session');
  const tokens = await persistSession(prisma, user, metadata);
  return { ...tokens, user: userPayload(user) };
};

const refreshToken = async (token, metadata = {}) => {
  if (!token) throw new ApiError(401, 'Invalid refresh token');
  const decoded = verifyRefreshJwt(token);
  if (decoded.tokenType && decoded.tokenType !== 'refresh') throw new ApiError(401, 'Invalid refresh token');

  const digest = tokenHash(token);
  const stored = await prisma.refreshToken.findFirst({
    where: { OR: [{ tokenHash: digest }, { token }] },
  });
  if (!stored || stored.expiresAt < new Date()) throw new ApiError(401, 'Invalid refresh token');
  if (stored.userId !== decoded.userId) throw new ApiError(401, 'Invalid refresh token');

  if (stored.revokedAt) {
    await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.user.update({ where: { id: stored.userId }, data: { authVersion: { increment: 1 } } }),
    ]);
    throw new ApiError(401, 'Refresh token replay detected');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { customRole: true } });
  if (!user || !user.isActive || !user.customRole) throw new ApiError(401, 'User not found');

  const tokens = signTokens(user);
  const replacementHash = tokenHash(tokens.refreshToken);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
        replacedByTokenHash: replacementHash,
      },
    });
    await tx.refreshToken.create({
      data: {
        tokenHash: replacementHash,
        userId: user.id,
        expiresAt: tokens.refreshExpiresAt,
        ...sessionMetadata(metadata),
      },
    });
  });

  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { userId, OR: [{ tokenHash: tokenHash(refreshToken) }, { token: refreshToken }], revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else {
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
};

const setup2FA = async (userId) => {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  const otpauth = authenticator.keyuri(user.email, config.twoFactorAppName, secret);
  const qrCode = await QRCode.toDataURL(otpauth);

  await prisma.user.update({ where: { id: userId }, data: { twoFASecret: encryptTwoFactorSecret(secret) } });
  return { secret, qrCode };
};

const verify2FA = async (userId, token) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.twoFASecret) throw new ApiError(400, '2FA not set up');

  const valid = authenticator.verify({ token, secret: decryptTwoFactorSecret(user.twoFASecret) });
  if (!valid) throw new ApiError(400, 'Invalid 2FA token');

  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: true } });
  return { message: '2FA enabled successfully' };
};

const disable2FA = async (userId, token) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.twoFAEnabled || !user.twoFASecret) throw new ApiError(400, '2FA is not enabled');
  const valid = authenticator.verify({ token, secret: decryptTwoFactorSecret(user.twoFASecret) });
  if (!valid) throw new ApiError(400, 'Invalid 2FA token');
  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: false, twoFASecret: null } });
};

const validate2FA = async (challengeToken, token, metadata = {}) => {
  let claims;
  try {
    claims = jwt.verify(challengeToken, config.jwt.accessSecret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: `${config.jwt.audience}:2fa`,
    });
  } catch {
    throw new ApiError(401, 'Invalid or expired 2FA challenge');
  }
  if (claims.tokenType !== '2fa-challenge' || !claims.jti) {
    throw new ApiError(401, 'Invalid or expired 2FA challenge');
  }

  const challenge = await prisma.authenticationChallenge.findFirst({
    where: { id: claims.jti, userId: claims.userId, type: 'LOGIN_2FA' },
  });
  if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired 2FA challenge');
  }

  const user = await prisma.user.findUnique({ where: { id: claims.userId }, include: { customRole: true } });
  if (!user || !user.twoFAEnabled) throw new ApiError(400, '2FA not enabled');

  const valid = authenticator.verify({ token, secret: decryptTwoFactorSecret(user.twoFASecret) });
  if (!valid) throw new ApiError(400, 'Invalid 2FA token');

  const tokens = await prisma.$transaction(async (tx) => {
    const consumed = await tx.authenticationChallenge.updateMany({
      where: { id: challenge.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new ApiError(401, '2FA challenge already used');
    return persistSession(tx, user, metadata);
  });
  return { ...tokens, user: userPayload(user) };
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silent — don't reveal if email exists

  const resetToken = crypto.randomBytes(32).toString('base64url');
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: tokenHash(resetToken), expiresAt: expiry },
    }),
  ]);

  const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  try {
    await sendEmail(email, 'Password Reset - WorkNex AI', `
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `);
  } catch {
    // SMTP not configured — token is still stored, user can use the URL directly in dev
  }
};

const resetPassword = async (token, newPassword) => {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) throw new ApiError(400, 'Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new ApiError(400, 'Reset token already used');
    await tx.user.update({
      where: { id: stored.userId },
      data: { passwordHash, authVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new ApiError(400, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, authVersion: { increment: 1 } } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
};

module.exports = {
  register, login, createSessionForUser, refreshToken, logout,
  setup2FA, verify2FA, disable2FA, validate2FA,
  forgotPassword, resetPassword, changePassword,
};
