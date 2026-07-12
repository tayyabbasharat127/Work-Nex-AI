'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { attendancePing } from '@/services/attendancePing';
import MultiAgentChatWidget from '@/components/MultiAgentChatWidget';
import NotificationBell from '@/components/NotificationBell';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const role = pathname.startsWith('/dashboard/admin')
    ? 'admin'
    : pathname.startsWith('/dashboard/manager')
      ? 'manager'
      : 'employee';

  useEffect(() => {
    attendancePing.start();
    return () => attendancePing.stop();
  }, []);

  return (
    <>
      {children}
      <div className="fixed right-5 top-4 z-[70] rounded-xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md">
        <NotificationBell role={role} />
      </div>
      <MultiAgentChatWidget />
    </>
  );
}
