import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { getStoredUser } from '@/lib/authStorage';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(getStoredUser);
  const [loading] = useState(false);
  const router = useRouter();

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      // Backend returns: { success, message, data: { accessToken, refreshToken, user } }
      const user = response.data?.user || response.user;
      if (user) {
        setUser(user);
      } else if (response.data?.requires2FA) {
        setUser(null);
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const superAdminLogin = async (email, password) => {
    try {
      const response = await authAPI.superAdminLogin(email, password);
      const user = response.data?.user || response.user;
      if (user) {
        setUser(user);
      }
      return response;
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

  const logout = async () => {
    await authAPI.logout();
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
