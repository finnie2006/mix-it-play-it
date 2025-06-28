export interface XAirMessage {
  address: string;
  args: any[];
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
    // Set max channels based on mixer model
    this.maxChannels = model === 'X-Air 16' ? 12 : 16;
    console.log(`🎛️ Initializing ${model} mixer connection to ${ip}:${port}`);
    console.log(`ℹ️ Note: X-Air mixers use UDP for OSC. A WebSocket-to-OSC bridge is required for web apps.`);
  }

  setBridgeConfig(config: OSCBridgeConfig) {
    this.bridgeConfig = config;
    console.log(`🌉 OSC Bridge configured: ${config.bridgeHost}:${config.bridgePort} -> ${config.mixerIP}:${config.mixerPort}`);
  }

  connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('⚠️ Already connecting or connected');
      return Promise.resolve(this.ws?.readyState === WebSocket.OPEN);
    }

    // Check if we should use bridge or direct connection
    if (!this.bridgeConfig) {
      console.log(`🚫 Direct WebSocket connection to X-Air mixer will fail - mixers use UDP OSC protocol`);
      console.log(`💡 Solutions:`);
      console.log(`   1. Install and run an OSC-WebSocket bridge (e.g., node-osc-websocket-bridge)`);
      console.log(`   2. Use X-Air Edit software for direct control`);
      console.log(`   3. Access mixer's built-in web interface directly`);
      console.log(`🔄 Attempting direct connection anyway for demonstration...`);
    }

    this.isConnecting = true;
    const connectHost = this.bridgeConfig?.bridgeHost || this.ip;
    const connectPort = this.bridgeConfig?.bridgePort || this.port;
    
    console.log(`🔄 Starting connection to ${this.model} at ws://${connectHost}:${connectPort}`);
    
    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${connectHost}:${connectPort}`;
        console.log(`🌐 Attempting WebSocket connection to: ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);
        console.log('📡 WebSocket object created, waiting for connection...');
        
        this.ws.onopen = () => {
          console.log(`✅ Successfully connected to ${this.bridgeConfig ? 'OSC Bridge' : this.model}`);
          console.log(`📊 WebSocket ready state: ${this.ws?.readyState}`);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusSubscribers(true);
          
          // Send initial configuration if using bridge
          if (this.bridgeConfig) {
            this.configureOSCBridge();
          }
          
          // Start subscribing to fader updates
          this.subscribeFaderUpdates();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          console.log('📨 Received message:', event.data);
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log(`❌ Disconnected from ${this.bridgeConfig ? 'OSC Bridge' : this.model}`);
          console.log(`🔍 Close event details:`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          if (event.code === 1006 && !this.bridgeConfig) {
            console.log(`🚨 Connection failed with code 1006 - This is expected for direct X-Air connections`);
            console.log(`🔧 To fix this issue:`);
            console.log(`   1. Install an OSC-WebSocket bridge server`);
            console.log(`   2. Or use X-Air's built-in web interface`);
            console.log(`   3. Or use dedicated X-Air software`);
          }
          
          this.isConnecting = false;
          this.notifyStatusSubscribers(false);
          
          if (this.bridgeConfig || event.code !== 1006) {
            this.attemptReconnect();
          }
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error(`❌ WebSocket error:`, error);
          console.log(`🔍 Error details:`, {
            target: error.target,
            type: error.type,
            readyState: this.ws?.readyState
          });
          
          if (!this.bridgeConfig) {
            console.log(`🌐 Direct connection URL: ws://${this.ip}:${this.port}`);
            console.log(`❌ Expected failure: X-Air mixers don't support WebSocket connections`);
            console.log(`✅ Recommended solutions:`);
            console.log(`   • Install OSC-WebSocket bridge: npm install -g osc-websocket-bridge`);
            console.log(`   • Run bridge: osc-websocket-bridge --mixer-ip ${this.ip}`);
            console.log(`   • Or access http://${this.ip} for built-in web mixer`);
          } else {
            console.log(`🌉 Bridge connection URL: ws://${connectHost}:${connectPort}`);
            console.log(`💡 Troubleshooting bridge connection:`);
            console.log(`   • Ensure bridge server is running`);
            console.log(`   • Check bridge host: ${connectHost}`);
            console.log(`   • Check bridge port: ${connectPort}`);
            console.log(`   • Verify mixer IP in bridge config: ${this.bridgeConfig.mixerIP}`);
          }
          
          this.isConnecting = false;
          resolve(false);
        };

        // Set a timeout for connection attempt
        setTimeout(() => {
          if (this.isConnecting && this.ws?.readyState === WebSocket.CONNECTING) {
            console.log(`⏰ Connection timeout after 10 seconds`);
            console.log(`🔍 WebSocket state: ${this.ws?.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
            
            if (!this.bridgeConfig) {
              console.log(`⚠️ Timeout expected - X-Air mixers use UDP OSC, not WebSocket`);
            }
            
            this.ws?.close();
            this.isConnecting = false;
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        console.error('💥 Failed to create WebSocket connection:', error);
        console.log(`🔍 Exception details:`, error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  private configureOSCBridge() {
    if (!this.ws || !this.bridgeConfig) return;
    
    // Send bridge configuration
    const bridgeConfig = {
      type: 'configure',
      target: {
        host: this.bridgeConfig.mixerIP,
        port: this.bridgeConfig.mixerPort
      }
    };
    
    this.ws.send(JSON.stringify(bridgeConfig));
    console.log('🔧 Sent bridge configuration');
  }

  private handleMessage(data: any) {
    try {
      let message;
      
      // Handle both string and binary data
      if (typeof data === 'string') {
        message = JSON.parse(data);
      } else {
        // Handle binary OSC data if bridge sends it
        console.log('📦 Received binary OSC data');
        return;
      }
      
      // Check if it's a fader message
      if (message.address && message.address.includes('/mix/fader')) {
        const channelMatch = message.address.match(/\/ch\/(\d+)\//);
        if (channelMatch) {
          const channel = parseInt(channelMatch[1]);
          const value = (message.args && message.args[0] !== undefined) ? message.args[0] * 100 : 0;
          
          const faderData: FaderData = {
            channel,
            value,
            timestamp: Date.now()
          };
          
          console.log(`🎚️ Fader update: Channel ${channel} = ${value.toFixed(1)}%`);
          this.notifySubscribers(faderData);
        }
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      console.log('📨 Raw message data:', data);
    }
  }

  private subscribeFaderUpdates() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    console.log(`🎚️ Subscribing to ${this.maxChannels} fader channels`);
    
    // Subscribe to channel faders based on mixer model
    for (let i = 1; i <= this.maxChannels; i++) {
      const channel = i.toString().padStart(2, '0');
      const subscribeMessage = {
        address: `/ch/${channel}/mix/fader`,
        args: []
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
    
    console.log(`✅ Sent fader subscription requests`);
  }

  sendCommand(address: string, args: any[] = []) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot send command');
      return false;
    }

    const message = { address, args };
    console.log(`📤 Sending OSC command: ${address}`, args);
    this.ws.send(JSON.stringify(message));
    return true;
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
      console.log(`🛑 Max reconnection attempts reached (${this.maxReconnectAttempts})`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    console.log(`⏱️ Waiting ${this.reconnectDelay}ms before retry`);
    
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

  async testMixerWebInterface(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.ip}/`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      return true;
    } catch (error) {
      console.log(`🌐 Mixer web interface test failed for http://${this.ip}/`);
      return false;
    }
  }
}
