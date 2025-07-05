export interface VUMeterData {
  channels: number[];
  timestamp: number;
}

export interface FaderMapping {
  channel: number;
  description: string;
  enabled: boolean;
  isStereo?: boolean;
  threshold?: number;
  command?: string;
}

export class VUMeterService {
  private subscribers: Set<(data: VUMeterData) => void> = new Set();
  private mappingSubscribers: Set<(mappings: FaderMapping[]) => void> = new Set();
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private bridgeHost: string = 'localhost', private bridgePort: number = 8080) {}

  async connect(): Promise<boolean> {
    try {
      const wsUrl = `ws://${this.bridgeHost}:${this.bridgePort}`;
      console.log('📊 Connecting to VU meter service:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        if (!this.ws) {
          resolve(false);
          return;
        }

        this.ws.onopen = () => {
          console.log('📊 VU meter service connected');
          this.connected = true;
          
          // Subscribe to meters
          this.ws?.send(JSON.stringify({
            type: 'subscribe_meters'
          }));

          // Request fader mappings
          this.ws?.send(JSON.stringify({
            type: 'get_fader_mappings'
          }));
          
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'vu_meters' && message.data) {
              this.notifySubscribers(message.data);
            } else if (message.type === 'fader_mappings' && message.mappings) {
              this.notifyMappingSubscribers(message.mappings);
            }
          } catch (error) {
            console.error('📊 Error parsing VU meter message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('📊 VU meter service disconnected');
          this.connected = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('📊 VU meter service error:', error);
          this.connected = false;
          resolve(false);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.connected) {
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('📊 Failed to connect to VU meter service:', error);
      return false;
    }
  }

  private attemptReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('📊 Attempting to reconnect VU meter service...');
      this.connect();
    }, 3000);
  }

  onMeterUpdate(callback: (data: VUMeterData) => void) {
    this.subscribers.add(callback);
    // Return cleanup function
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: VUMeterData) {
    this.subscribers.forEach(callback => callback(data));
  }

  onMappingUpdate(callback: (mappings: FaderMapping[]) => void) {
    this.mappingSubscribers.add(callback);
    // Return cleanup function
    return () => this.mappingSubscribers.delete(callback);
  }

  private notifyMappingSubscribers(mappings: FaderMapping[]) {
    this.mappingSubscribers.forEach(callback => callback(mappings));
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.subscribers.clear();
    this.mappingSubscribers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const vuMeterService = new VUMeterService();
