import { attendanceAPI } from '@/lib/api';

class AttendancePingService {
  constructor() {
    this.intervalId = null;
    this.pingInterval = 5 * 60000; // 5 minutes
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Attendance ping already running');
      return;
    }
    
    console.log('Starting attendance ping service...');
    this.isRunning = true;
    
    // Ping immediately on start
    this.ping();
    
    // Then ping every minute
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.pingInterval);
  }

  async ping() {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    try {
      const result = await attendanceAPI.ping();
      console.log('Attendance ping:', result);
      
      if (result.action === 'auto_checked_in') {
        console.log('✅ Auto checked-in successfully!', result);
        // You could show a toast notification here
      }
    } catch {
      // Silently fail - don't spam console with errors
      // The ping will retry in 1 minute
    }
  }

  stop() {
    if (!this.isRunning) {
      return;
    }
    
    console.log('Stopping attendance ping service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }

  isActive() {
    return this.isRunning;
  }
}

// Export singleton instance
export const attendancePing = new AttendancePingService();
