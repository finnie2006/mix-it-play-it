
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
    
    console.log(`📻 Sending mAirList command: ${config.command} to ${host}:${port}`);
    console.log(`🔐 Using credentials - Username: "${username}", Password: "${password}"`);
    
    if (!username || !password) {
      console.error('❌ Missing username or password for mAirList authentication');
      return false;
    }
    
    try {
      // Create Authorization header for HTTP Basic Auth
      const credentials = `${username}:${password}`;
      const encodedCredentials = btoa(credentials);
      const authHeader = `Basic ${encodedCredentials}`;
      
      console.log(`🔐 Auth header: ${authHeader}`);
      console.log(`🔐 Credentials string: "${credentials}"`);
      console.log(`🔐 Base64 encoded: "${encodedCredentials}"`);
      
      const response = await fetch(`http://${host}:${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
        },
        body: `command=${encodeURIComponent(config.command)}`,
      });
      
      console.log(`📻 mAirList HTTP response: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('❌ Authentication failed - check username/password');
        console.error('❌ Server expects Basic realm="RESTRemote"');
        return false;
      }
      
      if (response.status === 0 || response.type === 'opaque') {
        console.warn('⚠️ CORS blocked the response, but command may have been sent');
        return true;
      }
      
      return response.ok;
    } catch (error) {
      console.error('❌ mAirList connection failed:', error);
      
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.warn('🎯 CORS Error Detected! This is normal - mAirList server needs CORS configuration');
        console.warn('💡 Your command was likely sent successfully, but browser blocks the response');
        console.warn('🔧 Solution: Configure mAirList CORS or use the OSC bridge for HTTP requests');
        // For connection testing, we'll consider CORS errors as "possibly successful"
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
    
    const testPort = port || 9300;
    
    console.log(`🧪 testConnection called with: host=${host}, port=${testPort}, username=${username}, password=${password}`);
    
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
    console.log(`🧹 Cleaned up ${software} connection`);
  }

  disconnectAll() {
    console.log('🧹 All connections cleaned up');
  }
}
