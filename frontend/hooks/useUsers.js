import { useState } from 'react';
import { userAPI } from '@/lib/api';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await userAPI.getAll(params);  // Fixed: was getUsers, should be getAll
      // Handle different response formats
      const usersData = Array.isArray(data) ? data : (data?.users || data?.data || []);
      
      // Map backend format to frontend format
      const roleMap = {
        'SUPER_ADMIN': 0,
        'ADMIN': 1,
        'MANAGER': 2,
        'EMPLOYEE': 3
      };
      
      const mappedUsers = usersData.map(user => ({
        ...user,
        id: user.id,
        user_id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        role_id: roleMap[user.role] || 3,
        role: user.role,
        department_id: user.departmentId || user.department?.id,
        department: user.department,
        manager_id: user.managerId || user.manager?.id,
        manager: user.manager,
        designation: user.designation,
        phone: user.phone,
        joiningDate: user.joiningDate,
        status: user.isActive ? 'Active' : 'Inactive',
        employeeId: user.employeeId,
        profilePicture: user.profilePicture,
        twoFAEnabled: user.twoFAEnabled,
        createdAt: user.createdAt
      }));
      
      setUsers(mappedUsers);
      return mappedUsers;
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.message);
      setUsers([]); // Set empty array on error
      return []; // Return empty array instead of throwing
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await userAPI.create(userData);
      await fetchUsers(); // Refresh users
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await userAPI.update(userId, userData);
      await fetchUsers(); // Refresh users
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      await userAPI.delete(userId);
      await fetchUsers(); // Refresh users
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
