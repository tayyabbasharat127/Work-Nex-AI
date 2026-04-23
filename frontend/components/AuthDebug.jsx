'use client';

import { useEffect, useState } from 'react';

export default function AuthDebug() {
  const [authInfo, setAuthInfo] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      setAuthInfo({
        hasToken: !!token,
        token: token ? `${token.substring(0, 20)}...` : 'No token',
        user: user ? JSON.parse(user) : null,
      });
    }
  }, []);

  if (!authInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="text-xs space-y-1">
        <p>
          <span className="font-semibold">Token:</span>{' '}
          <span className={authInfo.hasToken ? 'text-success' : 'text-destructive'}>
            {authInfo.hasToken ? '✓ Present' : '✗ Missing'}
          </span>
        </p>
        {authInfo.user && (
          <>
            <p><span className="font-semibold">User:</span> {authInfo.user.name}</p>
            <p><span className="font-semibold">Email:</span> {authInfo.user.email}</p>
            <p><span className="font-semibold">Role:</span> {authInfo.user.role}</p>
          </>
        )}
        {!authInfo.hasToken && (
          <p className="text-destructive mt-2">
            ⚠️ Please login first at <a href="/login" className="underline">/login</a>
          </p>
        )}
      </div>
    </div>
  );
}
