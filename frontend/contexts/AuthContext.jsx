'use client';

import { createContext, useContext, useState } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

function readStoredUser() {
  if (typeof window === 'undefined') return null;
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading] = useState(false);
  const router = useRouter();

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const loggedInUser = response.data?.user || response.user;
      if (loggedInUser) {
        setUser(loggedInUser);
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
      const loggedInUser = response.data?.user || response.user;
      if (loggedInUser) {
        setUser(loggedInUser);
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

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    superAdminLogin,
    signup,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
