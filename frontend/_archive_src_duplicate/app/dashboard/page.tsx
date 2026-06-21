"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/app/providers/AuthProvider";

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If still loading authentication, wait
    if (loading) {
      return;
    }

    // If no user, redirect to login
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Redirect based on role
    const roleId = String(user.roleId || user.role_id);
    
    switch (roleId) {
      case "1": // Admin
        router.push("/dashboard/admin");
        break;
      case "2": // Manager
        router.push("/dashboard/manager");
        break;
      case "3": // Employee
        router.push("/dashboard/employee");
        break;
      default:
        // Unknown role, redirect to login
        router.push("/auth/login");
        break;
    }
  }, [user, loading, router]);

  // Show loading state while redirecting
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
      <p style={{ color: '#6b7280', fontSize: '16px' }}>Redirecting to your dashboard...</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
