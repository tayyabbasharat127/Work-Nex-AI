'use client';

import { useEffect } from 'react';
import { attendancePing } from '@/services/attendancePing';
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
      {/* Fixed alert bell — top-right corner, always visible across dashboard */}
      <div className="fixed top-4 right-4 z-50">
        <AlertsNotificationBell />
      </div>
      {/* Floating AI chatbot — visible on every dashboard page */}
      <ChatbotWidget />
    </>
  );
}
