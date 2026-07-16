'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/authStorage';

export default function RoleGate({ allow = [], children }) {
  const router = useRouter();
  const [user] = useState(getStoredUser);
  const role = user?.role;
  const allowed = role && allow.includes(role);
  const roleHome = role === 'ADMIN' || role === 'SUPER_ADMIN'
    ? '/dashboard/admin'
    : role === 'MANAGER'
      ? '/dashboard/manager'
      : '/dashboard/employee';

  useEffect(() => {
    if (!role) router.replace('/login');
    else if (!allowed) router.replace(roleHome);
  }, [allowed, role, roleHome, router]);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Redirecting to login...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Redirecting to your dashboard...
      </div>
    );
  }

  return children;
}
