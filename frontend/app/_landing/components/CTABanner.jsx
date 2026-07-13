'use client';

import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';

export default function CTABanner({ nav }) {
  return (
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
  );
}
