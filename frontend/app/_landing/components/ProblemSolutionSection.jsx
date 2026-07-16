'use client';

import {
  Frown, FileSpreadsheet, AlertCircle, Clock, Lightbulb,
  Building2, Users, Brain, Cpu, Layers, LineChart, Database,
} from 'lucide-react';

const PROBLEM_SOLUTION_CARDS = [
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
];

const HOW_IT_WORKS_STEPS = [
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
];

const AI_UNDER_HOOD = [
  { label: 'Performance model', value: '9 input factors', icon: Layers },
  { label: 'Attrition model', value: '13 risk signals', icon: AlertCircle },
  { label: 'Leave forecast', value: '30-day window', icon: LineChart },
  { label: 'ETL pipeline', value: 'Nightly auto-run', icon: Database },
];

export default function ProblemSolutionSection() {
  return (
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
          {PROBLEM_SOLUTION_CARDS.map(({ problem, solution, icon: Icon, painLabel }) => (
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

          {HOW_IT_WORKS_STEPS.map(({ step, icon: Icon, title, desc }) => (
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
            {AI_UNDER_HOOD.map(({ label, value, icon: Icon }) => (
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
  );
}
