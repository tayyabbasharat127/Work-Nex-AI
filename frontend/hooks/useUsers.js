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
      const data = await userAPI.getUsers(params);
      // Handle different response formats
      const usersData = Array.isArray(data) ? data : (data?.users || data?.data || []);
      // Map user_id to id for frontend compatibility and normalize status
      const mappedUsers = usersData.map(user => ({
        ...user,
        id: user.user_id || user.id,
        status: user.status ? (user.status.charAt(0).toUpperCase() + user.status.slice(1).toLowerCase()) : 'Active'
      }));
      setUsers(mappedUsers);
      return mappedUsers;
    } catch (err) {
      setError(err.message);
      setUsers([]); // Set empty array on error
      throw err;
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
