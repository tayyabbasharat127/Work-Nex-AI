'use client';

import { useState } from 'react';

function readAuthInfo() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');

  return {
    hasUser: !!user,
    user: user ? JSON.parse(user) : null,
  };
}

export default function AuthDebug() {
  const [authInfo] = useState(readAuthInfo);

  if (!authInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="text-xs space-y-1">
        <p>
          <span className="font-semibold">Access token:</span>{' '}
          <span className="text-muted-foreground">Memory only; refresh token is httpOnly cookie based.</span>
        </p>
        {authInfo.user && (
          <>
            <p><span className="font-semibold">User:</span> {authInfo.user.name}</p>
            <p><span className="font-semibold">Email:</span> {authInfo.user.email}</p>
            <p><span className="font-semibold">Role:</span> {authInfo.user.role}</p>
          </>
        )}
        {!authInfo.hasUser && (
          <p className="text-destructive mt-2">
            Please login first at <a href="/login" className="underline">/login</a>
          </p>
        )}
      </div>
    </div>
  );
}
