'use client';

export default function LeaveStatsCards({ stats, loading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className={`bg-card border ${s.border} rounded-2xl p-5 hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <span className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}
