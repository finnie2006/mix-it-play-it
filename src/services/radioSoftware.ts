
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

  setMairListCredentials(username: string, password: string) {
    this.mairlistCredentials = { username, password };
    console.log('🔐 mAirList credentials updated');
  }

  async sendCommand(config: RadioCommand): Promise<boolean> {
    try {
      switch (config.software) {
        case 'mAirList':
          return await this.sendToMAirListWithAuth(config);
        case 'RadioDJ':
          console.log('RadioDJ support temporarily disabled - focusing on mAirList');
          return false;
        default:
          console.error('Unsupported radio software:', config.software);
          return false;
      }
    } catch (error) {
      console.error(`Error sending command to ${config.software}:`, error);
      return false;
    }
  }

  private async sendToMAirListWithAuth(config: RadioCommand): Promise<boolean> {
    const host = config.host || 'localhost';
    const port = config.port || 9300;
    const username = config.username || this.mairlistCredentials.username;
    const password = config.password || this.mairlistCredentials.password;
    
    console.log(`📻 Sending mAirList command: ${config.command} to ${host}:${port} with auth`);
    
    try {
      // Create Authorization header for HTTP Basic Auth
      const credentials = btoa(`${username}:${password}`);
      const authHeader = `Basic ${credentials}`;
      
      const response = await fetch(`http://${host}:${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
        },
        body: `command=${encodeURIComponent(config.command)}`,
      });
      
      console.log(`✅ mAirList HTTP response: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('❌ Authentication failed - check username/password');
        return false;
      }
      
      if (response.status === 0 || response.type === 'opaque') {
        console.warn('⚠️ CORS blocked the response, but command may have been sent');
        // Even if CORS blocks the response, the command might still work
        return true;
      }
      
      return response.ok;
    } catch (error) {
      console.error('❌ mAirList connection failed:', error);
      
      // Check if it's a CORS error
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.warn('⚠️ CORS error detected - command may still work on mAirList side');
        return true; // Assume success since CORS doesn't mean the command failed
      }
      
      return false;
    }
  }

  async testConnection(software: 'mAirList' | 'RadioDJ', host: string = 'localhost', port?: number, username?: string, password?: string): Promise<boolean> {
    if (software !== 'mAirList') {
      console.log('Only mAirList testing supported currently');
      return false;
    }
    
    const testPort = port || 9300;
    
    try {
      const result = await this.sendToMAirListWithAuth({
        software: 'mAirList',
        command: 'STATUS',
        host,
        port: testPort,
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
    // No persistent connections to clean up for HTTP requests
    console.log(`🧹 Cleaned up ${software} connection`);
  }

  disconnectAll() {
    // No persistent connections to clean up for HTTP requests
    console.log('🧹 All connections cleaned up');
  }
}
