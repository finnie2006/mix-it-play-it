/**
 * LED Control Service
 * 
 * Manages LED device configuration and communication for visual indicators
 * such as speaker mute status using ESP32-controlled LED strips.
 */

export interface LedDevice {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  enabled: boolean;
  type: 'esp32' | 'http-api'; // Extensible for other device types
  description?: string;
}

export interface LedControlConfig {
  devices: LedDevice[];
  speakerMuteIndicator: {
    enabled: boolean;
    deviceIds: string[]; // Multiple devices can respond to speaker mute
    onColor: { r: number; g: number; b: number };
    offDelay: number; // Delay in ms before turning off (0 = instant)
    animation: 'solid' | 'pulse' | 'blink' | 'chase' | 'rainbow';
  };
}

const DEFAULT_LED_CONFIG: LedControlConfig = {
  devices: [],
  speakerMuteIndicator: {
    enabled: false,
    deviceIds: [],
    onColor: { r: 255, g: 0, b: 0 }, // Red by default
    offDelay: 0,
    animation: 'solid'
  }
};

const LED_CONFIG_KEY = 'xair-led-control-config';

export class LedControlService {
  private static config: LedControlConfig | null = null;
  private static offTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Load LED control configuration from localStorage
   */
  static loadConfig(): LedControlConfig {
    if (this.config) return this.config;

    try {
      const stored = localStorage.getItem(LED_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_LED_CONFIG, ...JSON.parse(stored) };
        return this.config;
      }
    } catch (error) {
      console.error('Failed to load LED config:', error);
    }

    this.config = DEFAULT_LED_CONFIG;
    return this.config;
  }

  /**
   * Save LED control configuration to localStorage
   */
  static saveConfig(config: LedControlConfig): void {
    try {
      localStorage.setItem(LED_CONFIG_KEY, JSON.stringify(config, null, 2));
      this.config = config;
      console.log('💡 LED config saved successfully');
    } catch (error) {
      console.error('Failed to save LED config:', error);
    }
  }

  /**
   * Add a new LED device
   */
  static addDevice(device: Omit<LedDevice, 'id'>): LedDevice {
    const config = this.loadConfig();
    const newDevice: LedDevice = {
      ...device,
      id: `led-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    config.devices.push(newDevice);
    this.saveConfig(config);
    return newDevice;
  }

  /**
   * Remove a LED device
   */
  static removeDevice(id: string): void {
    const config = this.loadConfig();
    config.devices = config.devices.filter(d => d.id !== id);
    // Also remove from speaker mute indicator device list
    config.speakerMuteIndicator.deviceIds = config.speakerMuteIndicator.deviceIds.filter(
      deviceId => deviceId !== id
    );
    this.saveConfig(config);
  }

  /**
   * Update a LED device
   */
  static updateDevice(id: string, updates: Partial<LedDevice>): void {
    const config = this.loadConfig();
    const index = config.devices.findIndex(d => d.id === id);
    if (index !== -1) {
      config.devices[index] = { ...config.devices[index], ...updates };
      this.saveConfig(config);
    }
  }

  /**
   * Update speaker mute indicator configuration
   */
  static updateSpeakerMuteIndicator(
    updates: Partial<LedControlConfig['speakerMuteIndicator']>
  ): void {
    const config = this.loadConfig();
    config.speakerMuteIndicator = { ...config.speakerMuteIndicator, ...updates };
    this.saveConfig(config);
  }

  /**
   * Get all enabled devices
   */
  static getEnabledDevices(): LedDevice[] {
    const config = this.loadConfig();
    return config.devices.filter(d => d.enabled);
  }

  /**
   * Get devices configured for speaker mute indicator
   */
  static getSpeakerMuteDevices(): LedDevice[] {
    const config = this.loadConfig();
    if (!config.speakerMuteIndicator.enabled) return [];

    return config.devices.filter(
      d => d.enabled && config.speakerMuteIndicator.deviceIds.includes(d.id)
    );
  }

  /**
   * Send HTTP command to a LED device
   */
  static async sendCommand(
    device: LedDevice,
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const url = new URL(`http://${device.ipAddress}:${device.port}${endpoint}`);
      
      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        mode: 'no-cors' // Allow cross-origin requests to local devices
      });

      // With no-cors, we can't read the response, but we can check if it succeeded
      if (response.type === 'opaque') {
        // Request was sent successfully (but we can't read response)
        return { success: true };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to send command to ${device.name}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test connection to a LED device
   */
  static async testDevice(device: LedDevice): Promise<boolean> {
    try {
      const url = `http://${device.ipAddress}:${device.port}/status`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Device test successful:', data);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to test device ${device.name}:`, error);
      return false;
    }
  }

  /**
   * Turn on speaker mute indicator LED(s)
   */
  static async turnOnSpeakerMuteIndicator(): Promise<void> {
    const config = this.loadConfig();
    if (!config.speakerMuteIndicator.enabled) return;

    const devices = this.getSpeakerMuteDevices();
    console.log(`🚥 Turning ON speaker mute indicator for ${devices.length} device(s)`);

    // Clear any pending off timers
    devices.forEach(device => {
      const timer = this.offTimers.get(device.id);
      if (timer) {
        clearTimeout(timer);
        this.offTimers.delete(device.id);
      }
    });

    // Send commands to all devices
    const promises = devices.map(async device => {
      const color = config.speakerMuteIndicator.onColor;
      const animation = config.speakerMuteIndicator.animation;

      // Set color
      await this.sendCommand(device, '/color', {
        r: color.r,
        g: color.g,
        b: color.b
      });

      // Set animation mode
      if (animation !== 'solid') {
        await this.sendCommand(device, '/animation', { mode: animation });
      }

      // Turn on
      return this.sendCommand(device, '/on');
    });

    await Promise.all(promises);
  }

  /**
   * Turn off speaker mute indicator LED(s)
   */
  static async turnOffSpeakerMuteIndicator(): Promise<void> {
    const config = this.loadConfig();
    if (!config.speakerMuteIndicator.enabled) return;

    const devices = this.getSpeakerMuteDevices();
    const delay = config.speakerMuteIndicator.offDelay;

    console.log(
      `🚥 Turning OFF speaker mute indicator for ${devices.length} device(s) ` +
      `(delay: ${delay}ms)`
    );

    devices.forEach(device => {
      // Clear any existing timer for this device
      const existingTimer = this.offTimers.get(device.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      if (delay > 0) {
        // Schedule turn-off after delay
        const timer = setTimeout(async () => {
          await this.sendCommand(device, '/off');
          this.offTimers.delete(device.id);
        }, delay);
        this.offTimers.set(device.id, timer);
      } else {
        // Turn off immediately
        this.sendCommand(device, '/off');
      }
    });
  }

  /**
   * Toggle speaker mute indicator for testing
   */
  static async toggleSpeakerMuteIndicator(): Promise<void> {
    const devices = this.getSpeakerMuteDevices();
    const promises = devices.map(device => this.sendCommand(device, '/toggle'));
    await Promise.all(promises);
  }

  /**
   * Get device status
   */
  static async getDeviceStatus(device: LedDevice): Promise<any> {
    try {
      const url = `http://${device.ipAddress}:${device.port}/status`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error(`Failed to get status for ${device.name}:`, error);
      return null;
    }
  }
}

export default LedControlService;
