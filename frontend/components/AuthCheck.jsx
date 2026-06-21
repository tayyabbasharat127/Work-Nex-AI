'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getPending2FAUserId } from '@/lib/api';

export default function AuthCheck({ children }) {
  const router = useRouter();
  const [isAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (getPending2FAUserId()) return false;
    return Boolean(localStorage.getItem('user'));
  });
  const [isChecking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (getPending2FAUserId()) {
        router.push('/verify-otp');
        return;
      }

      toast.error('Please login to access this page', {
        description: 'You need to be authenticated',
        action: {
          label: 'Login',
          onClick: () => router.push('/login')
        }
      });

      const redirectTimer = setTimeout(() => {
        router.push('/login');
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-4">Redirecting to login...</p>
          <a href="/login" className="text-primary hover:underline">
            Click here if not redirected
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
