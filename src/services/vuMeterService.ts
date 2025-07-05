
export interface VUMeterData {
  channels: number[];
  timestamp: number;
}

export class VUMeterService {
  private ws: WebSocket | null = null;
  private subscribers: Set<(data: VUMeterData) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;

  constructor(private bridgeHost: string = 'localhost', private bridgePort: number = 8080) {}

  connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve(this.ws?.readyState === WebSocket.OPEN);
    }

    this.isConnecting = true;

    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${this.bridgeHost}:${this.bridgePort}`;
        console.log(`📊 Connecting to VU meter bridge at ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ VU meter service connected to bridge');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Subscribe to VU meters
          this.subscribeToMeters();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'vu_meters' && message.data) {
              this.notifySubscribers(message.data);
            }
          } catch (error) {
            console.error('❌ Error parsing VU meter message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 VU meter service disconnected from bridge');
          this.isConnecting = false;
          this.ws = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ VU meter WebSocket error:', error);
          this.isConnecting = false;
          resolve(false);
        };

      } catch (error) {
        console.error('❌ Failed to connect VU meter service:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  private subscribeToMeters() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_meters'
      }));
      console.log('📡 Subscribed to VU meters');
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached for VU meter service');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect VU meter service (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  onMeterUpdate(callback: (data: VUMeterData) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: VUMeterData) {
    this.subscribers.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const vuMeterService = new VUMeterService();
