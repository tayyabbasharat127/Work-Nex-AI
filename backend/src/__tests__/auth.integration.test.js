const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const prisma = require('../config/db');
const authService = require('../modules/auth/auth.service');

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeDatabase('authentication service integration', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `auth-${suffix}@example.test`;
  const originalPassword = 'Original!Pass123';
  const changedPassword = 'Changed!Pass456';
  let organization;
  let role;
  let user;

  beforeAll(async () => {
    organization = await prisma.organization.create({
      data: { name: `Auth Test ${suffix}`, slug: `auth-test-${suffix}` },
    });
    role = await prisma.role.create({
      data: {
        organizationId: organization.id,
        name: `Employee ${suffix}`,
        tier: 'EMPLOYEE',
        permissions: [],
        isSystem: true,
      },
    });
    user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        employeeId: `AUTH-${suffix}`,
        firstName: 'Auth',
        lastName: 'Tester',
        email,
        passwordHash: await bcrypt.hash(originalPassword, 12),
        roleId: role.id,
      },
    });
  });

  afterAll(async () => {
    if (user) await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    if (role) await prisma.role.delete({ where: { id: role.id } }).catch(() => {});
    if (organization) await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('rotates refresh tokens and detects replay', async () => {
    const login = await authService.login(email, originalPassword, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest-auth-integration',
    });
    expect(login.user.id).toBe(user.id);
    expect(login.accessToken).toBeTruthy();

    const rotated = await authService.refreshToken(login.refreshToken);
    expect(rotated.refreshToken).not.toBe(login.refreshToken);

    await expect(authService.refreshToken(login.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh token replay detected',
    });
    const activeSessions = await prisma.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(activeSessions).toBe(0);
  });

  test('logout and password changes revoke sessions', async () => {
    const session = await authService.login(email, originalPassword);
    await authService.logout(user.id, session.refreshToken);
    await expect(authService.refreshToken(session.refreshToken)).rejects.toMatchObject({ statusCode: 401 });

    const secondSession = await authService.login(email, originalPassword);
    await authService.changePassword(user.id, originalPassword, changedPassword);
    await expect(authService.refreshToken(secondSession.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await expect(authService.login(email, originalPassword)).rejects.toMatchObject({ statusCode: 401 });
    await expect(authService.login(email, changedPassword)).resolves.toMatchObject({
      user: { id: user.id },
    });
  });

  test('2FA login challenge can only be consumed once', async () => {
    const setup = await authService.setup2FA(user.id);
    const setupCode = authenticator.generate(setup.secret);
    await expect(authService.verify2FA(user.id, setupCode)).resolves.toEqual({
      message: '2FA enabled successfully',
    });

    const challenged = await authService.login(email, changedPassword);
    expect(challenged.requires2FA).toBe(true);
    const loginCode = authenticator.generate(setup.secret);
    await expect(authService.validate2FA(challenged.userId, loginCode)).resolves.toMatchObject({
      user: { id: user.id },
    });
    await expect(authService.validate2FA(challenged.userId, loginCode)).rejects.toMatchObject({
      statusCode: 401,
    });

    const disableCode = authenticator.generate(setup.secret);
    await expect(authService.disable2FA(user.id, disableCode)).resolves.toBeUndefined();
  });
});
