
interface OSCMessage {
  address: string;
  args: any[];
}

interface BridgeMessage {
  type: 'osc' | 'status' | 'subscribe';
  address?: string;
  args?: any[];
  timestamp?: number;
}

export class IntegratedOSCBridge {
  private isRunning = false;
  private mixerIP: string;
  private mixerPort: number;
  private subscribers: Map<string, Set<(message: OSCMessage) => void>> = new Map();
  private messageHandlers: Set<(message: BridgeMessage) => void> = new Set();
  private websocket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private bridgeHost: string;
  private bridgePort: number;

  constructor(mixerIP: string, mixerPort: number = 10024, bridgeHost: string = 'localhost', bridgePort: number = 8080) {
    this.mixerIP = mixerIP;
    this.mixerPort = mixerPort;
    this.bridgeHost = bridgeHost;
    this.bridgePort = bridgePort;
  }

  async start(): Promise<boolean> {
    if (this.isRunning) return true;

    console.log(`🌉 Starting OSC bridge connection to ws://${this.bridgeHost}:${this.bridgePort}`);
    console.log(`🎛️ Target mixer: ${this.mixerIP}:${this.mixerPort}`);

    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(`ws://${this.bridgeHost}:${this.bridgePort}`);
        
        this.websocket.onopen = () => {
          console.log('✅ Connected to OSC bridge server');
          this.isRunning = true;
          
          // Send initial configuration to bridge server
          this.sendToBridge({
            type: 'status',
            mixerIP: this.mixerIP,
            mixerPort: this.mixerPort
          });
          
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleBridgeMessage(message);
          } catch (error) {
            console.error('Failed to parse bridge message:', error);
          }
        };

        this.websocket.onerror = (error) => {
          console.error('❌ Bridge WebSocket error:', error);
          this.isRunning = false;
          resolve(false);
        };

        this.websocket.onclose = () => {
          console.log('🔌 Bridge connection closed');
          this.isRunning = false;
          this.attemptReconnect();
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isRunning) {
            console.error('❌ Bridge connection timeout');
            if (this.websocket) {
              this.websocket.close();
            }
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('❌ Failed to connect to bridge:', error);
        resolve(false);
      }
    });
  }

  private handleBridgeMessage(message: BridgeMessage): void {
    if (message.type === 'osc' && message.address) {
      const oscMessage: OSCMessage = {
        address: message.address,
        args: message.args || []
      };
      
      console.log('🎛️ Received OSC Message:', oscMessage);
      this.notifySubscribers(oscMessage);
    }

    // Notify message handlers
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifySubscribers(message: OSCMessage): void {
    const addressSubscribers = this.subscribers.get(message.address);
    if (addressSubscribers) {
      addressSubscribers.forEach(callback => callback(message));
    }
  }

  private sendToBridge(message: any): boolean {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  sendOSCMessage(address: string, args: any[] = []): boolean {
    if (!this.isRunning) {
      console.warn('⚠️ Bridge not connected, cannot send OSC message');
      return false;
    }

    const message = {
      type: 'osc',
      address,
      args,
      mixerIP: this.mixerIP,
      mixerPort: this.mixerPort
    };

    console.log(`📤 Sending OSC: ${address}`, args);
    return this.sendToBridge(message);
  }

  subscribe(address: string, callback?: (message: OSCMessage) => void): boolean {
    if (!this.subscribers.has(address)) {
      this.subscribers.set(address, new Set());
    }

    if (callback) {
      this.subscribers.get(address)!.add(callback);
    }

    // Send subscription request to bridge
    this.sendToBridge({
      type: 'subscribe',
      address,
      mixerIP: this.mixerIP,
      mixerPort: this.mixerPort
    });

    console.log(`🔔 Subscribed to: ${address}`);
    return true;
  }

  unsubscribe(address: string, callback?: (message: OSCMessage) => void): boolean {
    const addressSubscribers = this.subscribers.get(address);
    if (addressSubscribers && callback) {
      addressSubscribers.delete(callback);
      if (addressSubscribers.size === 0) {
        this.subscribers.delete(address);
      }
    }
    return true;
  }

  onMessage(handler: (message: BridgeMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) return;
    
    console.log('🔄 Attempting to reconnect to bridge...');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start();
    }, 3000);
  }

  stop(): void {
    if (!this.isRunning) return;

    console.log('🛑 Stopping OSC bridge');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.subscribers.clear();
    this.messageHandlers.clear();
    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning && this.websocket?.readyState === WebSocket.OPEN;
  }

  getConfig() {
    return {
      mixerIP: this.mixerIP,
      mixerPort: this.mixerPort,
      bridgeHost: this.bridgeHost,
      bridgePort: this.bridgePort,
      isSimulated: false
    };
  }
}
