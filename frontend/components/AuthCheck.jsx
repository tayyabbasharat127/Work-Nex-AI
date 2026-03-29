'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AuthCheck({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        toast.error('Please login to access this page', {
          description: 'You need to be authenticated',
          action: {
            label: 'Login',
            onClick: () => router.push('/login')
          }
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      
      setIsChecking(false);
    }
  };

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
