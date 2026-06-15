'use client';

import { useEffect } from 'react';
import { attendancePing } from '@/services/attendancePing';
import MultiAgentChatWidget from '@/components/MultiAgentChatWidget';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    // Start attendance ping service when dashboard loads
    console.log('Dashboard mounted - starting attendance ping');
    attendancePing.start();

    // Cleanup: stop ping service when leaving dashboard
    return () => {
      console.log('Dashboard unmounting - stopping attendance ping');
      attendancePing.stop();
    };
  }, []);

  return (
    <>
      {children}
      <MultiAgentChatWidget />
    </>
  );
}
