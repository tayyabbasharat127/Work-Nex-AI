'use client';

import Link from 'next/link';
import { ChevronRight, TrendingUp, Check } from 'lucide-react';

export default function HeroSection({ setDemoModalOpen }) {
  return (
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
  );
}
