
export interface RadioCommand {
  software: 'mAirList' | 'RadioDJ';
  command: string;
  host?: string;
  port?: number;
}

export class RadioSoftwareService {
  private connections: Map<string, WebSocket> = new Map();

  async sendCommand(config: RadioCommand): Promise<boolean> {
    const key = `${config.software}-${config.host || 'localhost'}-${config.port}`;
    
    try {
      switch (config.software) {
        case 'mAirList':
          return await this.sendToMAirList(config);
        case 'RadioDJ':
          return await this.sendToRadioDJ(config);
        default:
          console.error('Unsupported radio software:', config.software);
          return false;
      }
    } catch (error) {
      console.error(`Error sending command to ${config.software}:`, error);
      return false;
    }
  }

  private async sendToMAirList(config: RadioCommand): Promise<boolean> {
    const host = config.host || 'localhost';
    const port = config.port || 9300;
    
    console.log(`📻 Sending mAirList command: ${config.command} to ${host}:${port}`);
    
    try {
      // mAirList typically uses TCP socket connection
      const response = await fetch(`http://${host}:${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `command=${encodeURIComponent(config.command)}`,
      });
      
      console.log(`✅ mAirList HTTP response: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.log('❌ HTTP failed, trying WebSocket fallback');
      // Fallback to WebSocket if HTTP fails
      return this.sendViaWebSocket(config, host, port);
    }
  }

  private async sendToRadioDJ(config: RadioCommand): Promise<boolean> {
    const host = config.host || 'localhost';
    const port = config.port || 18123;
    
    console.log(`📻 Sending RadioDJ command: ${config.command} to ${host}:${port}`);
    
    try {
      // RadioDJ uses its own API format
      const response = await fetch(`http://${host}:${port}/opt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: config.command
        }),
      });
      
      console.log(`✅ RadioDJ HTTP response: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.log('❌ HTTP failed, trying WebSocket fallback');
      return this.sendViaWebSocket(config, host, port);
    }
  }

  private sendViaWebSocket(config: RadioCommand, host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const key = `${config.software}-${host}-${port}`;
      let ws = this.connections.get(key);
      
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        ws = new WebSocket(`ws://${host}:${port}`);
        this.connections.set(key, ws);
        
        ws.onopen = () => {
          console.log(`🔌 WebSocket connected to ${host}:${port}`);
          ws!.send(config.command);
          resolve(true);
        };
        
        ws.onerror = (error) => {
          console.error(`❌ WebSocket error:`, error);
          resolve(false);
        };
      } else {
        ws.send(config.command);
        resolve(true);
      }
    });
  }

  async testConnection(software: 'mAirList' | 'RadioDJ', host: string = 'localhost', port?: number): Promise<boolean> {
    const testPort = port || (software === 'mAirList' ? 9300 : 18123);
    
    try {
      const testCommand = software === 'mAirList' ? 'STATUS' : '{"request": "GetVersion"}';
      const result = await this.sendCommand({
        software,
        command: testCommand,
        host,
        port: testPort
      });
      
      return result;
    } catch (error) {
      console.error(`Failed to test ${software} connection:`, error);
      return false;
    }
  }

  disconnect(software: string, host: string, port: number) {
    const key = `${software}-${host}-${port}`;
    const ws = this.connections.get(key);
    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
  }

  disconnectAll() {
    this.connections.forEach(ws => ws.close());
    this.connections.clear();
  }
}
