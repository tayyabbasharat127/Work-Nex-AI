const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { sendEmail } = require('../../config/email');
const { getSystemRoleId } = require('../../utils/systemRoles');

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

const generateTokens = (userId, role, organizationId) => {
  const accessToken = jwt.sign({ userId, role, organizationId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  const refreshToken = jwt.sign({ userId, organizationId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
  return { accessToken, refreshToken };
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

  const empExists = await prisma.user.findUnique({ where: { employeeId: data.employeeId } });
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

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email }, include: { customRole: true } });
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  if (user.twoFAEnabled) {
    return { requires2FA: true, userId: user.id };
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.customRole.tier, user.organizationId);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

  return {
    accessToken,
    refreshToken,
    user: userPayload(user),
  };
};

const refreshToken = async (token) => {
  if (!token) throw new ApiError(401, 'Invalid refresh token');
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) throw new ApiError(401, 'Invalid refresh token');

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { customRole: true } });
  if (!user || !user.isActive) throw new ApiError(401, 'User not found');

  const tokens = generateTokens(user.id, user.customRole.tier, user.organizationId);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.update({
    where: { token },
    data: { token: tokens.refreshToken, expiresAt },
  });

  return tokens;
};

const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { userId, token: refreshToken } });
  } else {
    // Fallback: invalidate all sessions for this user
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
};

const setup2FA = async (userId) => {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const otpauth = authenticator.keyuri(user.email, process.env.TWO_FA_APP_NAME, secret);
  const qrCode = await QRCode.toDataURL(otpauth);

  await prisma.user.update({ where: { id: userId }, data: { twoFASecret: secret } });
  return { secret, qrCode };
};

const verify2FA = async (userId, token) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.twoFASecret) throw new ApiError(400, '2FA not set up');

  const valid = authenticator.verify({ token, secret: user.twoFASecret });
  if (!valid) throw new ApiError(400, 'Invalid 2FA token');

  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: true } });
  return { message: '2FA enabled successfully' };
};

const disable2FA = async (userId, token) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.twoFAEnabled || !user.twoFASecret) throw new ApiError(400, '2FA is not enabled');
  const valid = authenticator.verify({ token, secret: user.twoFASecret });
  if (!valid) throw new ApiError(400, 'Invalid 2FA token');
  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: false, twoFASecret: null } });
};

const validate2FA = async (userId, token) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { customRole: true } });
  if (!user || !user.twoFAEnabled) throw new ApiError(400, '2FA not enabled');

  const valid = authenticator.verify({ token, secret: user.twoFASecret });
  if (!valid) throw new ApiError(400, 'Invalid 2FA token');

  const tokens = generateTokens(user.id, user.customRole.tier, user.organizationId);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId: user.id, expiresAt } });
  return { ...tokens, user: userPayload(user) };
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silent — don't reveal if email exists

  const resetToken = uuidv4();
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFASecret: `reset:${resetToken}:${expiry.getTime()}` },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
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
  const users = await prisma.user.findMany({
    where: { twoFASecret: { startsWith: 'reset:' } },
  });

  const user = users.find((u) => {
    const parts = u.twoFASecret?.split(':');
    return parts?.[1] === token && parseInt(parts?.[2]) > Date.now();
  });

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, twoFASecret: null },
  });
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new ApiError(400, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

module.exports = {
  register, login, refreshToken, logout,
  setup2FA, verify2FA, disable2FA, validate2FA,
  forgotPassword, resetPassword, changePassword,
};
