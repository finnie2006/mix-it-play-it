
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
  private maxChannels: number;

  constructor(
    private ip: string, 
    private port: number = 10024, 
    private model: 'X-Air 16' | 'X-Air 18' = 'X-Air 18'
  ) {
    // Set max channels based on mixer model
    this.maxChannels = model === 'X-Air 16' ? 12 : 16;
    console.log(`🎛️ Initializing ${model} mixer connection to ${ip}:${port}`);
  }

  connect(): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('⚠️ Already connecting or connected');
      return Promise.resolve(this.ws?.readyState === WebSocket.OPEN);
    }

    this.isConnecting = true;
    console.log(`🔄 Starting connection to ${this.model} at ws://${this.ip}:${this.port}`);
    
    return new Promise((resolve) => {
      try {
        // Check if the URL is valid
        const wsUrl = `ws://${this.ip}:${this.port}`;
        console.log(`🌐 Attempting WebSocket connection to: ${wsUrl}`);
        
        // X-Air uses WebSocket on port 10024 for OSC over WebSocket
        this.ws = new WebSocket(wsUrl);
        console.log('📡 WebSocket object created, waiting for connection...');
        
        this.ws.onopen = () => {
          console.log(`✅ Successfully connected to ${this.model} mixer`);
          console.log(`📊 WebSocket ready state: ${this.ws?.readyState}`);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusSubscribers(true);
          
          // Start subscribing to fader updates
          this.subscribeFaderUpdates();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          console.log('📨 Received message from mixer:', event.data);
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log(`❌ Disconnected from ${this.model} mixer`);
          console.log(`🔍 Close event details:`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.isConnecting = false;
          this.notifyStatusSubscribers(false);
          this.attemptReconnect();
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error(`❌ ${this.model} WebSocket error:`, error);
          console.log(`🔍 Error details:`, {
            target: error.target,
            type: error.type,
            readyState: this.ws?.readyState
          });
          console.log(`🌐 Connection URL was: ws://${this.ip}:${this.port}`);
          console.log(`💡 Troubleshooting tips:`);
          console.log(`   - Ensure ${this.model} is powered on and connected to network`);
          console.log(`   - Check if IP address ${this.ip} is correct`);
          console.log(`   - Verify OSC is enabled on the mixer`);
          console.log(`   - Try pinging the mixer: ping ${this.ip}`);
          console.log(`   - Check if port ${this.port} is open`);
          
          this.isConnecting = false;
          resolve(false);
        };

        // Set a timeout for connection attempt
        setTimeout(() => {
          if (this.isConnecting && this.ws?.readyState === WebSocket.CONNECTING) {
            console.log(`⏰ Connection timeout after 10 seconds`);
            console.log(`🔍 WebSocket state: ${this.ws?.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
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
    
    // Subscribe to channel faders based on mixer model
    for (let i = 1; i <= this.maxChannels; i++) {
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
}
