'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, Menu, X, Clock, BarChart3, Users, Shield, Bell, Zap } from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    { title: 'Real-Time Tracking', description: 'Monitor employee attendance with instant updates and automated clock-in/out systems.', icon: Clock },
    { title: 'Leave Management', description: 'Streamline leave requests, approvals, and management with customizable policies.', icon: Users },
    { title: 'Advanced Analytics', description: 'Comprehensive reports and insights on attendance patterns and employee performance.', icon: BarChart3 },
    { title: 'Role-Based Access', description: 'Separate dashboards for employees, managers, and administrators.', icon: Shield },
    { title: 'Smart Notifications', description: 'Real-time alerts and reminders for leaves, approvals, and attendance anomalies.', icon: Bell },
    { title: 'Easy Integration', description: 'Seamlessly integrate with your existing HR systems and workflows.', icon: Zap }
  ];

  const pricingPlans = [
    { name: 'Basic', price: '$29', period: '/month', description: 'Perfect for small teams', features: ['Up to 50 employees', 'Basic attendance tracking', 'Leave management', 'Email support', 'Basic reports'], highlighted: false },
    { name: 'Pro', price: '$79', period: '/month', description: 'For growing organizations', features: ['Up to 500 employees', 'Advanced attendance tracking', 'Leave workflows', 'Priority support', 'Advanced analytics', 'API access', 'Custom branding'], highlighted: true },
    { name: 'Enterprise', price: 'Custom', period: 'pricing', description: 'For large enterprises', features: ['Unlimited employees', 'Full suite access', '24/7 dedicated support', 'Custom analytics', 'White-label solution', 'Advanced integrations'], highlighted: false }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-xl border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">WorkNexAI</span>
            </div>

            <div className="hidden md:flex gap-8">
              <Link href="#features" className="hover:text-primary transition font-medium">Features</Link>
              <Link href="#pricing" className="hover:text-primary transition font-medium">Pricing</Link>
              <Link href="#" className="hover:text-primary transition font-medium">About</Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-muted rounded-lg transition">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden md:flex gap-3">
              <Link href="/login" className="px-5 py-2.5 rounded-xl border border-border hover:border-primary hover:text-primary transition font-medium">Login</Link>
              <Link href="/register" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition font-medium shadow-lg shadow-primary/25">Sign Up</Link>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3 border-t border-border mt-4 pt-4">
              <Link href="#features" className="block py-2 hover:text-primary transition">Features</Link>
              <Link href="#pricing" className="block py-2 hover:text-primary transition">Pricing</Link>
              <Link href="#" className="block py-2 hover:text-primary transition">About</Link>
              <div className="flex gap-3 pt-4">
                <Link href="/login" className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:border-primary text-center transition">Login</Link>
                <Link href="/register" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-center transition">Sign Up</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Now with AI-Powered Insights
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-accent bg-clip-text text-transparent">Smart Workforce</span>
            <br />
            <span className="text-foreground">Intelligence Platform</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Professional attendance management and leave tracking system designed for modern organizations. Streamline HR operations and boost productivity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/register" className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2 shadow-xl shadow-primary/25">
              Get Started Free <ChevronRight size={20} />
            </Link>
            <button className="px-8 py-4 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold">
              Watch Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-8 text-muted-foreground">
            <div className="flex items-center gap-2"><Check className="text-primary" size={20} /> Free 14-day trial</div>
            <div className="flex items-center gap-2"><Check className="text-primary" size={20} /> No credit card required</div>
            <div className="flex items-center gap-2"><Check className="text-primary" size={20} /> Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to manage attendance and leave effectively</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg">Choose the plan that fits your organization</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`rounded-2xl border transition-all duration-300 ${plan.highlighted ? 'border-primary bg-gradient-to-b from-primary/5 to-transparent ring-2 ring-primary scale-[1.02]' : 'border-border bg-card hover:border-primary/50'} p-8`}>
                {plan.highlighted && (
                  <div className="inline-block mb-4 px-3 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>

                <button className={`w-full py-3.5 rounded-xl font-semibold transition mb-8 ${plan.highlighted ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25' : 'border border-border hover:border-primary hover:text-primary'}`}>
                  Get Started
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your HR Operations?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join hundreds of organizations managing attendance and leave more efficiently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2 shadow-xl shadow-primary/25">
              Start Free Trial <ChevronRight size={20} />
            </Link>
            <button className="px-8 py-4 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold bg-card">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">A</span>
                </div>
                <span className="font-bold text-lg">AttendEase</span>
              </div>
              <p className="text-sm text-muted-foreground">AI-powered workforce management and attendance tracking for modern organizations.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Features</a></li>
                <li><a href="#" className="hover:text-primary transition">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">About</a></li>
                <li><a href="#" className="hover:text-primary transition">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 WorkNexAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
