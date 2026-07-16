'use client';

export default function FeaturesSection({ features }) {
  return (
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
  );
}
