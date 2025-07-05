
export interface VUMeterData {
  channels: number[];
  timestamp: number;
}

export class VUMeterService {
  private subscribers: Set<(data: VUMeterData) => void> = new Set();

  constructor(private bridgeHost: string = 'localhost', private bridgePort: number = 8080) {}

  connect(): Promise<boolean> {
    // Backend removed - return false to indicate no connection
    console.log('📊 VU meter backend not implemented');
    return Promise.resolve(false);
  }

  onMeterUpdate(callback: (data: VUMeterData) => void) {
    this.subscribers.add(callback);
    // Return cleanup function
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: VUMeterData) {
    this.subscribers.forEach(callback => callback(data));
  }

  disconnect() {
    this.subscribers.clear();
  }

  isConnected(): boolean {
    return false;
  }
}

export const vuMeterService = new VUMeterService();
