
export interface MeterLevel {
  channel: number;
  level: number;
  timestamp: number;
}

export interface ProgramLevel {
  left: number;
  right: number;
  timestamp: number;
}

export class MetersService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  
  private meterUpdateCallbacks: ((levels: MeterLevel[]) => void)[] = [];
  private programUpdateCallbacks: ((level: ProgramLevel) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket('ws://localhost:8080');

      this.ws.onopen = () => {
        console.log('📊 Connected to meters service');
        this.reconnectAttempts = 0;
        
        // Subscribe to meter data
        this.send({
          type: 'subscribe_meters'
        });

        this.notifyConnection(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing meters message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('❌ Meters service disconnected');
        this.notifyConnection(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ Meters service error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to meters service:', error);
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'meters_data':
        if (data.channels) {
          const meterLevels: MeterLevel[] = data.channels.map((level: number, index: number) => ({
            channel: index + 1,
            level: level,
            timestamp: data.timestamp || Date.now()
          }));
          
          this.meterUpdateCallbacks.forEach(callback => callback(meterLevels));
        }
        
        if (data.program) {
          const programLevel: ProgramLevel = {
            left: data.program.left || -60,
            right: data.program.right || -60,
            timestamp: data.timestamp || Date.now()
          };
          
          this.programUpdateCallbacks.forEach(callback => callback(programLevel));
        }
        break;
        
      case 'connection_status':
        this.notifyConnection(data.connected);
        break;
        
      default:
        // Handle other message types if needed
        break;
    }
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting to meters service (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay);
    }
  }

  private notifyConnection(connected: boolean) {
    this.connectionCallbacks.forEach(callback => callback(connected));
  }

  public onMeterUpdate(callback: (levels: MeterLevel[]) => void) {
    this.meterUpdateCallbacks.push(callback);
    
    return () => {
      const index = this.meterUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.meterUpdateCallbacks.splice(index, 1);
      }
    };
  }

  public onProgramUpdate(callback: (level: ProgramLevel) => void) {
    this.programUpdateCallbacks.push(callback);
    
    return () => {
      const index = this.programUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.programUpdateCallbacks.splice(index, 1);
      }
    };
  }

  public onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create singleton instance
export const metersService = new MetersService();
