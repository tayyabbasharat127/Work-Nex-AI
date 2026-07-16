'use client';

import Link from 'next/link';
import { Twitter, Linkedin, Github, Building2 } from 'lucide-react';

export default function LandingFooter({ nav }) {
  return (
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
  );
}
