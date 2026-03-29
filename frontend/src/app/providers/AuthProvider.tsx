"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthUser = {
  userId: number;
  roleId: number;
  organizationId: number;
  email: string;
  name?: string;
  is_super_admin?: boolean;
  subscription_tier?: string;
  [key: string]: unknown;
};

type AuthContextValue = {
  user: AuthUser | null;
  roleId: number | null;
  organizationId: number | null;
  token: string | null;
  loading: boolean;
  setUserData: (payload: { user?: AuthUser | null; token?: string | null }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedUser = localStorage.getItem("user");
      const storedToken =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        null;

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Normalize user data to ensure consistent field names
        const normalizedUser = {
          userId: parsedUser.userId || parsedUser.user_id,
          roleId: parsedUser.roleId || parsedUser.role_id,
          organizationId: parsedUser.organizationId || parsedUser.organization_id,
          email: parsedUser.email,
          name: parsedUser.name,
          is_super_admin: parsedUser.is_super_admin || false,
          subscription_tier: parsedUser.subscription_tier || 'basic',
          ...parsedUser
        };
        setUser(normalizedUser);
      }
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Failed to hydrate auth state", error);
      // Clear corrupted data
      if (typeof window !== "undefined") {
        ["token", "accessToken", "refreshToken", "user", "roleId"].forEach(
          (key) => localStorage.removeItem(key)
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      ["token", "accessToken", "refreshToken", "user", "roleId", "organizationId"].forEach(
        (key) => localStorage.removeItem(key)
      );
      setUser(null);
      setToken(null);
      // Use window.location.href for better compatibility
      window.location.href = "/auth/login";
    }
  }, []);

  const setUserData = useCallback(
    ({ user: nextUser, token: nextToken }: { user?: AuthUser | null; token?: string | null }) => {
      if (typeof window === "undefined") return;

      if (typeof nextUser !== "undefined") {
        if (nextUser) {
          // Normalize user data before storing
          const normalizedUser = {
            userId: nextUser.userId || nextUser.user_id,
            roleId: nextUser.roleId || nextUser.role_id,
            organizationId: nextUser.organizationId || nextUser.organization_id,
            email: nextUser.email,
            name: nextUser.name,
            is_super_admin: nextUser.is_super_admin || false,
            subscription_tier: nextUser.subscription_tier || 'basic',
            ...nextUser
          };
          localStorage.setItem("user", JSON.stringify(normalizedUser));
          localStorage.setItem("roleId", String(normalizedUser.roleId));
          localStorage.setItem("organizationId", String(normalizedUser.organizationId));
        } else {
          localStorage.removeItem("user");
          localStorage.removeItem("roleId");
          localStorage.removeItem("organizationId");
        }
        setUser(nextUser ?? null);
      }

      if (typeof nextToken !== "undefined") {
        if (nextToken) {
          localStorage.setItem("token", nextToken);
        } else {
          ["token", "accessToken"].forEach((key) => localStorage.removeItem(key));
        }
        setToken(nextToken ?? null);
      }
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roleId: user?.roleId ?? (user?.role_id as number) ?? null,
      organizationId: user?.organizationId ?? (user?.organization_id as number) ?? null,
      token,
      loading,
      setUserData,
      logout: handleLogout,
    }),
    [user, token, loading, handleLogout, setUserData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
