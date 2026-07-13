const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const logger = require('../config/logger');
const { config } = require('../config/env');
const { ensurePlatformSuperAdminRole } = require('../utils/systemRoles');

/**
 * Bootstraps the first WorkNex platform Super Admin account on a brand-new
 * database — mirrors the migration-on-startup fix: pointing the backend at
 * an empty database and starting it should be enough to get a fully working
 * environment, with no manual seed script required just to get a login.
 *
 * Super Admin is deliberately NOT reachable through public signup (see
 * billing.service.js registerOrganization / auth.service.js register) since
 * it's WorkNex's own platform-operator role, not a customer role — so it
 * needs exactly one alternative bootstrap path, and this is it. Idempotent:
 * a no-op once any Super Admin already exists, so it's safe on every boot.
 */
async function ensureSuperAdmin() {
  if (!config.bootstrapSuperAdmin) return;
  const existing = await prisma.user.findFirst({ where: { customRole: { tier: 'SUPER_ADMIN' } } });
  if (existing) return;

  const email = config.superAdminEmail;
  const password = config.superAdminPassword;

  const platformOrg = await prisma.organization.upsert({
    where: { slug: 'worknex-platform' },
    update: {},
    create: { name: 'WorkNex Platform Team', slug: 'worknex-platform', country: 'Pakistan' },
  });

  const superAdminRole = await ensurePlatformSuperAdminRole(prisma);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      organizationId: platformOrg.id,
      employeeId: 'PLATFORM-001',
      firstName: 'WorkNex',
      lastName: 'Platform Admin',
      email,
      passwordHash,
      roleId: superAdminRole.id,
      designation: 'Platform Super Admin',
      isActive: true,
    },
  });

  logger.info('Initial platform Super Admin account created', { bootstrapAction: true });
}

module.exports = { ensureSuperAdmin };
