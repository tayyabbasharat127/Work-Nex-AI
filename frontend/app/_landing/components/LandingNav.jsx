'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';

export default function LandingNav({ mobileMenuOpen, setMobileMenuOpen, nav }) {
  return (
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

          <div className="hidden md:flex items-center gap-3">
            <ThemeSwitcher compact />
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
            <div className="pt-3">
              <ThemeSwitcher />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
