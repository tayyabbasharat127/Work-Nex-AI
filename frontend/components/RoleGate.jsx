'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function readUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export default function RoleGate({ allow = [], children }) {
  const router = useRouter();
  const [user] = useState(readUser);
  const role = user?.role;
  const allowed = role && allow.includes(role);

  useEffect(() => {
    if (!role) router.push('/login');
  }, [role, router]);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Redirecting to login...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold">Access restricted</p>
          <p className="text-sm text-muted-foreground mt-2">Your current role cannot open this dashboard page.</p>
        </div>
      </div>
    );
  }

  return children;
}
