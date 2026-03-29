'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email) {
        setError('Please enter your email address');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-primary hover:underline mb-8"
        >
          <ArrowLeft size={20} />
          Back to login
        </Link>

        {!submitted ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">Reset Password</h1>
              <p className="text-muted-foreground mt-2">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success Message */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle size={64} className="text-success" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Check Your Email</h1>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>
              </p>
              <p className="text-muted-foreground text-sm mb-8">
                The link will expire in 24 hours. If you don't see the email, check your spam folder.
              </p>

              <button
                onClick={() => setSubmitted(false)}
                className="w-full py-3 rounded-lg border border-primary text-primary hover:bg-primary/10 transition font-semibold mb-4"
              >
                Try Another Email
              </button>

              <Link
                href="/login"
                className="block py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
