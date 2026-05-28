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
      const data = await attendanceAPI.getToday(); // Fixed: was getTodayStatus
      setTodayStatus(data);
      return data;
    } catch (err) {
      setError(err.message);
      setTodayStatus(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceAPI.getMy(params); // Fixed: was getHistory
      // Ensure data is always an array
      const historyArray = Array.isArray(data) ? data : (data?.data || data?.history || data?.attendance || []);
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

  const checkIn = async (latitude, longitude) => {
    try {
      setLoading(true);
      setError(null);
      // Get geolocation if not provided
      if (!latitude || !longitude) {
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      }
      const data = await attendanceAPI.checkIn(latitude, longitude);
      await fetchTodayStatus(); // Refresh status
      await fetchHistory({ limit: 30 }); // Refresh history
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
      await fetchHistory({ limit: 30 }); // Refresh history
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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
  };
}
