const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { paginate, paginateMeta } = require('../../utils/pagination');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../../config/email');

const userSelect = {
  id: true, employeeId: true, firstName: true, lastName: true,
  email: true, role: true, designation: true, phone: true,
  joiningDate: true, isActive: true, twoFAEnabled: true,
  profilePicture: true, createdAt: true,
  departmentId: true, // Added: needed for frontend
  managerId: true, // Added: CRITICAL - needed for team filtering
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
};

const getAllUsers = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.role) where.role = query.role;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
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

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const getUsersByDepartment = async (deptId) => {
  return prisma.user.findMany({
    where: { departmentId: deptId, isActive: true },
    select: userSelect,
  });
};

const createUser = async (data) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { employeeId: data.employeeId }] },
  });
  if (existing) throw new ApiError(409, 'Email or Employee ID already exists');

  // Validate department exists if provided
  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new ApiError(400, 'Department not found');
  }

  // Validate manager exists and has correct role
  if (data.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: data.managerId } });
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
      passwordHash,
      joiningDate: userData.joiningDate || new Date(),
      isActive: userData.isActive !== undefined ? userData.isActive : true
    },
    select: userSelect,
  });

  // Initialize leave balances for all active policies
  const policies = await prisma.leavePolicy.findMany();
  const year = new Date().getFullYear();
  for (const policy of policies) {
    await prisma.leaveBalance.upsert({
      where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year } },
      update: {},
      create: {
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

const updateUser = async (id, data) => {
  const { password, passwordHash, ...safeData } = data;
  
  // Convert joiningDate string to DateTime if provided
  if (safeData.joiningDate) {
    safeData.joiningDate = new Date(safeData.joiningDate);
  }
  
  return prisma.user.update({ where: { id }, data: safeData, select: userSelect });
};

const deactivateUser = async (id) => {
  return prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true } });
};

const updateMe = async (userId, data) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profilePicture'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  return prisma.user.update({ where: { id: userId }, data: safeData, select: userSelect });
};

const getDepartments = async () => {
  return prisma.department.findMany({ orderBy: { name: 'asc' } });
};

const createDepartment = async (data) => {
  return prisma.department.create({ data });
};

module.exports = {
  getAllUsers, getUserById, getUsersByDepartment,
  createUser, updateUser, deactivateUser, updateMe,
  getDepartments, createDepartment,
};
