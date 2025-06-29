
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
  private simulationTimer: NodeJS.Timeout | null = null;

  constructor(mixerIP: string, mixerPort: number = 10024) {
    this.mixerIP = mixerIP;
    this.mixerPort = mixerPort;
  }

  async start(): Promise<boolean> {
    if (this.isRunning) return true;

    console.log(`🌉 Starting integrated OSC bridge for ${this.mixerIP}:${this.mixerPort}`);

    try {
      // Since browsers can't directly send UDP packets, we'll simulate the OSC communication
      // In a real-world scenario, this would need a proper bridge server
      this.isRunning = true;
      this.startSimulation();
      
      console.log('✅ Integrated OSC bridge started in simulation mode');
      return true;
    } catch (error) {
      console.error('❌ Failed to start integrated bridge:', error);
      return false;
    }
  }

  private startSimulation(): void {
    // Simulate receiving OSC data from mixer
    this.simulationTimer = setInterval(() => {
      // Simulate fader value changes for demo
      const channels = this.mixerPort === 10024 ? 16 : 12; // X-Air 18 vs 16
      const randomChannel = Math.floor(Math.random() * channels) + 1;
      const randomValue = Math.random();
      
      const message: OSCMessage = {
        address: `/ch/${randomChannel.toString().padStart(2, '0')}/mix/fader`,
        args: [randomValue]
      };

      this.notifySubscribers(message);
    }, 5000 + Math.random() * 10000); // Random intervals between 5-15 seconds
  }

  private notifySubscribers(message: OSCMessage): void {
    console.log('🎛️ Simulated OSC Message:', message);
    
    // Notify direct subscribers
    const addressSubscribers = this.subscribers.get(message.address);
    if (addressSubscribers) {
      addressSubscribers.forEach(callback => callback(message));
    }

    // Notify message handlers with bridge format
    const bridgeMessage: BridgeMessage = {
      type: 'osc',
      address: message.address,
      args: message.args,
      timestamp: Date.now()
    };

    this.messageHandlers.forEach(handler => handler(bridgeMessage));
  }

  sendOSCMessage(address: string, args: any[] = []): boolean {
    if (!this.isRunning) {
      console.warn('⚠️ Bridge not running, cannot send OSC message');
      return false;
    }

    console.log(`📤 Simulated OSC send: ${address}`, args);
    
    // In simulation mode, we just log the message
    // In a real implementation, this would send UDP OSC to the mixer
    return true;
  }

  subscribe(address: string, callback?: (message: OSCMessage) => void): boolean {
    if (!this.subscribers.has(address)) {
      this.subscribers.set(address, new Set());
    }

    if (callback) {
      this.subscribers.get(address)!.add(callback);
    }

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

  stop(): void {
    if (!this.isRunning) return;

    console.log('🛑 Stopping integrated OSC bridge');
    
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }

    this.subscribers.clear();
    this.messageHandlers.clear();
    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getConfig() {
    return {
      mixerIP: this.mixerIP,
      mixerPort: this.mixerPort,
      isSimulated: true
    };
  }
}
