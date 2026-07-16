'use client';

import NotificationBell from '@/components/NotificationBell';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';

export default function UtilityBar({ role }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border bg-card/70 px-4 backdrop-blur-xl md:px-6">
      <ThemeSwitcher compact />
      <div className="rounded-xl border border-border bg-card/95 shadow-sm">
        <NotificationBell role={role} />
      </div>
    </div>
  );
}
