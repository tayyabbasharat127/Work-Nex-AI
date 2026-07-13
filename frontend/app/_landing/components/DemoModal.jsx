'use client';

import Link from 'next/link';
import { X, Check } from 'lucide-react';

const DEMO_ROLES = [
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
];

const HOW_TO_START_STEPS = [
  'Click "Go to Login" below',
  'Enter the demo email & password shown on the login page',
  'Explore the dashboard — all data is pre-seeded and safe to test',
];

export default function DemoModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">Explore the Live Demo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">WorkNex AI has 3 types of users — pick the one that matches your role</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition ml-4 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">

          {/* Role cards */}
          {DEMO_ROLES.map(({ emoji, title, subtitle, techRole, tagColor, borderColor, bgColor, bullets }) => (
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
              {HOW_TO_START_STEPS.map((step, i) => (
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
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition text-sm text-center"
          >
            Go to Login
          </Link>
          <Link
            href="/register"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold text-sm text-center"
          >
            Create Your Account
          </Link>
        </div>
      </div>
    </div>
  );
}
