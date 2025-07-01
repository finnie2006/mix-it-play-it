import WebSocket from 'ws';
import { XAirMessage } from './xairWebSocket';

export interface BridgeConfig {
  mixerIP: string;
  mixerPort: number;
  bridgePort: number;
}

export class IntegratedOSCBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isActive = false;
  private messageHandlers: Set<(message: XAirMessage) => void> = new Set();
  private statusHandlers: Set<(validated: boolean, message: string) => void> = new Set();
  private mixerValidated = false;

  constructor(
    private mixerIP: string,
    private mixerPort: number,
    private bridgeHost: string = 'localhost',
    private bridgePort: number = 8080
  ) {}

  async start(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${this.bridgeHost}:${this.bridgePort}`;
        console.log(`🌉 Connecting to OSC bridge at ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ Connected to OSC bridge');
          this.isActive = true;
          
          // Send mixer IP update to bridge server
          this.updateMixerIP(this.mixerIP);
          
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: XAirMessage = JSON.parse(event.data);
            
            if (message.type === 'mixer_status') {
              this.mixerValidated = message.connected || false;
              const statusMessage = message.message || 'Unknown status';
              console.log(`🎛️ Mixer status: ${this.mixerValidated ? 'Connected' : 'Disconnected'} - ${statusMessage}`);
              this.notifyStatusHandlers(this.mixerValidated, statusMessage);
            }
            
            this.notifyMessageHandlers(message);
          } catch (error) {
            console.error('Error parsing bridge message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('❌ OSC bridge connection closed');
          this.isActive = false;
          this.mixerValidated = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ OSC bridge connection error:', error);
          this.isActive = false;
          resolve(false);
        };

        // Timeout for connection
        setTimeout(() => {
          if (!this.isActive) {
            console.error('❌ OSC bridge connection timeout');
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        resolve(false);
      }
    });
  }

  updateMixerIP(newMixerIP: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`🔄 Updating bridge server mixer IP to: ${newMixerIP}`);
      this.mixerIP = newMixerIP;
      
      const updateMessage = {
        type: 'update_mixer_ip',
        mixerIP: newMixerIP
      };
      
      this.ws.send(JSON.stringify(updateMessage));
    }
  }

  stop() {
    console.log('🛑 Stopping OSC bridge connection');
    this.isActive = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      console.log('🔄 Attempting to reconnect to OSC bridge...');
      this.reconnectTimer = null;
      this.start();
    }, 3000);
  }

  subscribe(address: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        type: 'subscribe',
        address: address
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    } else {
      console.warn('⚠️ Cannot subscribe, bridge not connected');
    }
  }

  sendOSCMessage(address: string, args: any[] = []) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const oscMessage = {
        type: 'osc',
        address: address,
        args: args
      };
      this.ws.send(JSON.stringify(oscMessage));
      return true;
    } else {
      console.warn('⚠️ Cannot send OSC message, bridge not connected');
      return false;
    }
  }

  validateMixer() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const validateMessage = {
        type: 'validate_mixer'
      };
      this.ws.send(JSON.stringify(validateMessage));
    } else {
      console.warn('⚠️ Cannot validate mixer, bridge not connected');
    }
  }

  onMessage(callback: (message: XAirMessage) => void) {
    this.messageHandlers.add(callback);
    return () => this.messageHandlers.delete(callback);
  }

  onMixerStatus(callback: (validated: boolean, message: string) => void) {
    this.statusHandlers.add(callback);
    return () => this.statusHandlers.delete(callback);
  }

  private notifyMessageHandlers(message: XAirMessage) {
    this.messageHandlers.forEach(callback => callback(message));
  }

  private notifyStatusHandlers(validated: boolean, message: string) {
    this.statusHandlers.forEach(callback => callback(validated, message));
  }

  isActiveState(): boolean {
    return this.isActive;
  }

  isActive: () => boolean = () => {
    return this.ws?.readyState === WebSocket.OPEN;
  };

  isMixerValidated(): boolean {
    return this.mixerValidated;
  }
}
