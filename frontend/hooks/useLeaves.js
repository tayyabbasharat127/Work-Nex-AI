import { useState } from 'react';
import { leaveAPI } from '@/lib/api';

export function useLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching my leaves...');
      
      const data = await leaveAPI.getMyLeaves();
      console.log('Raw API response:', data);
      
      // Handle different response formats
      const leavesData = Array.isArray(data) ? data : (data?.leaves || data?.data || []);
      console.log('Processed leaves data:', leavesData);
      console.log('Number of leaves:', leavesData.length);
      
      setLeaves(leavesData);
      return leavesData;
    } catch (err) {
      console.error('Fetch my leaves error:', err);
      setError(err.message);
      setLeaves([]); // Set empty array on error
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await leaveAPI.getAllLeaves(params);
      // Handle different response formats
      const leavesData = Array.isArray(data) ? data : (data?.leaves || data?.data || []);
      setLeaves(leavesData);
      return leavesData;
    } catch (err) {
      setError(err.message);
      setLeaves([]); // Set empty array on error
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createLeave = async (leaveData) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Creating leave with data:', leaveData);
      
      const data = await leaveAPI.create(leaveData);
      console.log('Leave created, response:', data);
      
      // Refresh leaves
      console.log('Refreshing leaves list...');
      await fetchMyLeaves();
      console.log('Leaves refreshed');
      
      return data;
    } catch (err) {
      console.error('Create leave error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLeaveStatus = async (leaveId, status, remarks) => {
    try {
      setLoading(true);
      setError(null);
      const data = await leaveAPI.updateStatus(leaveId, status, remarks);
      await fetchAllLeaves(); // Refresh leaves
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteLeave = async (leaveId) => {
    try {
      setLoading(true);
      setError(null);
      await leaveAPI.delete(leaveId);
      await fetchMyLeaves(); // Refresh leaves
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    leaves,
    loading,
    error,
    fetchMyLeaves,
    fetchAllLeaves,
    createLeave,
    updateLeaveStatus,
    deleteLeave,
  };
}
