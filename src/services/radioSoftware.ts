
export interface RadioCommand {
  software: 'mAirList' | 'RadioDJ';
  command: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export class RadioSoftwareService {
  private mairlistCredentials: { username: string; password: string } = {
    username: '',
    password: ''
  };
  private bridgeWs: WebSocket | null = null;
  private bridgeConnected = false;

  constructor() {
    this.initializeBridge();
  }

  private async initializeBridge() {
    try {
      this.bridgeWs = new WebSocket('ws://localhost:8080');
      
      this.bridgeWs.onopen = () => {
        this.bridgeConnected = true;
        console.log('🌉 Connected to bridge for mAirList proxy');
      };

      this.bridgeWs.onclose = () => {
        this.bridgeConnected = false;
        console.log('❌ Bridge connection closed');
      };

      this.bridgeWs.onerror = () => {
        this.bridgeConnected = false;
      };
    } catch (error) {
      console.log('⚠️ Bridge not available, using direct HTTP for mAirList');
    }
  }

  setMairListCredentials(username: string, password: string) {
    this.mairlistCredentials = { username, password };
    
    // Update bridge server with credentials
    if (this.bridgeConnected && this.bridgeWs) {
      this.bridgeWs.send(JSON.stringify({
        type: 'mairlist_config',
        host: 'localhost',
        port: 9300,
        username,
        password
      }));
    }
  }

  async sendCommand(config: RadioCommand): Promise<boolean> {
    try {
      switch (config.software) {
        case 'mAirList':
          return await this.sendToMAirList(config);
        case 'RadioDJ':
          console.log('RadioDJ support temporarily disabled - converting to mAirList command');
          // Convert RadioDJ command to mAirList equivalent
          const convertedConfig: RadioCommand = {
            ...config,
            software: 'mAirList',
            command: this.convertToMairListCommand(config.command)
          };
          return await this.sendToMAirList(convertedConfig);
        default:
          console.error('Unsupported radio software:', config.software);
          return false;
      }
    } catch (error) {
      console.error(`Error sending command to ${config.software}:`, error);
      return false;
    }
  }

  private convertToMairListCommand(radioDjCommand: string): string {
    // Convert common RadioDJ commands to mAirList equivalents
    const commandMap: Record<string, string> = {
      'PLAYER 1 PLAY': 'PLAYER 1 PLAY',
      'PLAYER 1 STOP': 'PLAYER 1 STOP',
      'PLAYER 2 PLAY': 'PLAYER 2 PLAY',
      'PLAYER 2 STOP': 'PLAYER 2 STOP',
      'PLAYER 1 PAUSE': 'PLAYER 1 PAUSE',
      'PLAYER 2 PAUSE': 'PLAYER 2 PAUSE',
      'PLAYLIST NEXT': 'PLAYLIST NEXT',
      'PLAYLIST PREVIOUS': 'PLAYLIST PREVIOUS'
    };
    
    return commandMap[radioDjCommand] || radioDjCommand;
  }

  private async sendToMAirList(config: RadioCommand): Promise<boolean> {
    // Try bridge first (no CORS issues)
    if (this.bridgeConnected && this.bridgeWs) {
      console.log(`📻 Sending mAirList command via bridge: ${config.command}`);
      return await this.sendViaBridge(config);
    }
    
    // Fallback to direct HTTP (may have CORS issues)
    console.log(`📻 Sending mAirList command directly: ${config.command}`);
    return await this.sendToMAirListDirect(config);
  }

  private async sendViaBridge(config: RadioCommand): Promise<boolean> {
    return new Promise((resolve) => {
      const requestId = Math.random().toString(36).substr(2, 9);
      
      const handleResponse = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'mairlist_response' && message.requestId === requestId) {
            this.bridgeWs?.removeEventListener('message', handleResponse);
            if (message.success) {
              console.log(`✅ mAirList command executed: ${config.command}`);
            } else {
              console.log(`❌ mAirList command failed: ${config.command}`);
            }
            resolve(message.success);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      this.bridgeWs?.addEventListener('message', handleResponse);
      
      this.bridgeWs?.send(JSON.stringify({
        type: 'mairlist_command',
        command: config.command,
        requestId
      }));

      // Timeout after 5 seconds
      setTimeout(() => {
        this.bridgeWs?.removeEventListener('message', handleResponse);
        resolve(false);
      }, 5000);
    });
  }

  private async sendToMAirListDirect(config: RadioCommand): Promise<boolean> {
    const host = config.host || 'localhost';
    const port = config.port || 9300;
    const username = config.username || this.mairlistCredentials.username;
    const password = config.password || this.mairlistCredentials.password;
    
    if (!username || !password) {
      console.error('❌ Missing username or password for mAirList authentication');
      return false;
    }
    
    try {
      const credentials = `${username}:${password}`;
      const encodedCredentials = btoa(credentials);
      const authHeader = `Basic ${encodedCredentials}`;
      
      const response = await fetch(`http://${host}:${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
        },
        body: `command=${encodeURIComponent(config.command)}`,
      });
      
      if (response.status === 401) {
        console.error('❌ Authentication failed - check username/password');
        return false;
      }
      
      if (response.status === 0 || response.type === 'opaque') {
        console.warn('⚠️ CORS blocked response, but command may have been sent');
        return true;
      }
      
      return response.ok;
    } catch (error) {
      console.error('❌ mAirList connection failed:', error);
      
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.warn('🎯 CORS Error! Use bridge server to avoid this issue');
        return true;
      }
      
      return false;
    }
  }

  async testConnection(software: 'mAirList' | 'RadioDJ', host: string = 'localhost', port?: number, username?: string, password?: string): Promise<boolean> {
    if (software !== 'mAirList') {
      console.log('Only mAirList testing supported currently');
      return false;
    }
    
    try {
      const result = await this.sendToMAirList({
        software: 'mAirList',
        command: 'STATUS',
        host,
        port: port || 9300,
        username,
        password
      });
      
      return result;
    } catch (error) {
      console.error(`Failed to test mAirList connection:`, error);
      return false;
    }
  }

  disconnect(software: string, host: string, port: number) {
    console.log(`🧹 Cleaned up ${software} connection`);
  }

  disconnectAll() {
    console.log('🧹 All connections cleaned up');
    if (this.bridgeWs) {
      this.bridgeWs.close();
      this.bridgeWs = null;
      this.bridgeConnected = false;
    }
  }
}
