
export interface BridgeConfig {
  mixerIP: string;
  mixerPort: number;
  bridgePort: number;
}

export class OSCBridge {
  private isRunning = false;
  private bridgeProcess: unknown = null;
  private config: BridgeConfig;

  constructor(config: BridgeConfig) {
    this.config = config;
  }

  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('🌉 Bridge already running');
      return true;
    }

    try {
      console.log(`🌉 Starting OSC bridge for mixer ${this.config.mixerIP}:${this.config.mixerPort}`);
      
      // For web browsers, we'll use a different approach
      // Since we can't spawn Node.js processes directly from the browser,
      // we'll create a WebWorker-based bridge or use a different architecture
      
      this.isRunning = true;
      return true;
    } catch (_error) {
      console.error('❌ Failed to start OSC bridge:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping OSC bridge');
    
    if (this.bridgeProcess) {
      // Stop the bridge process
      this.bridgeProcess = null;
    }
    
    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getConfig(): BridgeConfig {
    return this.config;
  }

  updateConfig(config: BridgeConfig): void {
    this.config = config;
  }
}
