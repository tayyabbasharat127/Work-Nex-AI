const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { assertCanAccessUser, getAccessibleUserIds, isPlatformAdmin } = require('../../utils/rbac');
const { assertOrganizationAccess, getOrganizationScope } = require('../../utils/tenant');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../../config/email');
const { getSystemRoleId } = require('../../utils/systemRoles');

const userSelect = {
  id: true, employeeId: true, firstName: true, lastName: true,
  email: true, designation: true, phone: true,
  joiningDate: true, isActive: true, twoFAEnabled: true,
  profilePicture: true, createdAt: true,
  departmentId: true, // Added: needed for frontend
  staffCategoryId: true,
  managerId: true, // Added: CRITICAL - needed for team filtering
  organizationId: true,
  roleId: true,
  customRole: { select: { id: true, name: true, tier: true, permissions: true } },
  department: { select: { id: true, name: true } },
  staffCategory: { select: { id: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
};

// Flattens the fetched `customRole` relation into the same flat
// role/roleId/roleName/permissions shape used everywhere else in the API
// (see auth.service.js userPayload), so the frontend has one consistent contract.
const serializeUser = (user) => {
  if (!user) return user;
  const { customRole, ...rest } = user;
  if (!customRole) return rest;
  return {
    ...rest,
    role: customRole.tier,
    roleId: customRole.id,
    roleName: customRole.name,
    permissions: customRole.permissions,
  };
};

const getAllUsers = async (query, requestingUser) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.roleId) where.roleId = query.roleId;
  else if (query.role) where.customRole = { tier: query.role };
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  Object.assign(where, getOrganizationScope(requestingUser));

  if (requestingUser && !['SUPER_ADMIN', 'ADMIN'].includes(requestingUser.role)) {
    const accessibleUserIds = await getAccessibleUserIds(requestingUser);
    where.id = { in: accessibleUserIds };
  }

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { employeeId: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, select: userSelect, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return { users: users.map(serializeUser), meta: paginateMeta(total, page, limit) };
};

const getUserById = async (id, requestingUser = null) => {
  if (requestingUser) {
    await assertCanAccessUser(requestingUser, id);
  }

  const user = await prisma.user.findFirst({ where: { id, ...getOrganizationScope(requestingUser) }, select: userSelect });
  if (!user) throw new ApiError(404, 'User not found');
  return serializeUser(user);
};

const getUsersByDepartment = async (deptId, requestingUser) => {
  const where = { departmentId: deptId, isActive: true };

  Object.assign(where, getOrganizationScope(requestingUser));

  if (requestingUser && !['SUPER_ADMIN', 'ADMIN'].includes(requestingUser.role)) {
    const accessibleUserIds = await getAccessibleUserIds(requestingUser);
    where.id = { in: accessibleUserIds };
  }

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
  });
  return users.map(serializeUser);
};

const createUser = async (data, requestingUser) => {
  if (!isPlatformAdmin(requestingUser) && data.organizationId && data.organizationId !== requestingUser.organizationId) {
    throw new ApiError(403, 'Cannot create user in another organization');
  }

  const organizationId = isPlatformAdmin(requestingUser)
    ? data.organizationId || requestingUser.organizationId
    : requestingUser.organizationId;

  assertOrganizationAccess(requestingUser, organizationId);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { employeeId: data.employeeId }] },
  });
  if (existing) throw new ApiError(409, 'Email or Employee ID already exists');

  // Validate department exists if provided
  if (data.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, organizationId },
    });
    if (!department) throw new ApiError(400, 'Department not found');
  }

  // Validate staff category exists if provided
  if (data.staffCategoryId) {
    const category = await prisma.staffCategory.findFirst({
      where: { id: data.staffCategoryId, organizationId },
    });
    if (!category) throw new ApiError(400, 'Staff category not found');
  }

  // Validate manager exists and has correct role
  if (data.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: data.managerId, organizationId },
      select: { id: true, customRole: { select: { tier: true } } },
    });
    if (!manager) throw new ApiError(400, 'Assigned manager not found');
    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(manager.customRole.tier)) {
      throw new ApiError(400, 'Assigned manager must have MANAGER, ADMIN, or SUPER_ADMIN role');
    }
  }

  // Use provided password or generate temp password
  let tempPassword = null;
  let passwordHash;
  
  if (data.password) {
    // Admin provided a password
    passwordHash = await bcrypt.hash(data.password, 12);
  } else {
    // Generate temp password
    tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    passwordHash = await bcrypt.hash(tempPassword, 12);
  }

  // Prepare user data - remove password field, use passwordHash
  const { password, roleId: requestedRoleId, role: requestedTier, ...userData } = data;

  let roleId = requestedRoleId;
  let tier = requestedTier;
  if (roleId) {
    const customRole = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
      select: { id: true, tier: true },
    });
    if (!customRole) throw new ApiError(400, 'Role not found in organization');
    tier = customRole.tier;
  } else {
    tier = ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(tier) ? tier : 'EMPLOYEE';
    roleId = await getSystemRoleId(prisma, organizationId, tier);
    if (!roleId) throw new ApiError(400, `No system role found for tier ${tier} in this organization`);
  }

  // Convert joiningDate string to DateTime if provided
  if (userData.joiningDate) {
    userData.joiningDate = new Date(userData.joiningDate);
  }

  const user = await prisma.user.create({
    data: {
      ...userData,
      organizationId,
      passwordHash,
      roleId,
      joiningDate: userData.joiningDate || new Date(),
      isActive: userData.isActive !== undefined ? userData.isActive : true
    },
    select: userSelect,
  });

  // Initialize leave balances for all active policies
  const policies = await prisma.leavePolicy.findMany({ where: { organizationId } });
  const year = new Date().getFullYear();
  for (const policy of policies) {
    await prisma.leaveBalance.upsert({
      where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year } },
      update: {},
      create: {
        organizationId,
        userId: user.id, policyId: policy.id, year,
        totalDays: policy.totalDays,
        usedDays: 0,
        remainingDays: policy.totalDays,
      },
    });
  }

  // Send welcome email with credentials
  try {
    const passwordInfo = tempPassword 
      ? `<tr><td><strong>Temporary Password</strong></td><td>${tempPassword}</td></tr>`
      : `<tr><td colspan="2"><strong>Password set by administrator</strong></td></tr>`;
    
    await sendEmail(data.email, 'Welcome to WorkNex AI — Your Account is Ready', `
      <h2>Welcome to WorkNex AI!</h2>
      <p>Your account has been created. Here are your login credentials:</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse">
        <tr><td><strong>Email</strong></td><td>${data.email}</td></tr>
        ${passwordInfo}
        <tr><td><strong>Employee ID</strong></td><td>${data.employeeId}</td></tr>
      </table>
      <p><strong>Please change your password after first login.</strong></p>
      <p>— WorkNex AI Team</p>
    `);
  } catch {
    // Non-blocking — user is created even if email fails
  }

  return { user: serializeUser(user), tempPassword };
};

const updateUser = async (id, data, requestingUser) => {
  await assertCanAccessUser(requestingUser, id);
  const { password, passwordHash, roleId: requestedRoleId, role: requestedTier, ...safeData } = data;
  delete safeData.organizationId;
  const target = await prisma.user.findFirst({ where: { id, ...getOrganizationScope(requestingUser) }, select: { organizationId: true } });
  if (!target) throw new ApiError(404, 'User not found');

  if (requestedRoleId) {
    const customRole = await prisma.role.findFirst({
      where: { id: requestedRoleId, organizationId: target.organizationId },
      select: { id: true },
    });
    if (!customRole) throw new ApiError(400, 'Role not found in organization');
    safeData.roleId = customRole.id;
  } else if (requestedTier) {
    const roleId = await getSystemRoleId(prisma, target.organizationId, requestedTier);
    if (!roleId) throw new ApiError(400, `No system role found for tier ${requestedTier} in this organization`);
    safeData.roleId = roleId;
  }

  // Convert joiningDate string to DateTime if provided
  if (safeData.joiningDate) {
    safeData.joiningDate = new Date(safeData.joiningDate);
  }

  if (safeData.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: safeData.departmentId, organizationId: target.organizationId },
    });
    if (!department) throw new ApiError(400, 'Department not found');
  }

  if (safeData.staffCategoryId) {
    const category = await prisma.staffCategory.findFirst({
      where: { id: safeData.staffCategoryId, organizationId: target.organizationId },
    });
    if (!category) throw new ApiError(400, 'Staff category not found');
  }

  if (safeData.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: safeData.managerId, organizationId: target.organizationId },
    });
    if (!manager) throw new ApiError(400, 'Assigned manager not found');
  }

  const user = await prisma.user.update({ where: { id }, data: safeData, select: userSelect });
  return serializeUser(user);
};

const deactivateUser = async (id, requestingUser) => {
  await assertCanAccessUser(requestingUser, id);
  return prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true } });
};

const updateMe = async (userId, data) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profilePicture'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  const user = await prisma.user.update({ where: { id: userId }, data: safeData, select: userSelect });
  return serializeUser(user);
};

const getDepartments = async (requestingUser) => {
  return prisma.department.findMany({
    where: getOrganizationScope(requestingUser),
    orderBy: { name: 'asc' },
  });
};

const createDepartment = async (data, requestingUser) => {
  if (!isPlatformAdmin(requestingUser) && data.organizationId && data.organizationId !== requestingUser.organizationId) {
    throw new ApiError(403, 'Cannot create department in another organization');
  }

  const organizationId = isPlatformAdmin(requestingUser)
    ? data.organizationId || requestingUser.organizationId
    : requestingUser.organizationId;

  assertOrganizationAccess(requestingUser, organizationId);
  return prisma.department.create({ data: { ...data, organizationId } });
};

const updateDepartment = async (id, data, requestingUser) => {
  const department = await prisma.department.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!department) throw new ApiError(404, 'Department not found');
  assertOrganizationAccess(requestingUser, department.organizationId);
  const { organizationId, ...safeData } = data;
  return prisma.department.update({
    where: { id },
    data: safeData,
  });
};

const deleteDepartment = async (id, requestingUser) => {
  const department = await prisma.department.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!department) throw new ApiError(404, 'Department not found');
  assertOrganizationAccess(requestingUser, department.organizationId);
  const activeUsers = await prisma.user.count({
    where: { organizationId: department.organizationId, departmentId: id, isActive: true },
  });
  if (activeUsers > 0) {
    throw new ApiError(409, 'Cannot delete department with active users. Reassign or deactivate users first.');
  }
  await prisma.department.delete({ where: { id } });
  return { id };
};

const purgeUserHrData = async (id, requestingUser) => {
  await assertCanAccessUser(requestingUser, id);
  const organizationId = requestingUser.organizationId;
  const target = await prisma.user.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!target) throw new ApiError(404, 'User not found');
  return prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.deleteMany({ where: { organizationId, userId: id } });
    const leaveRequests = await tx.leaveRequest.deleteMany({ where: { organizationId, employeeId: id } });
    const leaveBalances = await tx.leaveBalance.deleteMany({ where: { organizationId, userId: id } });
    const attrition = await tx.attritionRecord.deleteMany({ where: { organizationId, userId: id } });
    const performance = await tx.performanceRecord.deleteMany({ where: { organizationId, userId: id } });
    const counts = { attendance: attendance.count, leaveRequests: leaveRequests.count, leaveBalances: leaveBalances.count, performance: performance.count, attrition: attrition.count };
    await tx.auditLog.create({ data: { organizationId, userId: requestingUser.id, action: 'DELETE', entity: 'UserHrData', entityId: id, newValues: counts } });
    return counts;
  });
};

module.exports = {
  getAllUsers, getUserById, getUsersByDepartment,
  createUser, updateUser, deactivateUser, updateMe,
  getDepartments, createDepartment, updateDepartment, deleteDepartment, purgeUserHrData,
};
