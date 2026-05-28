'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    admin_name: '',
    admin_email: '',
    password: '',
    confirmPassword: '',
    organization_name: '',
    subscription_plan: 'Pro',
    industry: '',
    company_domain: '',
    city: '',
    country: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'Contains number', met: /[0-9]/.test(formData.password) }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.admin_name || !formData.admin_email || !formData.password || !formData.confirmPassword || !formData.organization_name || !formData.industry || !formData.company_domain || !formData.city || !formData.country) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!passwordRequirements.every(req => req.met)) {
        setError('Password does not meet all requirements');
        return;
      }

      // Call signup API with correct field names
      const response = await signup({
        organization_name: formData.organization_name,
        admin_name: formData.admin_name,
        admin_email: formData.admin_email,
        password: formData.password,
        subscription_plan: formData.subscription_plan,
        industry: formData.industry,
        company_domain: formData.company_domain,
        city: formData.city,
        country: formData.country
      });

      // Registration successful - redirect to login
      alert('Registration successful! You can now login with your credentials.');
      router.push('/login');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">W</span>
            </div>
            <span className="text-2xl font-bold">WorkNexAI</span>
          </div>
          <h1 className="text-3xl font-bold">Get Started</h1>
          <p className="text-muted-foreground mt-2">Create your account to begin</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Admin Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              name="admin_name"
              value={formData.admin_name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <input
              type="email"
              name="admin_email"
              value={formData.admin_email}
              onChange={handleChange}
              placeholder="admin@responder.com"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              placeholder="Your Company"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <input
              type="text"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="Technology"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Company Domain */}
          <div>
            <label className="block text-sm font-medium mb-2">Company Domain</label>
            <input
              type="text"
              name="company_domain"
              value={formData.company_domain}
              onChange={handleChange}
              placeholder="company.com"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="New York"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium mb-2">Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="United States"
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-medium mb-2">Subscription Plan</label>
            <select
              name="subscription_plan"
              value={formData.subscription_plan}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            >
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="MyPassword123"
                className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="MyPassword123"
                className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {formData.password && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
              <p className="font-semibold text-foreground">Password requirements:</p>
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check size={16} className={req.met ? 'text-success' : 'text-muted-foreground'} />
                  <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Terms */}
          <label className="flex items-start gap-3">
            <input type="checkbox" className="w-4 h-4 rounded border-border bg-input mt-1" />
            <span className="text-sm text-muted-foreground">
              I agree to the{' '}
              <Link href="#" className="text-primary hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="#" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
