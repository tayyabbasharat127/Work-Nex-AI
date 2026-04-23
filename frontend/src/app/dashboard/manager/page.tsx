"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/app/providers/AuthProvider";

export default function ManagerDashboardRedirect() {
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

    // Check if user is manager
    const roleId = String(user.roleId || user.role_id);
    
    if (roleId !== "2") {
      // Not manager, redirect to appropriate dashboard
      switch (roleId) {
        case "1":
          router.push("/dashboard/admin");
          break;
        case "3":
          router.push("/dashboard/employee");
          break;
        default:
          router.push("/auth/login");
          break;
      }
      return;
    }

    // User is manager, redirect to main manager page
    router.push("/dashboard/manager/main");
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
      <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading Manager Dashboard...</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
