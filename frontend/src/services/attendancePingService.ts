import { pingApi } from '@/src/api/api';

/**
 * Attendance Ping Service
 * Automatically pings the server every 60 seconds to:
 * 1. Auto check-in if not already checked in
 * 2. Update last ping time (for auto-checkout detection)
 * 3. Maintain connection status
 */
class AttendancePingService {
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private isRunning: boolean = false;
  private deviceId: string = '';
  private wifiMacAddress: string | null = null;

  /**
   * Start the ping service
   */
  start() {
    if (this.isRunning) {
      console.log('📡 Ping service already running');
      return;
    }

    console.log('📡 Starting attendance ping service...');
    this.isRunning = true;

    // Get or generate device ID
    this.deviceId = this.getDeviceId();

    // Try to get WiFi MAC address (if available)
    this.getWifiMacAddress();

    // Send initial ping immediately
    this.sendPing();

    // Then ping every 60 seconds
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 60000); // 60 seconds

    console.log('✅ Ping service started');
  }

  /**
   * Stop the ping service
   */
  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Ping service stopped');
  }

  /**
   * Send ping to server
   */
  private async sendPing() {
    try {
      console.log('📡 Sending ping...', new Date().toLocaleTimeString());

      const response = await pingApi({
        deviceId: this.deviceId,
        wifiMacAddress: this.wifiMacAddress
      });

      this.lastPingTime = Date.now();
      console.log('✅ Ping successful:', response.data?.message);

    } catch (error: any) {
      console.error('❌ Ping failed:', error.response?.data?.message || error.message);
      
      // If not on office network, that's expected - don't log as error
      if (error.response?.status === 403) {
        console.log('ℹ️ Not on office network - ping skipped');
      }
    }
  }

  /**
   * Get or generate device ID
   */
  private getDeviceId(): string {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = this.generateDeviceId();
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    // Use crypto.randomUUID if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: generate random ID
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Try to get WiFi MAC address (browser limitations apply)
   * Note: Most browsers don't expose MAC address for privacy reasons
   * This is a placeholder for future implementation or native app
   */
  private async getWifiMacAddress() {
    try {
      // Check if stored in localStorage (could be set by admin/setup)
      const storedMac = localStorage.getItem('wifi_mac_address');
      if (storedMac) {
        this.wifiMacAddress = storedMac;
        console.log('📶 Using stored WiFi MAC:', storedMac);
        return;
      }

      // In a real implementation, this would:
      // 1. Use native app APIs to get actual MAC address
      // 2. Or use a browser extension
      // 3. Or have admin manually configure it
      
      // For now, we'll rely on IP validation only
      console.log('ℹ️ WiFi MAC address not available (browser limitation)');
      
    } catch (error) {
      console.error('Error getting WiFi MAC:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastPingTime: this.lastPingTime,
      deviceId: this.deviceId,
      wifiMacAddress: this.wifiMacAddress,
      timeSinceLastPing: this.lastPingTime ? Date.now() - this.lastPingTime : null
    };
  }

  /**
   * Manually set WiFi MAC address (for admin configuration)
   */
  setWifiMacAddress(macAddress: string) {
    this.wifiMacAddress = macAddress;
    localStorage.setItem('wifi_mac_address', macAddress);
    console.log('📶 WiFi MAC address set:', macAddress);
  }
}

// Export singleton instance
export const attendancePingService = new AttendancePingService();

// Export class for testing
export default AttendancePingService;
