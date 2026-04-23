import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      // Backend returns: { success, message, data: { accessToken, refreshToken, user } }
      const user = response.data?.user || response.user;
      if (user) {
        setUser(user);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const superAdminLogin = async (email, password) => {
    try {
      const data = await authAPI.superAdminLogin(email, password);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const data = await authAPI.signup(userData);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    router.push('/login');
  };

  return {
    user,
    loading,
    login,
    superAdminLogin,
    signup,
    logout,
    isAuthenticated: !!user,
  };
}
