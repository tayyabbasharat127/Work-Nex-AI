'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition text-sm';

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    admin_name: '', admin_email: '',
    organization_name: '', subscription_plan: 'Pro',
    industry: '', company_domain: '', city: '', country: '',
    password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters',    met: formData.password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'Contains number',           met: /[0-9]/.test(formData.password) },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!formData.admin_name || !formData.admin_email || !formData.password || !formData.confirmPassword ||
          !formData.organization_name || !formData.industry || !formData.company_domain || !formData.city || !formData.country) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
      if (!passwordRequirements.every((r) => r.met)) { setError('Password does not meet all requirements'); return; }

      await signup({
        organization_name: formData.organization_name,
        admin_name: formData.admin_name,
        admin_email: formData.admin_email,
        password: formData.password,
        subscription_plan: formData.subscription_plan,
        industry: formData.industry,
        company_domain: formData.company_domain,
        city: formData.city,
        country: formData.country,
      });
      toast.success('Account created successfully!', { description: 'You can now login with your credentials.', duration: 4000 });
      router.push('/login');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden" style={{ backgroundColor: '#070d1a' }}>
      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      {/* Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial="hidden" animate="visible" variants={stagger} className="relative w-full max-w-lg">
        {/* Logo */}
        <motion.div variants={fadeInUp} className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">WorkNex<span className="text-blue-400">AI</span></span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-white/40 text-sm">Set up WorkNexAI for your organization</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={fadeInUp} className="rounded-2xl border border-white/[0.07] bg-white/3 backdrop-blur-xl p-7 shadow-2xl shadow-black/40">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section: Personal */}
            <div>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Personal</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Full Name</label>
                  <input type="text" name="admin_name" value={formData.admin_name} onChange={handleChange} placeholder="John Doe" className={inputClass} />
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Email Address</label>
                  <input type="email" name="admin_email" value={formData.admin_email} onChange={handleChange} placeholder="admin@company.com" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5" />

            {/* Section: Organization */}
            <div>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Organization</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Company Name</label>
                  <input type="text" name="organization_name" value={formData.organization_name} onChange={handleChange} placeholder="Acme Corp" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-1.5">Industry</label>
                    <input type="text" name="industry" value={formData.industry} onChange={handleChange} placeholder="Technology" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-1.5">Company Domain</label>
                    <input type="text" name="company_domain" value={formData.company_domain} onChange={handleChange} placeholder="acme.com" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-1.5">City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="New York" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-1.5">Country</label>
                    <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="USA" className={inputClass} />
                  </div>
                </div>

                {/* Plan selector */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Subscription Plan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Basic', 'Pro', 'Enterprise'].map((plan) => (
                      <button key={plan} type="button" onClick={() => setFormData((p) => ({ ...p, subscription_plan: plan }))}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          formData.subscription_plan === plan
                            ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                            : 'border-white/10 bg-white/5 text-white/35 hover:border-white/20 hover:text-white/60'
                        }`}>
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5" />

            {/* Section: Security */}
            <div>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Security</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password strength */}
              {formData.password && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 grid grid-cols-2 gap-1.5">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Check size={11} className={req.met ? 'text-emerald-400' : 'text-white/15'} />
                      <span className={`text-xs transition-colors ${req.met ? 'text-emerald-400' : 'text-white/25'}`}>{req.label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input type="checkbox" required className="w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500 mt-0.5 shrink-0" />
              <span className="text-white/30 text-xs leading-relaxed">
                I agree to the{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-linear-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...</>
              ) : (
                <>Create Account <ArrowRight size={15} /></>
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.p variants={fadeInUp} className="text-center text-white/25 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Sign in</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
