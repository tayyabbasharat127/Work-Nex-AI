import { apiFetch } from './client';

const ROLE_MAP = { 1: 'ADMIN', 2: 'MANAGER', 3: 'EMPLOYEE', 0: 'SUPER_ADMIN' };

// Convert to string or return undefined (not null, not empty string) —
// shared by create/update so optional relational IDs never get sent as ''.
const toStringOrUndefined = (value) => {
  if (!value || value === '' || value === 'null' || value === 'undefined') {
    return undefined;
  }
  return String(value);
};

export const userAPI = {
  getMe: async () => {
    const response = await apiFetch('/users/me');
    return response.data || response;
  },

  updateMe: async (userData) => {
    const response = await apiFetch('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data || response;
  },

  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/users${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getById: async (userId) => {
    const response = await apiFetch(`/users/${userId}`);
    return response.data || response;
  },

  create: async (userData) => {
    // Transform frontend data to backend format
    const [firstName, ...lastNameParts] = (userData.name || '').trim().split(/\s+/);
    const lastName = lastNameParts.join(' ') || '';

    // Generate employeeId if not provided
    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;

    // Validate required fields before sending
    if (!userData.email || !userData.email.trim()) {
      throw new Error('Email is required');
    }
    if (!(userData.firstName || firstName || '').trim()) {
      throw new Error('First name is required');
    }
    if (!(userData.lastName || lastName || '').trim()) {
      throw new Error('Last name is required');
    }

    const backendData = {
      email: userData.email.trim(),
      firstName: (userData.firstName || firstName || '').trim(),
      lastName: (userData.lastName || lastName || '').trim(),
      employeeId: employeeId,
      role: userData.role || ROLE_MAP[userData.role_id] || 'EMPLOYEE',
    };
    // A specific dynamic role (including custom roles) takes precedence over the tier fallback above.
    if (userData.roleId) backendData.roleId = userData.roleId;

    // Only add optional fields if they have valid values
    const departmentId = toStringOrUndefined(userData.departmentId || userData.department_id);
    if (departmentId) backendData.departmentId = departmentId;

    const staffCategoryId = toStringOrUndefined(userData.staffCategoryId || userData.staff_category_id);
    if (staffCategoryId) backendData.staffCategoryId = staffCategoryId;

    const managerId = toStringOrUndefined(userData.managerId || userData.manager_id);
    if (managerId) backendData.managerId = managerId;

    const designation = userData.designation?.trim();
    if (designation) backendData.designation = designation;

    const phone = userData.phone?.trim();
    if (phone) backendData.phone = phone;

    const joiningDate = userData.joiningDate?.trim();
    if (joiningDate) backendData.joiningDate = joiningDate;

    // Include password if provided (optional - backend will auto-generate if not provided)
    const password = userData.password?.trim();
    if (password) backendData.password = password;

    const response = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
    return response.data || response;
  },

  update: async (userId, userData) => {
    // Transform frontend data to backend format
    const updateData = {};

    // Handle name splitting if provided
    if (userData.name) {
      const [firstName, ...lastNameParts] = userData.name.split(' ');
      updateData.firstName = firstName || 'User';
      updateData.lastName = lastNameParts.join(' ') || 'User';
    }

    // Map role_id to role string if provided
    if (userData.role_id !== undefined) {
      updateData.role = ROLE_MAP[userData.role_id] || 'EMPLOYEE';
    }
    // A specific dynamic role (including custom roles) takes precedence over the tier fallback above.
    if (userData.roleId) updateData.roleId = userData.roleId;

    // Map other fields
    if (userData.email) updateData.email = userData.email;
    if (userData.firstName) updateData.firstName = userData.firstName.trim();
    if (userData.lastName) updateData.lastName = userData.lastName.trim();
    if (userData.employeeId) updateData.employeeId = userData.employeeId;
    if (userData.role) updateData.role = userData.role;

    // Convert IDs to strings (UUIDs)
    if (userData.departmentId || userData.department_id) {
      const deptId = userData.departmentId || userData.department_id;
      updateData.departmentId = deptId && deptId !== '' ? String(deptId) : null;
    }

    if (userData.staffCategoryId || userData.staff_category_id) {
      const catId = userData.staffCategoryId || userData.staff_category_id;
      updateData.staffCategoryId = catId && catId !== '' ? String(catId) : null;
    }

    if (userData.managerId || userData.manager_id) {
      const mgrId = userData.managerId || userData.manager_id;
      updateData.managerId = mgrId && mgrId !== '' ? String(mgrId) : null;
    }

    if (userData.designation !== undefined) updateData.designation = userData.designation || null;
    if (userData.phone !== undefined) updateData.phone = userData.phone || null;
    if (userData.joiningDate !== undefined) updateData.joiningDate = userData.joiningDate || null;

    const password = userData.password?.trim();
    if (password) updateData.password = password;

    // Handle status -> isActive conversion
    if (userData.status !== undefined) {
      updateData.isActive = userData.status === 'Active';
    }

    const response = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.data || response;
  },

  deactivate: (userId) => apiFetch(`/users/${userId}`, {
    method: 'DELETE'
  }),

  getByDepartment: async (deptId) => {
    const response = await apiFetch(`/users/department/${deptId}`);
    return response.data || response;
  },
};
