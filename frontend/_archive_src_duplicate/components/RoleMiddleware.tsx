"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/app/providers/AuthProvider";

interface RoleMiddlewareProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function RoleMiddleware({ children, allowedRoles, redirectTo = "/auth/login" }: RoleMiddlewareProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If still loading authentication, wait
    if (loading) {
      return;
    }

    // If no user, redirect to login
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Check if user's role is allowed
    const roleId = String(user.roleId || user.role_id);
    
    if (!allowedRoles.includes(roleId)) {
      // User's role is not allowed, redirect to appropriate dashboard
      switch (roleId) {
        case "1": // Admin
          router.push("/dashboard/admin/users");
          break;
        case "2": // Manager
          router.push("/dashboard/manager");
          break;
        case "3": // Employee
          router.push("/dashboard/employee");
          break;
        default:
          router.push(redirectTo);
          break;
      }
      return;
    }
  }, [user, loading, router, allowedRoles, redirectTo]);

  // If loading or user not authenticated, show loading state
  if (loading || !user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading...</p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Check if user's role is allowed
  const roleId = String(user.roleId || user.role_id);
  
  if (!allowedRoles.includes(roleId)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

// Specific middleware components for each role
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return <RoleMiddleware allowedRoles={["1"]}>{children}</RoleMiddleware>;
}

export function ManagerOnly({ children }: { children: React.ReactNode }) {
  return <RoleMiddleware allowedRoles={["2"]}>{children}</RoleMiddleware>;
}

export function EmployeeOnly({ children }: { children: React.ReactNode }) {
  return <RoleMiddleware allowedRoles={["3"]}>{children}</RoleMiddleware>;
}

export function AdminOrManager({ children }: { children: React.ReactNode }) {
  return <RoleMiddleware allowedRoles={["1", "2"]}>{children}</RoleMiddleware>;
}

export function ManagerOrEmployee({ children }: { children: React.ReactNode }) {
  return <RoleMiddleware allowedRoles={["2", "3"]}>{children}</RoleMiddleware>;
}
