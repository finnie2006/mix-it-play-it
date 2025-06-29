
export interface XAirMessage {
  type: 'osc' | 'status' | 'subscribe';
  address?: string;
  args?: any[];
  connected?: boolean;
  mixerIP?: string;
  mixerPort?: number;
  timestamp?: number;
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
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private subscribers: Set<(data: FaderData) => void> = new Set();
  private statusSubscribers: Set<(connected: boolean) => void> = new Set();
  private maxChannels: number;
  private bridgeConfig: OSCBridgeConfig | null = null;

  constructor(
    private ip: string, 
    private port: number = 10024, 
    private model: 'X-Air 16' | 'X-Air 18' = 'X-Air 18'
  ) {
    this.maxChannels = model === 'X-Air 16' ? 12 : 16;
    console.log(`🎛️ Initializing ${model} mixer connection to ${ip}:${port}`);
  }

  setBridgeConfig(config: OSCBridgeConfig) {
    this.bridgeConfig = config;
    console.log(`🌉 OSC Bridge configured: ${config.bridgeHost}:${config.bridgePort} -> ${config.mixerIP}:${config.mixerPort}`);
  }

  connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve(this.ws?.readyState === WebSocket.OPEN);
    }

    this.isConnecting = true;
    const connectHost = this.bridgeConfig?.bridgeHost || 'localhost';
    const connectPort = this.bridgeConfig?.bridgePort || 8080;
    
    console.log(`🔄 Connecting to OSC bridge at ws://${connectHost}:${connectPort}`);
    
    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${connectHost}:${connectPort}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log(`✅ Connected to OSC bridge`);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusSubscribers(true);
          this.subscribeFaderUpdates();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log(`❌ Disconnected from OSC bridge (${event.code}: ${event.reason})`);
          this.isConnecting = false;
          this.notifyStatusSubscribers(false);
          this.attemptReconnect();
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error(`❌ Bridge connection error:`, error);
          this.isConnecting = false;
          resolve(false);
        };

        setTimeout(() => {
          if (this.isConnecting) {
            console.log(`⏰ Bridge connection timeout`);
            this.ws?.close();
            this.isConnecting = false;
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        console.error('💥 Failed to connect to bridge:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  private handleMessage(data: any) {
    try {
      const message: XAirMessage = JSON.parse(data);
      
      if (message.type === 'status') {
        console.log('📊 Bridge status:', message);
        return;
      }
      
      if (message.type === 'osc' && message.address) {
        // Handle fader updates
        if (message.address.includes('/mix/fader')) {
          const channelMatch = message.address.match(/\/ch\/(\d+)\//);
          if (channelMatch && message.args && message.args.length > 0) {
            const channel = parseInt(channelMatch[1]);
            const value = message.args[0] * 100; // Convert 0-1 to 0-100
            
            const faderData: FaderData = {
              channel,
              value,
              timestamp: message.timestamp || Date.now()
            };
            
            console.log(`🎚️ Fader ${channel}: ${value.toFixed(1)}%`);
            this.notifySubscribers(faderData);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error parsing bridge message:', error);
    }
  }

  private subscribeFaderUpdates() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    console.log(`🎚️ Subscribing to ${this.maxChannels} fader channels`);
    
    // Subscribe to channel faders
    for (let i = 1; i <= this.maxChannels; i++) {
      const channel = i.toString().padStart(2, '0');
      this.sendMessage({
        type: 'subscribe',
        address: `/ch/${channel}/mix/fader`
      });
    }
  }

  private sendMessage(message: XAirMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Bridge not connected, cannot send message');
      return false;
    }

    console.log(`📤 Sending to bridge:`, message);
    this.ws.send(JSON.stringify(message));
    return true;
  }

  sendCommand(address: string, args: any[] = []) {
    return this.sendMessage({
      type: 'osc',
      address,
      args
    });
  }

  onFaderUpdate(callback: (data: FaderData) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusSubscribers.add(callback);
    return () => this.statusSubscribers.delete(callback);
  }

  private notifySubscribers(data: FaderData) {
    this.subscribers.forEach(callback => callback(data));
  }

  private notifyStatusSubscribers(connected: boolean) {
    this.statusSubscribers.forEach(callback => callback(connected));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`🛑 Max reconnection attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.statusSubscribers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }
}
