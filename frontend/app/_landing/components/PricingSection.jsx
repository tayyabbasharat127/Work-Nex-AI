'use client';

import { Check } from 'lucide-react';

export default function PricingSection({ pricingPlans, nav }) {
  return (
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
  );
}
