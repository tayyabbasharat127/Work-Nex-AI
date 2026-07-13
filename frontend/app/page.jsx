'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Check, Menu, X, Clock, BarChart3, Users, Shield, Bell,
  Zap, Brain, TrendingUp, LineChart, Bot, Mail, Github, Linkedin,
  Twitter, ArrowRight, Building2, UserCheck, AlertCircle,
  FileSpreadsheet, Frown, Lightbulb, Layers, Database, Cpu,
} from 'lucide-react';

const scrollTo = (id, closeMobileMenu) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', window.location.pathname);
  if (closeMobileMenu) closeMobileMenu(false);
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', org: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  const nav = (id) => scrollTo(id, setMobileMenuOpen);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const features = [
    {
      title: 'AI Performance Prediction',
      description: 'Predict employee performance scores using attendance, leave patterns, and work history with ML models.',
      icon: Brain,
    },
    {
      title: 'Attrition Risk Analysis',
      description: 'Identify flight-risk employees early using 13-factor attrition scoring with high/medium/low risk levels.',
      icon: AlertCircle,
    },
    {
      title: 'Leave Forecasting',
      description: '30-day AI-powered leave demand forecasting using gradient boosting with seasonal and day-of-week patterns.',
      icon: LineChart,
    },
    {
      title: 'Real-Time Attendance',
      description: 'Live clock-in/out tracking with TMS webhook sync, biometric integration, and daily status monitoring.',
      icon: Clock,
    },
    {
      title: 'Smart Leave Management',
      description: 'Policy-driven leave workflows with automated approval, balance tracking, and document verification.',
      icon: UserCheck,
    },
    {
      title: 'Multi-Agent AI Assistant',
      description: 'LangChain-powered multi-agent system with persistent memory for HR analytics, reports, and Q&A.',
      icon: Bot,
    },
    {
      title: 'Advanced Analytics',
      description: 'Department-wise attendance heatmaps, workforce headcount, turnover rates, and audit trails.',
      icon: BarChart3,
    },
    {
      title: 'Role-Based Dashboards',
      description: 'Tailored views for Admins, Managers, and Employees with granular permission controls.',
      icon: Shield,
    },
    {
      title: 'Smart Notifications',
      description: 'Real-time in-app alerts and SMTP email notifications for leaves, approvals, and anomalies.',
      icon: Bell,
    },
  ];

  const pricingPlans = [
    {
      name: 'Basic',
      price: '$19',
      period: '/month',
      description: 'Perfect for small teams getting started',
      badge: null,
      features: [
        'Up to 25 employees',
        'Attendance tracking & TMS sync',
        'Leave requests & balance management',
        'Email & in-app notifications',
        'Admin + Employee dashboards',
        'Basic analytics & reports',
        'SMTP email integration',
        'Email support',
      ],
      highlighted: false,
      cta: 'Get Started',
      href: '/register?plan=basic',
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For growing teams that need AI insights',
      badge: 'Most Popular',
      features: [
        'Up to 200 employees',
        'Everything in Basic',
        'AI performance prediction',
        'Attrition risk analysis',
        '30-day leave forecasting',
        'Multi-agent AI assistant',
        'Manager dashboards',
        'ETL pipeline & Power BI',
        'API access',
        'Priority support',
      ],
      highlighted: true,
      cta: 'Start Free Trial',
      href: '/register?plan=pro',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'For large organizations with custom needs',
      badge: null,
      features: [
        'Unlimited employees',
        'Everything in Pro',
        'White-label branding',
        'On-premise deployment',
        'Custom AI model tuning',
        'Advanced audit & compliance',
        'Custom integrations & API',
        'Dedicated account manager',
        '24/7 SLA support',
      ],
      highlighted: false,
      cta: 'Contact Sales',
      href: null,
      scrollTo: 'contact',
    },
  ];

  const stats = [
    { value: '50+', label: 'Organizations' },
    { value: '10k+', label: 'Employees Managed' },
    { value: '99.9%', label: 'Uptime' },
    { value: '3x', label: 'Faster HR Ops' },
  ];


  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSent(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-xl border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
                <span className="text-primary-foreground font-bold text-base">W</span>
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">WorkNex AI</span>
            </div>

            <div className="hidden md:flex gap-6 lg:gap-8">
              <button onClick={() => nav('features')} className="hover:text-primary transition font-medium text-sm lg:text-base">Features</button>
              <button onClick={() => nav('pricing')} className="hover:text-primary transition font-medium text-sm lg:text-base">Pricing</button>
              <button onClick={() => nav('testimonials')} className="hover:text-primary transition font-medium text-sm lg:text-base">Reviews</button>
              <button onClick={() => nav('contact')} className="hover:text-primary transition font-medium text-sm lg:text-base">Contact</button>
            </div>

            <div className="hidden md:flex gap-3">
              <Link href="/login" className="px-4 py-2 rounded-xl border border-border hover:border-primary hover:text-primary transition font-medium text-sm">
                Login
              </Link>
              <Link href="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition font-medium text-sm shadow-lg shadow-primary/25">
                Sign Up Free
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1 border-t border-border mt-2 pt-4">
              <button onClick={() => nav('features')} className="w-full text-left py-2.5 px-2 hover:text-primary hover:bg-muted/50 rounded-lg transition">Features</button>
              <button onClick={() => nav('pricing')} className="w-full text-left py-2.5 px-2 hover:text-primary hover:bg-muted/50 rounded-lg transition">Pricing</button>
              <button onClick={() => nav('testimonials')} className="w-full text-left py-2.5 px-2 hover:text-primary hover:bg-muted/50 rounded-lg transition">Reviews</button>
              <button onClick={() => nav('contact')} className="w-full text-left py-2.5 px-2 hover:text-primary hover:bg-muted/50 rounded-lg transition">Contact</button>
              <div className="flex gap-3 pt-3">
                <Link href="/login" className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:border-primary text-center transition text-sm font-medium">Login</Link>
                <Link href="/register" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-center transition text-sm font-medium">Sign Up Free</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative overflow-hidden">
        <div className="absolute top-16 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-6 sm:space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            AI-Powered HR Intelligence — Now Live
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-accent bg-clip-text text-transparent block">Smart Workforce</span>
            <span className="text-foreground block">Intelligence Platform</span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
            AI-powered attendance tracking, leave management, performance prediction, and attrition analysis — built for modern HR teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2 shadow-xl shadow-primary/25 text-sm sm:text-base"
            >
              Get Started Free <ChevronRight size={18} />
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <TrendingUp size={18} />
              Try Live Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 pt-4 text-muted-foreground text-xs sm:text-sm">
            <div className="flex items-center gap-2"><Check className="text-primary flex-shrink-0" size={16} /> 14-day free trial</div>
            <div className="flex items-center gap-2"><Check className="text-primary flex-shrink-0" size={16} /> No credit card required</div>
            <div className="flex items-center gap-2"><Check className="text-primary flex-shrink-0" size={16} /> Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-border bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything Your HR Team Needs</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">From attendance tracking to AI-powered predictions — all in one platform</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group p-5 sm:p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Pick the plan that fits your team. Upgrade or cancel anytime.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-primary bg-gradient-to-b from-primary/8 to-transparent ring-2 ring-primary/60 shadow-2xl shadow-primary/15'
                    : 'border-border bg-card hover:border-primary/40'
                } p-6 sm:p-8 flex flex-col`}
              >
                {plan.badge && (
                  <div className="inline-block mb-4 px-3 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full text-xs font-semibold self-start">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-xl sm:text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-5">{plan.description}</p>
                <div className="mb-6 flex items-end gap-1">
                  <span className="text-4xl sm:text-5xl font-bold leading-none">{plan.price}</span>
                  <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                </div>

                {plan.scrollTo ? (
                  <button
                    onClick={() => nav(plan.scrollTo)}
                    className={`w-full py-3 rounded-xl font-semibold transition mb-7 text-sm text-center block ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25'
                        : 'border border-border hover:border-primary hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <a
                    href={plan.href}
                    className={`w-full py-3 rounded-xl font-semibold transition mb-7 text-sm text-center block ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25'
                        : 'border border-border hover:border-primary hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {plan.cta}
                  </a>
                )}

                <div className="space-y-2.5 flex-1">
                  {plan.features.map((feature, fi) => (
                    <div key={fi} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include a 14-day free trial. No credit card required.{' '}
            <button onClick={() => nav('contact')} className="text-primary hover:underline">Questions? Talk to us.</button>
          </p>
        </div>
      </section>

      {/* ── Problem → Solution ── */}
      <section id="testimonials" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive mb-4">
              <Frown size={13} />
              The old way is broken
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">HR Shouldn&rsquo;t Feel Like This</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Most HR teams are still stuck with spreadsheets, guesswork, and reactive decisions. WorkNex AI fixes that.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6 mb-16">
            {[
              {
                problem: 'Attendance tracked in Excel files shared over WhatsApp',
                solution: 'Real-time clock-in/out with automatic absent marking and TMS sync',
                icon: FileSpreadsheet,
                painLabel: 'Spreadsheet chaos',
              },
              {
                problem: 'No idea who\'s about to resign until they hand in their notice',
                solution: 'Attrition Risk Engine scores every employee on 13 factors — weeks before it happens',
                icon: AlertCircle,
                painLabel: 'Surprise resignations',
              },
              {
                problem: 'Leave calendar managed manually — overlaps discovered at the last minute',
                solution: '30-day AI leave forecast shows demand spikes so you roster in advance',
                icon: Clock,
                painLabel: 'Leave planning chaos',
              },
            ].map(({ problem, solution, icon: Icon, painLabel }) => (
              <div key={painLabel} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Pain */}
                <div className="p-5 border-b border-border bg-destructive/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-destructive" />
                    </div>
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">{painLabel}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{problem}&rdquo;</p>
                </div>
                {/* Fix */}
                <div className="p-5 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={15} className="text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">WorkNex fixes it</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{solution}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── How It Works ── */}
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Up and Running in Minutes</h2>
            <p className="text-muted-foreground text-sm sm:text-base">No implementation consultant needed. No 6-month onboarding.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* connector line on desktop */}
            <div className="hidden sm:block absolute top-10 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-primary/40 to-accent/40 z-0" />

            {[
              {
                step: '01',
                icon: Building2,
                title: 'Register your organization',
                desc: 'Sign up, enter your company name and industry. WorkNex creates your workspace instantly — default department and admin account ready in seconds.',
              },
              {
                step: '02',
                icon: Users,
                title: 'Add your team',
                desc: 'Invite employees, assign managers, and set leave policies. The AI runs its first ETL pass automatically to establish a performance baseline.',
              },
              {
                step: '03',
                icon: Brain,
                title: 'AI starts working',
                desc: 'Attrition scores, leave forecasts, and performance predictions start generating from the first data point. No manual configuration.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative z-10 text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex flex-col items-center justify-center mb-5 shadow-lg shadow-primary/5">
                  <Icon size={26} className="text-primary mb-1" />
                  <span className="text-[10px] font-bold text-primary/70 tracking-widest">{step}</span>
                </div>
                <h3 className="font-bold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>

          {/* AI under the hood strip */}
          <div className="mt-14 rounded-2xl border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-6">
            <div className="flex items-center gap-2 mb-5 justify-center">
              <Cpu size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">What&rsquo;s running under the hood</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Performance model', value: '9 input factors', icon: Layers },
                { label: 'Attrition model', value: '13 risk signals', icon: AlertCircle },
                { label: 'Leave forecast', value: '30-day window', icon: LineChart },
                { label: 'ETL pipeline', value: 'Nightly auto-run', icon: Database },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center text-center p-3 rounded-xl bg-card border border-border">
                  <Icon size={18} className="text-primary mb-2" />
                  <div className="text-base sm:text-lg font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6">Ready to Transform Your HR Operations?</h2>
          <p className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join organizations already using AI to reduce attrition, forecast leave demand, and eliminate attendance guesswork.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2 shadow-xl shadow-primary/25 text-sm sm:text-base"
            >
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => nav('contact')}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold bg-card text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <Mail size={18} />
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground text-sm sm:text-lg">Have questions about Enterprise pricing or custom integrations? We&rsquo;d love to hear from you.</p>
          </div>

          {contactSent ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Message Sent!</h3>
              <p className="text-muted-foreground text-sm">We&rsquo;ll get back to you within 24 hours.</p>
              <button onClick={() => { setContactSent(false); setContactForm({ name: '', email: '', org: '', message: '' }); }} className="text-primary text-sm hover:underline">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your Name</label>
                  <input
                    required
                    value={contactForm.name}
                    onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm"
                    placeholder="Ali Hassan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Work Email</label>
                  <input
                    required
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm"
                    placeholder="ali@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Organization</label>
                <input
                  value={contactForm.org}
                  onChange={e => setContactForm(p => ({ ...p, org: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message</label>
                <textarea
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition text-sm resize-none"
                  placeholder="Tell us about your team size and what you're looking for..."
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition text-sm shadow-lg shadow-primary/20"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-sm">W</span>
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">WorkNex AI</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-5">
                AI-powered workforce intelligence — attendance, leave, performance prediction, and attrition analysis for modern HR teams.
              </p>
              <div className="flex gap-3">
                <span aria-label="Twitter/X" className="w-9 h-9 rounded-lg border border-border text-muted-foreground/40 flex items-center justify-center cursor-not-allowed" title="Coming soon">
                  <Twitter size={15} />
                </span>
                <span aria-label="LinkedIn" className="w-9 h-9 rounded-lg border border-border text-muted-foreground/40 flex items-center justify-center cursor-not-allowed" title="Coming soon">
                  <Linkedin size={15} />
                </span>
                <span aria-label="GitHub" className="w-9 h-9 rounded-lg border border-border text-muted-foreground/40 flex items-center justify-center cursor-not-allowed" title="Coming soon">
                  <Github size={15} />
                </span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><button onClick={() => nav('features')} className="hover:text-primary transition">Features</button></li>
                <li><button onClick={() => nav('pricing')} className="hover:text-primary transition">Pricing</button></li>
                <li><Link href="/login" className="hover:text-primary transition">Dashboard Login</Link></li>
                <li><Link href="/register" className="hover:text-primary transition">Sign Up Free</Link></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><button onClick={() => nav('features')} className="hover:text-primary transition">Attendance Tracking</button></li>
                <li><button onClick={() => nav('features')} className="hover:text-primary transition">Leave Management</button></li>
                <li><button onClick={() => nav('features')} className="hover:text-primary transition">AI Analytics</button></li>
                <li><button onClick={() => nav('features')} className="hover:text-primary transition">Attrition Risk</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><span className="text-muted-foreground/50 cursor-default text-sm">About Us</span></li>
                <li><button onClick={() => nav('contact')} className="hover:text-primary transition">Contact</button></li>
                <li><span className="text-muted-foreground/50 cursor-default text-sm">Privacy Policy</span></li>
                <li><span className="text-muted-foreground/50 cursor-default text-sm">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} WorkNex AI. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-primary" />
              <span>Built for modern HR teams</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Demo Modal ── */}
      {demoModalOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setDemoModalOpen(false)}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">Explore the Live Demo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">WorkNex AI has 3 types of users — pick the one that matches your role</p>
              </div>
              <button onClick={() => setDemoModalOpen(false)} className="p-1.5 hover:bg-muted rounded-lg transition ml-4 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 overflow-y-auto flex-1">

              {/* Role cards */}
              {[
                {
                  emoji: '🏢',
                  title: 'HR Administrator',
                  subtitle: 'Company owner, HR head, or IT admin',
                  techRole: 'Admin',
                  tagColor: 'bg-primary/10 text-primary border-primary/20',
                  borderColor: 'border-primary/30 hover:border-primary/60',
                  bgColor: 'bg-primary/5',
                  bullets: [
                    'Manage all employees, departments & roles',
                    'View AI predictions: performance, attrition risk',
                    'Run ETL pipeline & leave forecasting',
                    'Access full analytics, audit logs & reports',
                    'Approve/reject leaves for entire company',
                  ],
                },
                {
                  emoji: '👔',
                  title: 'Department Manager',
                  subtitle: 'Team lead who oversees a specific group',
                  techRole: 'Manager',
                  tagColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                  borderColor: 'border-yellow-500/20 hover:border-yellow-500/40',
                  bgColor: 'bg-yellow-500/5',
                  bullets: [
                    'See attendance of your own team only',
                    'Approve or reject leave requests from your team',
                    'View performance scores for your team members',
                    'Cannot see other departments\' data',
                  ],
                },
                {
                  emoji: '👤',
                  title: 'Regular Employee',
                  subtitle: 'A staff member using the self-service portal',
                  techRole: 'Employee',
                  tagColor: 'bg-green-500/10 text-green-400 border-green-500/20',
                  borderColor: 'border-green-500/20 hover:border-green-500/40',
                  bgColor: 'bg-green-500/5',
                  bullets: [
                    'Clock in/out and track own attendance',
                    'Apply for leaves and check remaining balance',
                    'View personal performance history',
                    'See AI-powered leave forecast for planning',
                  ],
                },
              ].map(({ emoji, title, subtitle, techRole, tagColor, borderColor, bgColor, bullets }) => (
                <div key={techRole} className={`rounded-xl border ${borderColor} ${bgColor} p-4 transition`}>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{emoji}</span>
                      <div>
                        <div className="font-semibold text-sm leading-tight">{title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${tagColor}`}>
                      {techRole}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check size={11} className="text-primary flex-shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* How to start */}
              <div className="bg-muted/40 border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-foreground mb-2">How to try the demo:</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-none">
                  {[
                    'Click "Go to Login" below',
                    'Enter the demo email & password shown on the login page',
                    'Explore the dashboard — all data is pre-seeded and safe to test',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex gap-3 flex-shrink-0">
              <Link
                href="/login"
                onClick={() => setDemoModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition text-sm text-center"
              >
                Go to Login
              </Link>
              <Link
                href="/register"
                onClick={() => setDemoModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold text-sm text-center"
              >
                Create Your Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
