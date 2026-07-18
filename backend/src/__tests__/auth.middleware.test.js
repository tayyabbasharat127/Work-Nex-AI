jest.mock('../config/db', () => ({ user: { findUnique: jest.fn() } }));
jest.mock('../config/env', () => ({
  config: {
    jwt: {
      accessSecret: 'test-access-secret-that-is-long-enough',
      issuer: 'worknex-test',
      audience: 'worknex-test-clients',
    },
  },
}));

const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { authenticate, authorize, requirePermission } = require('../middleware/auth.middleware');

const user = {
  id: 'user-1',
  email: 'employee@example.test',
  isActive: true,
  authVersion: 2,
  organizationId: 'org-1',
  customRole: { id: 'role-1', name: 'Employee', tier: 'EMPLOYEE', permissions: ['profile:edit'] },
};

const accessToken = (overrides = {}) => jwt.sign(
  { userId: user.id, tokenType: 'access', version: 2, ...overrides },
  'test-access-secret-that-is-long-enough',
  { algorithm: 'HS256', issuer: 'worknex-test', audience: 'worknex-test-clients' },
);

describe('authentication middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('accepts a valid versioned access token', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const req = { headers: { authorization: `Bearer ${accessToken()}` } };
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: user.id, role: 'EMPLOYEE', organizationId: 'org-1' });
  });

  test('rejects refresh tokens at access-token endpoints', async () => {
    const req = { headers: { authorization: `Bearer ${accessToken({ tokenType: 'refresh' })}` } };
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('rejects a token after auth version changes', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, authVersion: 3 });
    const next = jest.fn();
    await authenticate({ headers: { authorization: `Bearer ${accessToken()}` } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  test('enforces role and capability gates', () => {
    const denied = jest.fn();
    authorize('ADMIN')({ user: { role: 'EMPLOYEE' } }, {}, denied);
    expect(denied.mock.calls[0][0]).toMatchObject({ statusCode: 403 });

    const allowed = jest.fn();
    requirePermission('profile:edit')({ user: { role: 'EMPLOYEE', permissions: ['profile:edit'] } }, {}, allowed);
    expect(allowed).toHaveBeenCalledWith();
  });
});
