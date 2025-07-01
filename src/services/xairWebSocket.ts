import { IntegratedOSCBridge } from './integratedBridge';

export interface XAirMessage {
  type: 'osc' | 'status' | 'subscribe' | 'mixer_status';
  address?: string;
  args?: any[];
  connected?: boolean;
  mixerIP?: string;
  mixerPort?: number;
  timestamp?: number;
  message?: string;
}

export interface FaderData {
  channel: number;
  value: number;
  timestamp: number;
}

export interface OSCBridgeConfig {
  bridgeHost: string;
  bridgePort: number;
  mixerIP: string;
  mixerPort: number;
}

export class XAirWebSocket {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private subscribers: Set<(data: FaderData) => void> = new Set();
  private statusSubscribers: Set<(connected: boolean) => void> = new Set();
  private mixerStatusSubscribers: Set<(validated: boolean, message: string) => void> = new Set();
  private maxChannels: number;
  private integratedBridge: IntegratedOSCBridge | null = null;
  private isConnectedState = false;
  private bridgeConfig: { host: string; port: number } = { host: 'localhost', port: 8080 };

  constructor(
    private ip: string, 
    private port: number = 10024, 
    private model: 'X-Air 16' | 'X-Air 18' = 'X-Air 18'
  ) {
    this.maxChannels = model === 'X-Air 16' ? 12 : 16;
    console.log(`🎛️ Initializing ${model} mixer connection to ${ip}:${port}`);
  }

  setBridgeConfig(config: OSCBridgeConfig) {
    this.bridgeConfig = { host: config.bridgeHost, port: config.bridgePort };
    
    // If we have an active bridge and the mixer IP changed, update it
    if (this.integratedBridge && this.ip !== config.mixerIP) {
      console.log(`🔄 Mixer IP changed from ${this.ip} to ${config.mixerIP}`);
      this.ip = config.mixerIP;
      this.port = config.mixerPort;
      this.integratedBridge.updateMixerIP(this.ip);
    }
    
    console.log(`🌉 OSC Bridge configured: ${config.bridgeHost}:${config.bridgePort} -> ${config.mixerIP}:${config.mixerPort}`);
  }

  connect(): Promise<boolean> {
    if (this.isConnecting || this.isConnectedState) {
      return Promise.resolve(this.isConnectedState);
    }

    this.isConnecting = true;
    
    return new Promise(async (resolve) => {
      try {
        console.log('🔧 Starting OSC bridge connection...');
        this.integratedBridge = new IntegratedOSCBridge(
          this.ip, 
          this.port, 
          this.bridgeConfig.host, 
          this.bridgeConfig.port
        );
        
        // Set up message handler
        const unsubscribe = this.integratedBridge.onMessage((message) => {
          this.handleBridgeMessage(message);
        });

        // Set up mixer status handler
        const unsubscribeMixerStatus = this.integratedBridge.onMixerStatus((validated, message) => {
          console.log(`🎛️ Mixer validation status: ${validated ? 'Valid' : 'Invalid'} - ${message}`);
          this.notifyMixerStatusSubscribers(validated, message);
        });

        const bridgeStarted = await this.integratedBridge.start();
        
        if (bridgeStarted) {
          console.log('✅ OSC bridge connected successfully');
          this.isConnecting = false;
          this.isConnectedState = true;
          this.reconnectAttempts = 0;
          this.notifyStatusSubscribers(true);
          this.subscribeFaderUpdates();
          resolve(true);
        } else {
          throw new Error('Failed to connect to OSC bridge server');
        }

      } catch (error) {
        console.error('❌ Failed to connect to OSC bridge:', error);
        console.error('Make sure the bridge server is running on ws://localhost:8080');
        this.isConnecting = false;
        this.isConnectedState = false;
        this.notifyStatusSubscribers(false);
        resolve(false);
      }
    });
  }

  private handleBridgeMessage(message: XAirMessage) {
    if (message.type === 'status') {
      console.log('📊 Bridge status:', message);
      return;
    }
    
    if (message.type === 'osc' && message.address) {
      // Handle fader updates - improved parsing
      if (message.address.includes('/mix/fader')) {
        const channelMatch = message.address.match(/\/ch\/(\d+)\/mix\/fader$/);
        if (channelMatch && message.args && message.args.length > 0) {
          const channel = parseInt(channelMatch[1]);
          
          // Get the raw fader value (0.0 to 1.0)
          let rawValue = message.args[0];
          
          // Handle different argument formats
          if (typeof rawValue === 'object' && rawValue.value !== undefined) {
            rawValue = rawValue.value;
          }
          
          // Ensure we have a valid number
          if (typeof rawValue !== 'number' || isNaN(rawValue)) {
            console.warn(`Invalid fader value for channel ${channel}:`, rawValue);
            return;
          }
          
          // Convert 0-1 to 0-100 and ensure it's within bounds
          const value = Math.max(0, Math.min(100, rawValue * 100));
          
          const faderData: FaderData = {
            channel,
            value,
            timestamp: message.timestamp || Date.now()
          };
          
          console.log(`🎚️ Fader ${channel}: ${value.toFixed(1)}% (raw: ${rawValue})`);
          this.notifySubscribers(faderData);
        }
      }
    }
  }

  private subscribeFaderUpdates() {
    if (!this.integratedBridge?.isActive()) return;
    
    console.log(`🎚️ Subscribing to ${this.maxChannels} fader channels`);
    
    // Subscribe to channel faders
    for (let i = 1; i <= this.maxChannels; i++) {
      const channel = i.toString().padStart(2, '0');
      const address = `/ch/${channel}/mix/fader`;
      this.integratedBridge.subscribe(address);
    }
  }

  sendCommand(address: string, args: any[] = []) {
    if (this.integratedBridge?.isActive()) {
      return this.integratedBridge.sendOSCMessage(address, args);
    }

    console.warn('⚠️ Bridge not connected, cannot send command');
    return false;
  }

  validateMixer() {
    if (this.integratedBridge?.isActive()) {
      this.integratedBridge.validateMixer();
    }
  }

  onFaderUpdate(callback: (data: FaderData) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusSubscribers.add(callback);
    return () => this.statusSubscribers.delete(callback);
  }

  onMixerStatus(callback: (validated: boolean, message: string) => void) {
    this.mixerStatusSubscribers.add(callback);
    return () => this.mixerStatusSubscribers.delete(callback);
  }

  private notifySubscribers(data: FaderData) {
    this.subscribers.forEach(callback => callback(data));
  }

  private notifyStatusSubscribers(connected: boolean) {
    this.statusSubscribers.forEach(callback => callback(connected));
  }

  private notifyMixerStatusSubscribers(validated: boolean, message: string) {
    this.mixerStatusSubscribers.forEach(callback => callback(validated, message));
  }

  disconnect() {
    if (this.integratedBridge) {
      this.integratedBridge.stop();
      this.integratedBridge = null;
    }

    this.isConnectedState = false;
    this.subscribers.clear();
    this.statusSubscribers.clear();
    this.mixerStatusSubscribers.clear();
    this.notifyStatusSubscribers(false);
  }

  isConnected(): boolean {
    return this.isConnectedState && (this.integratedBridge?.isActive() || false);
  }

  isMixerValidated(): boolean {
    return this.integratedBridge?.isMixerValidated() || false;
  }
}
