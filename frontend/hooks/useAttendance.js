import { useState } from 'react';
import { attendanceAPI } from '@/lib/api';

export function useAttendance() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceAPI.getTodayStatus();
      setTodayStatus(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceAPI.getHistory(params);
      // Ensure data is always an array
      const historyArray = Array.isArray(data) ? data : (data?.data || data?.history || []);
      setHistory(historyArray);
      return historyArray;
    } catch (err) {
      setError(err.message);
      setHistory([]); // Set empty array on error
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceAPI.checkIn();
      await fetchTodayStatus(); // Refresh status
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceAPI.checkOut();
      await fetchTodayStatus(); // Refresh status
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const ping = async () => {
    try {
      const data = await attendanceAPI.ping();
      return data;
    } catch (err) {
      console.error('Ping failed:', err);
      throw err;
    }
  };

  return {
    todayStatus,
    history,
    loading,
    error,
    fetchTodayStatus,
    fetchHistory,
    checkIn,
    checkOut,
    ping,
  };
}
