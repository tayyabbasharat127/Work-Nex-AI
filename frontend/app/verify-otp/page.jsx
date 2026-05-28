'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { authAPI, getPending2FAUserId, clearPending2FA } from '@/lib/api';

const roleRedirects = {
  SUPER_ADMIN: '/dashboard/admin',
  ADMIN: '/dashboard/admin',
  MANAGER: '/dashboard/manager',
  EMPLOYEE: '/dashboard/employee',
};

export default function VerifyOTPPage() {
  const router = useRouter();
  const [tokenDigits, setTokenDigits] = useState(['', '', '', '', '', '']);
  const [pendingUserId, setPendingUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const userId = getPending2FAUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }
    setPendingUserId(userId);
  }, [router]);

  const handleTokenChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const nextDigits = [...tokenDigits];
    nextDigits[index] = value.slice(0, 1);
    setTokenDigits(nextDigits);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !tokenDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = tokenDigits.join('');

    if (!pendingUserId) {
      router.replace('/login');
      return;
    }

    if (token.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.validate2FA(pendingUserId, token);
      const user = response.data?.user;
      if (!user?.role) {
        throw new Error('2FA validation succeeded, but user profile was not returned');
      }

      setSuccess(true);
      router.replace(roleRedirects[user.role] || '/dashboard/employee');
    } catch (err) {
      setError(err.message || 'Invalid authentication code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    clearPending2FA();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Verified</h1>
          <p className="text-muted-foreground mb-8">
            Your sign-in was verified. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          onClick={handleBackToLogin}
          className="inline-flex items-center gap-2 text-primary hover:underline mb-8"
        >
          <ArrowLeft size={20} />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-2">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {tokenDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleTokenChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary transition"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || tokenDigits.join('').length !== 6}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </div>
    </div>
  );
}
