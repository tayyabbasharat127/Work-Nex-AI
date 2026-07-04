'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, BarChart3, Users, Shield, Bell, Zap, ChevronRight, Check,
  Menu, X, Star, TrendingUp, Brain, ArrowRight, Activity,
  CalendarDays, UserCheck, Sparkles,
} from 'lucide-react';

// ─── Shared variants ──────────────────────────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070d1a]/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              WorkNex<span className="text-blue-400">AI</span>
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing', 'About'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm text-white/50 hover:text-white transition-colors font-medium"
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition font-medium px-4 py-2">
              Sign in
            </Link>
            <Link href="/register">
              <motion.span
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow cursor-pointer"
              >
                Get Started <ChevronRight size={14} />
              </motion.span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white/60 hover:text-white transition p-1"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#070d1a]/95 backdrop-blur-xl border-b border-white/5 px-4 pb-5 overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-4">
              {['Features', 'How It Works', 'Pricing', 'About'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-white/60 hover:text-white transition text-sm font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {item}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                <Link href="/login" className="flex-1 text-center py-2.5 rounded-xl border border-white/10 text-white/60 text-sm">
                  Sign in
                </Link>
                <Link href="/register" className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold">
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Hero Mockup ──────────────────────────────────────────────────────────────
function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto max-w-2xl mt-16 px-4"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-3xl scale-110 pointer-events-none" />

        {/* Dashboard card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 shadow-2xl shadow-black/60">
          {/* Window chrome */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">W</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">WorkNex Dashboard</p>
                <p className="text-white/30 text-xs">Admin Overview</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: 'Present Today', value: '247', icon: UserCheck, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-teal-500/20' },
              { label: 'On Leave', value: '18', icon: CalendarDays, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20' },
              { label: 'Attrition Risk', value: '3.2%', icon: Activity, color: 'text-violet-400', bg: 'from-violet-500/20 to-purple-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }, i) => (
              <div key={i} className={`rounded-xl bg-gradient-to-br ${bg} border border-white/5 p-3`}>
                <Icon size={13} className={`${color} mb-2`} />
                <p className="text-white font-bold text-base">{value}</p>
                <p className="text-white/40 text-xs leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 mb-3">
            <p className="text-white/30 text-xs mb-3">Weekly Attendance</p>
            <div className="flex items-end gap-1.5 h-14">
              {[72, 85, 68, 91, 79, 95, 88].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: 0.85 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: `${h}%`, transformOrigin: 'bottom' }}
                  className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-cyan-400"
                />
              ))}
            </div>
            <div className="flex mt-1.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className="flex-1 text-center text-white/20 text-xs">{d}</span>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="space-y-2">
            {[
              { dot: 'bg-emerald-400', text: 'Ali Khan checked in', time: '9:02 AM' },
              { dot: 'bg-blue-400', text: 'Sara Ahmed — leave approved', time: '8:45 AM' },
              { dot: 'bg-amber-400', text: 'AI flagged 3 late arrivals', time: '9:31 AM' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
                <span className="text-white/50 text-xs flex-1">{item.text}</span>
                <span className="text-white/20 text-xs">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating badge left */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute -left-4 sm:-left-14 top-1/4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl px-3 py-2 shadow-xl"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <TrendingUp size={11} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">94.2%</p>
            <p className="text-white/40 text-xs">Attendance</p>
          </div>
        </motion.div>

        {/* Floating badge right */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.7, repeat: Infinity, ease: 'easeInOut', delay: 1.3 }}
          className="absolute -right-4 sm:-right-14 top-1/3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl px-3 py-2 shadow-xl"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
            <Brain size={11} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">AI Active</p>
            <p className="text-white/40 text-xs">3 insights</p>
          </div>
        </motion.div>

        {/* Pulse ring */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.08, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl border border-blue-500/40 pointer-events-none"
        />
      </motion.div>
    </motion.div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock,        title: 'Real-Time Tracking',    desc: 'Instant attendance updates with automated clock-in and clock-out across all devices.',                   gradient: 'from-blue-500 to-cyan-500' },
  { icon: Brain,        title: 'AI-Powered Insights',   desc: 'Predictive analytics for attrition risk, attendance patterns, and workforce forecasts.',                 gradient: 'from-violet-500 to-purple-500' },
  { icon: CalendarDays, title: 'Leave Management',      desc: 'Streamlined leave requests, automated approvals, and fully customizable policy workflows.',              gradient: 'from-emerald-500 to-teal-500' },
  { icon: BarChart3,    title: 'Advanced Analytics',    desc: 'Rich dashboards and exportable reports on KPIs, trends, and monthly performance metrics.',               gradient: 'from-orange-500 to-amber-500' },
  { icon: Shield,       title: 'Role-Based Access',     desc: 'Separate, secure dashboards for employees, managers, and administrators with granular permissions.',     gradient: 'from-rose-500 to-pink-500' },
  { icon: Bell,         title: 'Smart Notifications',   desc: 'Real-time alerts for leave approvals, attendance anomalies, and policy violations.',                     gradient: 'from-blue-400 to-indigo-500' },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-medium mb-4">
            <Sparkles size={12} /> Everything you need
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built for modern{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">HR teams</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-white/40 text-lg max-w-xl mx-auto">
            Everything you need to manage your workforce intelligently — in one platform.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map(({ icon: Icon, title, desc, gradient }, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-colors overflow-hidden"
            >
              <div className={`inline-flex w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} items-center justify-center mb-4 shadow-lg`}>
                <Icon size={19} className="text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              {/* Bottom accent line */}
              <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: '01', icon: Users,        title: 'Register Your Organization', desc: 'Sign up and configure your company profile, departments, and HR policies in minutes.' },
  { num: '02', icon: UserCheck,    title: 'Add Your Team',              desc: 'Invite employees and managers. Assign roles, departments, and reporting lines.' },
  { num: '03', icon: Clock,        title: 'Track & Manage',             desc: 'Monitor attendance, process leaves, and receive AI-generated workforce insights.' },
  { num: '04', icon: TrendingUp,   title: 'Analyze & Grow',             desc: 'Use rich analytics to reduce attrition, optimize schedules, and boost performance.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400 text-xs font-medium mb-4">
            <Zap size={12} /> Simple onboarding
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Up and running in{' '}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">minutes</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-white/40 text-lg max-w-xl mx-auto">
            No complex setup. WorkNexAI gets your entire team organized fast.
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {/* Connector */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

          {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.13, duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}
              whileHover={{ scale: 1.03, y: -4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/8 flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-blue-400" />
                </div>
                <span className="text-xs font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{num}</span>
              </div>
              <h3 className="text-white font-semibold mb-2 text-sm">{title}</h3>
              <p className="text-white/35 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Sarah Johnson', role: 'HR Director, TechFlow Inc',    avatar: 'SJ', quote: "WorkNexAI transformed how we manage our 500-person team. The AI insights are genuinely useful — not just noise." },
  { name: 'Ahmed Raza',    role: 'Operations Manager, BuildCo',  avatar: 'AR', quote: "Leave approvals used to take days. Now it's automated and instant. Our employees love the transparency." },
  { name: 'Priya Sharma',  role: 'CEO, NovaTech Solutions',      avatar: 'PS', quote: "The attrition risk alerts saved us from losing three key engineers last quarter. The ROI is undeniable." },
];

function Testimonials() {
  return (
    <section className="py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-1.5 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
            <span className="text-white/30 text-sm ml-1">5.0 · 400+ reviews</span>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Loved by{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">HR teams</span>{' '}
            globally
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="grid md:grid-cols-3 gap-4"
        >
          {TESTIMONIALS.map(({ name, role, avatar, quote }, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-colors"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} size={12} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-5">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{avatar}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{name}</p>
                  <p className="text-white/35 text-xs">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-12 sm:p-16 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(168,85,247,0.1) 100%)' }}
        >
          {/* Glows */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-6"
            >
              <Sparkles size={12} className="text-blue-400" /> Start free, no credit card required
            </motion.div>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Ready to transform your <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                HR operations?
              </span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
              Join hundreds of organizations managing their workforce smarter with WorkNexAI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow cursor-pointer"
                >
                  Start Free Trial <ArrowRight size={17} />
                </motion.span>
              </Link>
              <Link href="/login">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-semibold transition-colors cursor-pointer"
                >
                  Sign in <ChevronRight size={17} />
                </motion.span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-white font-bold">WorkNex<span className="text-blue-400">AI</span></span>
            </div>
            <p className="text-white/25 text-sm leading-relaxed">
              AI-powered workforce management for modern organizations.
            </p>
          </div>

          {[
            { heading: 'Product',  links: ['Features', 'Pricing', 'Security', 'Changelog'] },
            { heading: 'Company',  links: ['About', 'Blog', 'Careers', 'Contact'] },
            { heading: 'Legal',    links: ['Privacy', 'Terms', 'Cookie Policy'] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-white text-sm font-semibold mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-white/25 hover:text-white/60 text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-sm">© 2026 WorkNexAI. All rights reserved.</p>
          <p className="text-white/20 text-sm">Built for modern HR teams</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#070d1a', color: '#fff' }}>
      {/* Dot-grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-medium mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              AI-Powered Workforce Intelligence · v2.0
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.07] tracking-tight text-white mb-6"
            >
              HR management,
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-500 bg-clip-text text-transparent">
                reimagined with AI
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-white/45 max-w-2xl mx-auto mb-8 leading-relaxed">
              WorkNexAI brings together attendance tracking, leave management, AI insights,
              and workforce analytics — all in one clean, powerful platform.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link href="/register">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow text-sm cursor-pointer"
                >
                  Start for free <ArrowRight size={15} />
                </motion.span>
              </Link>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-semibold transition-colors text-sm"
              >
                View demo <ChevronRight size={15} />
              </motion.button>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-6 text-white/25 text-xs">
              {['Free 14-day trial', 'No credit card required', 'Cancel anytime'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={12} className="text-blue-400" /> {t}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <HeroMockup />
      </section>

      <FeaturesSection />
      <HowItWorks />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
}
