export interface ChannelName {
  channel: number;
  name: string;
  color?: number; // Optional color coding (0-15 OSC values)
}

const STORAGE_KEY = 'channel-names';

export class ChannelNamingService {
  private channelNames: Map<number, ChannelName> = new Map();
  private listeners: Array<(names: Map<number, ChannelName>) => void> = [];
  private websocket: WebSocket | null = null;

  constructor() {
    this.loadChannelNames();
  }

  private loadChannelNames(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: ChannelName[] = JSON.parse(stored);
        this.channelNames = new Map(data.map(ch => [ch.channel, ch]));
        console.log(`🏷️ Loaded ${data.length} channel names`);
      }
    } catch (error) {
      console.error('Failed to load channel names:', error);
    }
  }

  private saveChannelNames(): void {
    try {
      const data = Array.from(this.channelNames.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save channel names:', error);
    }
  }

  public setChannelName(channel: number, name: string, color?: number): void {
    this.channelNames.set(channel, { channel, name, color });
    this.saveChannelNames();
    
    // Send to mixer via WebSocket
    this.sendToMixer(channel, name);
    
    // Send color to mixer if specified
    if (color !== undefined) {
      this.sendColorToMixer(channel, color);
    }
    
    console.log(`🏷️ Set channel ${channel} name: "${name}"${color !== undefined ? ` with color ${color}` : ''}`);
  }

  public getChannelName(channel: number): string {
    return this.channelNames.get(channel)?.name || `Ch ${channel}`;
  }

  public getChannelColor(channel: number): number | undefined {
    return this.channelNames.get(channel)?.color;
  }

  public getAllChannelNames(): Map<number, ChannelName> {
    return new Map(this.channelNames);
  }

  public clearChannelName(channel: number): void {
    this.channelNames.delete(channel);
    this.saveChannelNames();
    
    // Reset to default on mixer
    this.sendToMixer(channel, `Ch ${channel}`);
    
    console.log(`🏷️ Cleared channel ${channel} name`);
  }

  public clearAllChannelNames(): void {
    this.channelNames.clear();
    this.saveChannelNames();
    console.log('🏷️ Cleared all channel names');
  }

  public connectToMixer(websocket: WebSocket): void {
    this.websocket = websocket;
    console.log('🏷️ Connected channel naming to mixer WebSocket');

    // Sync all current names to mixer
    this.syncAllToMixer();
  }

  public disconnect(): void {
    this.websocket = null;
    console.log('🏷️ Disconnected channel naming from mixer');
  }

  private sendToMixer(channel: number, name: string): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.warn('🏷️ Cannot send to mixer: WebSocket not connected');
      return;
    }

    // X-Air OSC command to set channel name
    // Format: /ch/XX/config/name "name"
    const paddedChannel = String(channel).padStart(2, '0');
    const command = {
      type: 'set-channel-name',
      channel: channel,
      name: name,
      oscCommand: `/ch/${paddedChannel}/config/name`,
      value: name,
    };

    try {
      this.websocket.send(JSON.stringify(command));
      console.log(`🏷️ Sent channel ${channel} name to mixer: "${name}"`);
    } catch (error) {
      console.error('🏷️ Failed to send channel name to mixer:', error);
    }
  }

  private sendColorToMixer(channel: number, color: number): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.warn('🎨 Cannot send color to mixer: WebSocket not connected');
      return;
    }

    // X-Air OSC command to set channel color
    // Format: /ch/XX/config/color with integer value 0-15
    const paddedChannel = String(channel).padStart(2, '0');
    const command = {
      type: 'osc',
      address: `/ch/${paddedChannel}/config/color`,
      args: [{ type: 'i', value: color }],
    };

    try {
      this.websocket.send(JSON.stringify(command));
      console.log(`🎨 Sent channel ${channel} color to mixer: ${color}`);
    } catch (error) {
      console.error('🎨 Failed to send channel color to mixer:', error);
    }
  }

  private syncAllToMixer(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.channelNames.forEach((channelName) => {
      this.sendToMixer(channelName.channel, channelName.name);
    });

    console.log(`🏷️ Synced ${this.channelNames.size} channel names to mixer`);
  }

  public async syncFromMixer(): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.warn('🏷️ Cannot sync from mixer: WebSocket not connected');
      return;
    }

    // Request channel names from mixer
    const command = {
      type: 'get-channel-names',
      oscCommand: 'get-all-channel-names',
    };

    try {
      this.websocket.send(JSON.stringify(command));
      console.log('🏷️ Requested channel names from mixer');
    } catch (error) {
      console.error('🏷️ Failed to request channel names from mixer:', error);
    }
  }

  public handleMixerResponse(data: { type: string; channel?: number; name?: string; channels?: Array<{ channel: number; name: string }> }): void {
    if (data.type === 'channel-name' && data.channel && data.name !== undefined) {
      // Update local storage with mixer's channel name
      const existingColor = this.channelNames.get(data.channel)?.color;
      this.channelNames.set(data.channel, {
        channel: data.channel,
        name: data.name,
        color: existingColor, // Preserve color
      });
      this.saveChannelNames();
      console.log(`🏷️ Received channel ${data.channel} name from mixer: "${data.name}"`);
    } else if (data.type === 'all-channel-names') {
      // Bulk update from mixer
      data.channels.forEach((ch: { channel: number; name: string }) => {
        const existingColor = this.channelNames.get(ch.channel)?.color;
        this.channelNames.set(ch.channel, {
          channel: ch.channel,
          name: ch.name,
          color: existingColor,
        });
      });
      this.saveChannelNames();
      console.log(`🏷️ Received ${data.channels.length} channel names from mixer`);
    }
  }

  public onChange(callback: (names: Map<number, ChannelName>) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.getAllChannelNames()));
  }

  // Bulk operations
  public importChannelNames(names: ChannelName[]): void {
    names.forEach(ch => {
      this.channelNames.set(ch.channel, ch);
    });
    this.saveChannelNames();
    this.syncAllToMixer();
    console.log(`🏷️ Imported ${names.length} channel names`);
  }

  public exportChannelNames(): ChannelName[] {
    return Array.from(this.channelNames.values());
  }
}

export const channelNamingService = new ChannelNamingService();
