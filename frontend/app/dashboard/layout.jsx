'use client';

import { useEffect } from 'react';
import { attendancePing } from '@/services/attendancePing';
import MultiAgentChatWidget from '@/components/MultiAgentChatWidget';
import ChatbotWidget from '@/components/ChatbotWidget';
import AlertsNotificationBell from '@/components/AlertsNotificationBell';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    attendancePing.start();
    return () => attendancePing.stop();
  }, []);

  return (
    <>
      {children}
      <MultiAgentChatWidget />
    </>
  );
}
