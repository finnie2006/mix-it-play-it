
export interface XAirMessage {
  address: string;
  args: any[];
}

export interface FaderData {
  channel: number;
  value: number;
  timestamp: number;
}

export class XAirWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private subscribers: Set<(data: FaderData) => void> = new Set();
  private statusSubscribers: Set<(connected: boolean) => void> = new Set();

  constructor(private ip: string, private port: number = 10024) {}

  connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve(this.ws?.readyState === WebSocket.OPEN);
    }

    this.isConnecting = true;
    
    return new Promise((resolve) => {
      try {
        // X-Air uses WebSocket on port 10024 for OSC over WebSocket
        this.ws = new WebSocket(`ws://${this.ip}:${this.port}`);
        
        this.ws.onopen = () => {
          console.log('Connected to X-Air mixer');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusSubscribers(true);
          
          // Start subscribing to fader updates
          this.subscribeFaderUpdates();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from X-Air mixer');
          this.isConnecting = false;
          this.notifyStatusSubscribers(false);
          this.attemptReconnect();
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error('X-Air WebSocket error:', error);
          this.isConnecting = false;
          resolve(false);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  private handleMessage(data: any) {
    try {
      // Parse OSC message (simplified - real OSC parsing would be more complex)
      const message = JSON.parse(data);
      
      // Check if it's a fader message (e.g., /ch/01/mix/fader)
      if (message.address && message.address.includes('/mix/fader')) {
        const channelMatch = message.address.match(/\/ch\/(\d+)\//);
        if (channelMatch) {
          const channel = parseInt(channelMatch[1]);
          const value = message.args[0] * 100; // Convert to percentage
          
          const faderData: FaderData = {
            channel,
            value,
            timestamp: Date.now()
          };
          
          this.notifySubscribers(faderData);
        }
      }
    } catch (error) {
      console.error('Error parsing mixer message:', error);
    }
  }

  private subscribeFaderUpdates() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    // Subscribe to all channel faders (1-16 for X-Air 18)
    for (let i = 1; i <= 16; i++) {
      const channel = i.toString().padStart(2, '0');
      const subscribeMessage = {
        address: `/ch/${channel}/mix/fader`,
        args: []
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  sendCommand(address: string, args: any[] = []) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send command');
      return false;
    }

    const message = { address, args };
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
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
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
