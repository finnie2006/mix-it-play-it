export interface SyncConfig {
  id: string;
  name: string;
  lastModified: number;
  data: {
    faderMappings?: Record<string, unknown>;
    speakerMuteConfig?: Record<string, unknown>;
    busMeterConfig?: Record<string, unknown>;
    mainLRConfig?: Record<string, unknown>;
    silenceDetectionConfig?: Record<string, unknown>;
    colorScheme?: string;
    channelNames?: Record<number, string>;
    advancedSettings?: Record<string, unknown>;
  };
}

export interface CloudSyncSettings {
  enabled: boolean;
  mode: 'server' | 'client'; // Run as server or connect as client
  syncUrl: string; // URL to sync server (for client mode)
  serverPort: number; // Port for local server (for server mode)
  apiKey: string;
  autoSync: boolean; // Auto sync on changes
  syncInterval: number; // Minutes between syncs
}

const STORAGE_KEY = 'cloud-sync-settings';
const SYNC_DATA_KEY = 'cloud-sync-data';
const DEFAULT_SETTINGS: CloudSyncSettings = {
  enabled: false,
  mode: 'client',
  syncUrl: '',
  serverPort: 8081,
  apiKey: '',
  autoSync: false,
  syncInterval: 5,
};

export class CloudSyncService {
  private settings: CloudSyncSettings;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(synced: boolean) => void> = [];

  constructor() {
    this.settings = this.loadSettings();
    if (this.settings.enabled && this.settings.autoSync) {
      this.startAutoSync();
    }
  }

  private loadSettings(): CloudSyncSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load cloud sync settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  public async saveSettings(settings: CloudSyncSettings): Promise<void> {
    this.settings = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Handle server mode
    if (settings.enabled && settings.mode === 'server') {
      await this.startServer(settings.serverPort);
    } else {
      await this.stopServer();
    }

    // Restart auto sync if settings changed
    if (settings.enabled && settings.autoSync && settings.mode === 'client') {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }

    console.log('☁️ Cloud sync settings saved');
  }

  private async startServer(port: number): Promise<void> {
    const electronAPI = (window as Window & { electronAPI?: { cloudSync?: { startServer: (port: number) => Promise<{ success: boolean; message: string }> } } }).electronAPI;
    if (!electronAPI?.cloudSync) {
      console.warn('☁️ Electron API not available - server mode requires desktop app');
      return;
    }

    try {
      const result = await electronAPI.cloudSync.startServer(port);
      if (result.success) {
        console.log(`☁️ ${result.message}`);
      } else {
        console.error(`☁️ Failed to start server: ${result.message}`);
      }
    } catch (error) {
      console.error('☁️ Error starting server:', error);
    }
  }

  private async stopServer(): Promise<void> {
    const electronAPI = (window as Window & { electronAPI?: { cloudSync?: { stopServer: () => Promise<{ success: boolean; message: string }> } } }).electronAPI;
    if (!electronAPI?.cloudSync) {
      return;
    }

    try {
      const result = await electronAPI.cloudSync.stopServer();
      if (result.success) {
        console.log(`☁️ ${result.message}`);
      }
    } catch (error) {
      console.error('☁️ Error stopping server:', error);
    }
  }

  public async getServerStatus(): Promise<{ running: boolean; port?: number; configCount?: number }> {
    const electronAPI = (window as Window & { electronAPI?: { cloudSync?: { getStatus: () => Promise<{ running: boolean; port?: number; configCount?: number }> } } }).electronAPI;
    if (!electronAPI?.cloudSync) {
      return { running: false };
    }

    try {
      return await electronAPI.cloudSync.getStatus();
    } catch (error) {
      console.error('☁️ Error getting server status:', error);
      return { running: false };
    }
  }

  public getSettings(): CloudSyncSettings {
    return { ...this.settings };
  }

  private startAutoSync(): void {
    this.stopAutoSync();
    
    if (!this.settings.enabled || !this.settings.autoSync) return;

    const intervalMs = this.settings.syncInterval * 60 * 1000;
    this.syncInterval = setInterval(() => {
      this.syncToCloud();
    }, intervalMs);

    console.log(`☁️ Auto sync started (every ${this.settings.syncInterval} minutes)`);
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('☁️ Auto sync stopped');
    }
  }

  public async syncToCloud(): Promise<boolean> {
    if (!this.settings.enabled) {
      console.warn('☁️ Cloud sync not enabled');
      return false;
    }

    if (this.settings.mode === 'server') {
      console.warn('☁️ Server mode does not upload - clients upload to this server');
      return false;
    }

    if (!this.settings.syncUrl) {
      console.warn('☁️ Cloud sync URL not configured');
      return false;
    }

    try {
      // Gather all config data
      const syncData: SyncConfig = {
        id: this.getDeviceId(),
        name: this.getDeviceName(),
        lastModified: Date.now(),
        data: this.gatherConfigData(),
      };

      // Upload to sync server
      const response = await fetch(`${this.settings.syncUrl}/api/configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
        },
        body: JSON.stringify(syncData),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      console.log('☁️ Synced to cloud successfully');
      this.notifyListeners(true);
      return true;
    } catch (error) {
      console.error('☁️ Failed to sync to cloud:', error);
      this.notifyListeners(false);
      return false;
    }
  }

  public async syncFromCloud(configId?: string): Promise<boolean> {
    if (!this.settings.enabled) {
      console.warn('☁️ Cloud sync not enabled');
      return false;
    }

    if (this.settings.mode === 'server') {
      console.warn('☁️ Server mode cannot download - it serves configs to clients');
      return false;
    }

    if (!this.settings.syncUrl) {
      console.warn('☁️ Cloud sync URL not configured');
      return false;
    }

    try {
      // Fetch from sync server
      const url = configId 
        ? `${this.settings.syncUrl}/api/configs/${configId}`
        : `${this.settings.syncUrl}/api/configs/latest`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const syncData = await response.json() as SyncConfig;

      // Apply synced data
      this.applyConfigData(syncData.data);
      
      console.log('☁️ Synced from cloud successfully');
      this.notifyListeners(true);
      return true;
    } catch (error) {
      console.error('☁️ Failed to sync from cloud:', error);
      this.notifyListeners(false);
      return false;
    }
  }

  public async listAvailableConfigs(): Promise<SyncConfig[]> {
    if (!this.settings.enabled) return [];

    if (this.settings.mode === 'server') {
      console.warn('☁️ Server mode does not list remote configs');
      return [];
    }

    if (!this.settings.syncUrl) {
      return [];
    }

    try {
      const response = await fetch(`${this.settings.syncUrl}/api/configs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list configs: ${response.statusText}`);
      }

      const configs = await response.json();
      // Filter out our own device
      const deviceId = this.getDeviceId();
      return configs.filter((config: SyncConfig) => config.id !== deviceId);
    } catch (error) {
      console.error('☁️ Failed to list configs:', error);
      return [];
    }
  }

  private gatherConfigData(): SyncConfig['data'] {
    const colorScheme = this.loadFromLocalStorage('color-scheme');
    const channelNames = this.loadFromLocalStorage('channel-names');
    
    return {
      faderMappings: this.loadFromLocalStorage('fader-mappings'),
      speakerMuteConfig: this.loadFromLocalStorage('speaker-mute-config'),
      busMeterConfig: this.loadFromLocalStorage('bus-meter-config'),
      mainLRConfig: this.loadFromLocalStorage('main-lr-config'),
      silenceDetectionConfig: this.loadFromLocalStorage('silence-detection-config'),
      colorScheme: typeof colorScheme === 'string' ? colorScheme : undefined,
      channelNames: channelNames as Record<number, string> | undefined,
      advancedSettings: this.loadFromLocalStorage('advancedSettings'),
    };
  }

  private applyConfigData(data: SyncConfig['data']): void {
    if (data.faderMappings) {
      localStorage.setItem('fader-mappings', JSON.stringify(data.faderMappings));
    }
    if (data.speakerMuteConfig) {
      localStorage.setItem('speaker-mute-config', JSON.stringify(data.speakerMuteConfig));
    }
    if (data.busMeterConfig) {
      localStorage.setItem('bus-meter-config', JSON.stringify(data.busMeterConfig));
    }
    if (data.mainLRConfig) {
      localStorage.setItem('main-lr-config', JSON.stringify(data.mainLRConfig));
    }
    if (data.silenceDetectionConfig) {
      localStorage.setItem('silence-detection-config', JSON.stringify(data.silenceDetectionConfig));
    }
    if (data.colorScheme) {
      localStorage.setItem('color-scheme', data.colorScheme);
    }
    if (data.channelNames) {
      localStorage.setItem('channel-names', JSON.stringify(data.channelNames));
    }
    if (data.advancedSettings) {
      localStorage.setItem('advancedSettings', JSON.stringify(data.advancedSettings));
    }

    // Trigger page reload to apply changes
    console.log('☁️ Applied synced configuration');
  }

  private loadFromLocalStorage(key?: string): Record<string, unknown> | null {
    try {
      const stored = localStorage.getItem(key || SYNC_DATA_KEY);
      return stored ? JSON.parse(stored) as Record<string, unknown> : (key ? null : {});
    } catch (error) {
      return key ? null : {};
    }
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    return localStorage.getItem('device-name') || `Studio Computer ${this.getDeviceId().substr(-4)}`;
  }

  public setDeviceName(name: string): void {
    localStorage.setItem('device-name', name);
  }

  public onSync(callback: (synced: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(synced: boolean): void {
    this.listeners.forEach(callback => callback(synced));
  }
}

export const cloudSyncService = new CloudSyncService();
