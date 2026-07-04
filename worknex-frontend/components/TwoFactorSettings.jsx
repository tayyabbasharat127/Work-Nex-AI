'use client';

import { useEffect, useState } from 'react';
import { KeyRound, QrCode, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { authAPI, userAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function TwoFactorSettings() {
  const [twoFAEnabled, setTwoFAEnabled]   = useState(false);
  const [setupData,    setSetupData]       = useState(null);
  const [verifyToken,  setVerifyToken]     = useState('');
  const [disableToken, setDisableToken]    = useState('');
  const [loading,      setLoading]         = useState(false);
  const [inlineError,  setInlineError]     = useState('');

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const user = await userAPI.getMe();
      setTwoFAEnabled(!!user.twoFAEnabled);
    } catch (err) {
      console.error('[2FA] Failed to load status:', err);
    }
  };

  const startSetup = async () => {
    try {
      setLoading(true);
      const response = await authAPI.setup2FA();
      setSetupData(response.data);
      setVerifyToken('');
      toast.success('Scan the QR code then enter a code to enable 2FA');
    } catch (err) {
      toast.error(err.message || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async (e) => {
    e.preventDefault();
    if (verifyToken.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    try {
      setLoading(true);
      await authAPI.verify2FA(verifyToken);
      setSetupData(null);
      setVerifyToken('');
      setTwoFAEnabled(true);
      toast.success('2FA enabled successfully');
      await loadStatus();
    } catch (err) {
      toast.error(err.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  // Called via button onClick — NOT form submit — to avoid any outer-form interference
  const handleDisable = async () => {
    setInlineError('');

    if (disableToken.length !== 6) {
      setInlineError('Please enter the full 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      console.log('[2FA] Attempting disable with token:', disableToken);
      await authAPI.disable2FA(disableToken);
      console.log('[2FA] Disable succeeded');
      setDisableToken('');
      setTwoFAEnabled(false);
      toast.success('2FA disabled successfully');
      await loadStatus();
    } catch (err) {
      console.error('[2FA] Disable failed:', err);
      const msg = err.message || 'Failed to disable 2FA';
      setInlineError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-6 border-t border-border">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="text-base font-semibold flex items-center gap-2">
            <KeyRound size={18} />
            Two-Factor Authentication
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {twoFAEnabled
              ? '2FA is active for this account.'
              : 'Add an authenticator app code to protect sign-in.'}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
          twoFAEnabled ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
        }`}>
          {twoFAEnabled ? 'Enabled' : 'Off'}
        </span>
      </div>

      {/* ── Enable flow ──────────────────────────────────────────────────────── */}
      {!twoFAEnabled && !setupData && (
        <button
          type="button"
          onClick={startSetup}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border hover:bg-muted transition font-medium disabled:opacity-50"
        >
          <ShieldCheck size={18} />
          Enable 2FA
        </button>
      )}

      {!twoFAEnabled && setupData && (
        <form onSubmit={verifySetup} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            {setupData.qrCode && (
              <div className="rounded-lg border border-border bg-white p-3">
                <img src={setupData.qrCode} alt="2FA QR" className="w-full h-auto" />
              </div>
            )}
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <QrCode size={16} /> Scan this QR code
              </p>
              {setupData.secret && (
                <div>
                  <label className="block text-sm font-medium mb-2">Manual key</label>
                  <input
                    type="text" readOnly value={setupData.secret}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted font-mono text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Authenticator code</label>
                <input
                  type="text" inputMode="numeric"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading || verifyToken.length !== 6}
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Verify and Enable
            </button>
            <button type="button" onClick={() => { setSetupData(null); setVerifyToken(''); }}
              className="px-5 py-3 rounded-xl border border-border hover:bg-muted transition font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Disable flow — uses button onClick, NOT form submit ──────────────── */}
      {twoFAEnabled && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Enter your authenticator code to disable 2FA
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={disableToken}
              onChange={(e) => {
                setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6));
                setInlineError('');
              }}
              placeholder="123456"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-lg font-bold"
            />
            <button
              type="button"
              onClick={handleDisable}
              disabled={loading || disableToken.length !== 6}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-destructive text-destructive hover:bg-destructive/10 transition font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <ShieldOff size={18} />
              }
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>

          {/* Inline error — always visible, not dismissible like a toast */}
          {inlineError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {inlineError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
