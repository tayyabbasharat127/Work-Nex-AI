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
      
      const data = await leaveAPI.getMy(); // Fixed: was getMyLeaves
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
      const data = await leaveAPI.getAll(params); // Fixed: was getAllLeaves
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
  
  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leaveAPI.getPending();
      const leavesData = Array.isArray(data) ? data : (data?.leaves || data?.data || []);
      setLeaves(leavesData);
      return leavesData;
    } catch (err) {
      setError(err.message);
      setLeaves([]);
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
      
      const data = await leaveAPI.apply(leaveData); // Fixed: was create
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

  const updateLeaveStatus = async (leaveId, status, remarks = '') => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (status === 'Approved' || status === 'APPROVED') {
        data = await leaveAPI.approve(leaveId, remarks);
      } else if (status === 'Rejected' || status === 'REJECTED') {
        data = await leaveAPI.reject(leaveId, remarks);
      } else {
        throw new Error('Invalid status');
      }
      
      await fetchPendingLeaves(); // Refresh pending leaves for managers
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelLeave = async (leaveId) => {
    try {
      setLoading(true);
      setError(null);
      await leaveAPI.cancel(leaveId);
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
    fetchPendingLeaves,
    createLeave,
    updateLeaveStatus,
    cancelLeave,
  };
}
