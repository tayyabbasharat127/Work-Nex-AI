'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPending2FAUserId } from '@/lib/api';

export default function AuthCheck({ children }) {
  const { isAuthenticated, initialized } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return; // wait for session restoration to finish

    if (!isAuthenticated) {
      if (getPending2FAUserId()) {
        router.push('/verify-otp');
        return;
      }
      toast.error('Please login to access this page', {
        description: 'Your session has expired or you are not logged in.',
        action: { label: 'Login', onClick: () => router.push('/login') },
      });
      router.push('/login');
    }
  }, [initialized, isAuthenticated, router]);

  // Show a minimal spinner while restoring the session.
  // This prevents a flash-of-unauthenticated-content on refresh.
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#070d1a' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold">W</span>
          </div>
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
