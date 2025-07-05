
export interface MeterData {
  channel: number;
  level: number; // dB value
  timestamp: number;
}

export class MetersService {
  private meterSubscribers: Set<(data: MeterData[]) => void> = new Set();
  private bridgeConnection: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connectToBridge();
  }

  private connectToBridge() {
    try {
      this.bridgeConnection = new WebSocket('ws://localhost:8080');

      this.bridgeConnection.onopen = () => {
        console.log('📊 Connected to bridge for meter data');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToMeters();
      };

      this.bridgeConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'meters' && message.data) {
            this.handleMeterData(message.data);
          }
        } catch (error) {
          console.error('❌ Error parsing meter message:', error);
        }
      };

      this.bridgeConnection.onclose = () => {
        console.log('❌ Meters bridge connection closed');
        this.isConnected = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect meters (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connectToBridge(), 3000);
        }
      };

      this.bridgeConnection.onerror = (error) => {
        console.error('❌ Meters bridge connection error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to meters bridge:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connectToBridge(), 3000);
      }
    }
  }

  private subscribeToMeters() {
    if (this.bridgeConnection?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe_meters',
        endpoint: '/meters/1'
      };
      
      this.bridgeConnection.send(JSON.stringify(message));
      console.log('📡 Subscribed to meter data');
    }
  }

  private handleMeterData(rawData: number[]) {
    const meterData: MeterData[] = rawData.map((level, index) => ({
      channel: index + 1,
      level: level,
      timestamp: Date.now()
    }));

    this.notifyMeterSubscribers(meterData);
  }

  onMeterUpdate(callback: (data: MeterData[]) => void) {
    this.meterSubscribers.add(callback);
    return () => this.meterSubscribers.delete(callback);
  }

  private notifyMeterSubscribers(data: MeterData[]) {
    this.meterSubscribers.forEach(callback => callback(data));
  }

  isServiceConnected(): boolean {
    return this.isConnected;
  }

  disconnect() {
    if (this.bridgeConnection) {
      this.bridgeConnection.close();
      this.bridgeConnection = null;
    }
    this.isConnected = false;
    this.meterSubscribers.clear();
  }
}

// Create singleton instance
export const metersService = new MetersService();
