export interface VUMeterData {
  channels: number[];
  timestamp: number;
}

export class VUMeterService {
  private subscribers: Set<(data: VUMeterData) => void> = new Set();
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
          
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'vu_meters' && message.data) {
              this.notifySubscribers(message.data);
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
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const vuMeterService = new VUMeterService();
