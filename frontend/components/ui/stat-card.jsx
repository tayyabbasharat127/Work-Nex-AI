import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TREND_TONE = {
  positive: 'text-success bg-success/10',
  negative: 'text-destructive bg-destructive/10',
  neutral: 'text-muted-foreground bg-muted',
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export function StatCard({ label, value, icon: Icon, iconClassName, trend, description, loading, className }) {
  if (loading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="mt-4 h-7 w-16" />
        <Skeleton className="mt-2 h-4 w-24" />
      </Card>
    );
  }

  const TrendIcon = trend ? TREND_ICON[trend.direction] || Minus : null;

  return (
    <Card className={cn('group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md', className)}>
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconClassName || 'bg-primary/10 text-primary')}>
            <Icon size={20} />
          </div>
        )}
        {trend && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', TREND_TONE[trend.tone || 'neutral'])}>
            <TrendIcon size={12} />
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>}
    </Card>
  );
}
