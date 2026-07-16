'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { attendancePing } from '@/services/attendancePing';
import MultiAgentChatWidget from '@/components/MultiAgentChatWidget';
import NotificationBell from '@/components/NotificationBell';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';
import RoleGate from '@/components/RoleGate';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const role = pathname.startsWith('/dashboard/admin')
    ? 'admin'
    : pathname.startsWith('/dashboard/manager')
      ? 'manager'
      : 'employee';
  const allowedRoles = role === 'admin'
    ? ['ADMIN', 'SUPER_ADMIN']
    : role === 'manager'
      ? ['MANAGER']
      : ['EMPLOYEE'];

  useEffect(() => {
    attendancePing.start();
    return () => attendancePing.stop();
  }, []);

  return (
    <RoleGate allow={allowedRoles}>
      <>
        {children}
      <div className="fixed right-6 top-4 z-[70] flex items-center gap-2">
        <ThemeSwitcher compact />
        <div className="rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur-md">
          <NotificationBell role={role} />
        </div>
      </div>
      <MultiAgentChatWidget />
      </>
    </RoleGate>
  );
}
