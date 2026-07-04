'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { authAPI, getPending2FAUserId, clearPending2FA } from '@/lib/api';
import { toast } from 'sonner';

const roleRedirects = {
  SUPER_ADMIN: '/dashboard/admin',
  ADMIN:       '/dashboard/admin',
  MANAGER:     '/dashboard/manager',
  EMPLOYEE:    '/dashboard/employee',
};

// ── Static background — defined OUTSIDE component so it never remounts ────────
function PageShell({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: '#070d1a' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      {children}
    </div>
  );
}

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
    if (!userId) { router.replace('/login'); return; }
    setPendingUserId(userId);
  }, [router]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (tokenDigits.every((d) => d !== '') && pendingUserId && !loading) {
      handleSubmit({ preventDefault: () => {} });
    }
  }, [tokenDigits]);

  const handleTokenChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...tokenDigits];
    next[index] = value.slice(0, 1);
    setTokenDigits(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !tokenDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Allow pasting a full 6-digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...tokenDigits];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setTokenDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = tokenDigits.join('');
    if (!pendingUserId) { router.replace('/login'); return; }
    if (token.length !== 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.validate2FA(pendingUserId, token);
      const user = response.data?.user;
      if (!user?.role) throw new Error('2FA validation succeeded, but user profile was not returned');
      toast.success('OTP verified successfully!', { description: 'Redirecting to your dashboard...', duration: 3000 });
      setSuccess(true);
      router.replace(roleRedirects[user.role] || '/dashboard/employee');
    } catch (err) {
      const message = err.message || 'Invalid authentication code';
      setError(message);
      toast.error('Verification failed', { description: message, duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageShell>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="text-emerald-400 w-9 h-9" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Verified!</h1>
          <p className="text-white/40">Redirecting you to your dashboard...</p>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="relative w-full max-w-md">
        {/* Logo — animated once on mount, never re-animates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              WorkNex<span className="text-blue-400">AI</span>
            </span>
          </Link>

          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-blue-400 w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Two-Factor Auth</h1>
          <p className="text-white/40 text-sm">Enter the 6-digit code from your authenticator app</p>
        </motion.div>

        {/* Card — animated once on mount */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-white/[0.07] bg-white/3 backdrop-blur-xl p-8 shadow-2xl shadow-black/40"
        >
          {error && (
            <div className="mb-6 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP digit inputs — plain HTML, no motion, no re-animation */}
            <div className="flex gap-2.5 justify-center">
              {tokenDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleTokenChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-150"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || tokenDigits.join('').length !== 6}
              className="w-full py-3 rounded-xl bg-linear-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                : 'Verify Code'
              }
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-center"
        >
          <Link
            href="/login"
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Back to login
          </Link>
        </motion.div>
      </div>
    </PageShell>
  );

  function handleBackToLogin() { clearPending2FA(); }
}
