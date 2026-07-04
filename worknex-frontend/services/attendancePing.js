import { attendanceAPI } from '@/lib/api';

class AttendancePingService {
  constructor() {
    this.intervalId = null;
    this.pingInterval = 60000; // 1 minute
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
    try {
      const result = await attendanceAPI.ping();
      if (result.action === 'auto_checked_in') {
        console.log('✅ Auto checked-in');
      }
    } catch (error) {
      // Suppress known business-logic rejections — these are expected and not bugs.
      // Examples: on leave today, already checked in, outside working hours.
      const known = [
        'approved leave',
        'already checked',
        'outside working',
        'not a working day',
      ];
      const msg = (error?.message || '').toLowerCase();
      if (!known.some((phrase) => msg.includes(phrase))) {
        console.warn('[AttendancePing]', error?.message || error);
      }
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
