const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { assertCanAccessUser, getAccessibleUserIds, isPlatformAdmin } = require('../../utils/rbac');
const { assertOrganizationAccess, getOrganizationScope } = require('../../utils/tenant');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../../config/email');

const userSelect = {
  id: true, employeeId: true, firstName: true, lastName: true,
  email: true, role: true, designation: true, phone: true,
  joiningDate: true, isActive: true, twoFAEnabled: true,
  profilePicture: true, createdAt: true,
  departmentId: true, // Added: needed for frontend
  managerId: true, // Added: CRITICAL - needed for team filtering
  organizationId: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
};

const getAllUsers = async (query, requestingUser) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.role) where.role = query.role;
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

  return { users, meta: paginateMeta(total, page, limit) };
};

const getUserById = async (id, requestingUser = null) => {
  if (requestingUser) {
    await assertCanAccessUser(requestingUser, id);
  }

  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const getUsersByDepartment = async (deptId, requestingUser) => {
  const where = { departmentId: deptId, isActive: true };

  Object.assign(where, getOrganizationScope(requestingUser));

  if (requestingUser && !['SUPER_ADMIN', 'ADMIN'].includes(requestingUser.role)) {
    const accessibleUserIds = await getAccessibleUserIds(requestingUser);
    where.id = { in: accessibleUserIds };
  }

  return prisma.user.findMany({
    where,
    select: userSelect,
  });
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

  // Validate manager exists and has correct role
  if (data.managerId) {
    const manager = await prisma.user.findFirst({ where: { id: data.managerId, organizationId } });
    if (!manager) throw new ApiError(400, 'Assigned manager not found');
    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(manager.role)) {
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
  const { password, ...userData } = data;
  
  // Convert joiningDate string to DateTime if provided
  if (userData.joiningDate) {
    userData.joiningDate = new Date(userData.joiningDate);
  }
  
  const user = await prisma.user.create({
    data: { 
      ...userData, 
      organizationId,
      passwordHash,
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

  return { user, tempPassword };
};

const updateUser = async (id, data, requestingUser) => {
  await assertCanAccessUser(requestingUser, id);
  const { password, passwordHash, ...safeData } = data;
  delete safeData.organizationId;
  const target = await prisma.user.findUnique({ where: { id }, select: { organizationId: true } });
  if (!target) throw new ApiError(404, 'User not found');
  
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

  if (safeData.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: safeData.managerId, organizationId: target.organizationId },
    });
    if (!manager) throw new ApiError(400, 'Assigned manager not found');
  }
  
  return prisma.user.update({ where: { id }, data: safeData, select: userSelect });
};

const deactivateUser = async (id, requestingUser) => {
  await assertCanAccessUser(requestingUser, id);
  return prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true } });
};

const updateMe = async (userId, data) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profilePicture'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  return prisma.user.update({ where: { id: userId }, data: safeData, select: userSelect });
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
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throw new ApiError(404, 'Department not found');
  assertOrganizationAccess(requestingUser, department.organizationId);
  const { organizationId, ...safeData } = data;
  return prisma.department.update({
    where: { id },
    data: safeData,
  });
};

const deleteDepartment = async (id, requestingUser) => {
  const department = await prisma.department.findUnique({ where: { id } });
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

module.exports = {
  getAllUsers, getUserById, getUsersByDepartment,
  createUser, updateUser, deactivateUser, updateMe,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
};
