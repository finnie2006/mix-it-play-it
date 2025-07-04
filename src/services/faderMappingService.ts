
import { FaderMapping, SettingsService } from './settingsService';
import { RadioSoftwareConfig } from './settingsService';

export interface FaderState {
  channel: number;
  value: number;
  isActive: boolean;
  lastTriggered?: number;
  commandExecuted: boolean;
}

export class FaderMappingService {
  private faderStates: Map<number, FaderState> = new Map();
  private mappings: FaderMapping[] = [];
  private radioConfig: RadioSoftwareConfig | null = null;
  private statusUpdateCallback?: (channel: number, isActive: boolean, commandExecuted: boolean) => void;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const settings = SettingsService.loadSettings();
    this.mappings = settings.faderMappings.filter(m => m.enabled);
    this.radioConfig = settings.radioSoftware.enabled ? settings.radioSoftware : null;
    console.log(`🎚️ Loaded ${this.mappings.length} active fader mappings`);
  }

  public reloadSettings() {
    this.loadSettings();
  }

  public onStatusUpdate(callback: (channel: number, isActive: boolean, commandExecuted: boolean) => void) {
    this.statusUpdateCallback = callback;
  }

  public processFaderUpdate(channel: number, value: number) {
    // Update fader state
    const currentState = this.faderStates.get(channel) || {
      channel,
      value: 0,
      isActive: false,
      commandExecuted: false
    };

    const previousValue = currentState.value;
    currentState.value = value;

    // Find mappings for this channel
    const relevantMappings = this.mappings.filter(mapping => {
      if (mapping.isStereo) {
        return channel === mapping.channel || channel === mapping.channel + 1;
      }
      return channel === mapping.channel;
    });

    let isActive = false;
    let commandExecuted = false;

    for (const mapping of relevantMappings) {
      const shouldTrigger = this.shouldTriggerMapping(mapping, channel, value, previousValue);
      
      if (shouldTrigger) {
        console.log(`🎚️ Triggering mapping for channel ${channel}: ${mapping.command}`);
        this.executeCommand(mapping);
        commandExecuted = true;
        currentState.lastTriggered = Date.now();
      }

      // Check if fader is above threshold (active state)
      if (value >= mapping.threshold) {
        isActive = true;
      }
    }

    currentState.isActive = isActive;
    currentState.commandExecuted = commandExecuted;
    this.faderStates.set(channel, currentState);

    // Notify status update
    if (this.statusUpdateCallback && relevantMappings.length > 0) {
      this.statusUpdateCallback(channel, isActive, commandExecuted);
    }
  }

  private shouldTriggerMapping(mapping: FaderMapping, channel: number, currentValue: number, previousValue: number): boolean {
    // Only trigger when crossing the threshold upwards
    const wasAboveThreshold = previousValue >= mapping.threshold;
    const isAboveThreshold = currentValue >= mapping.threshold;
    
    // Trigger when going from below threshold to above threshold
    return !wasAboveThreshold && isAboveThreshold;
  }

  private async executeCommand(mapping: FaderMapping) {
    if (!this.radioConfig) {
      console.warn('⚠️ Radio software not configured, cannot execute command');
      return;
    }

    try {
      console.log(`📻 Executing ${this.radioConfig.type} command: ${mapping.command}`);
      console.log(`📻 Target: ${this.radioConfig.host}:${this.radioConfig.port}`);
      
      if (this.radioConfig.type === 'mairlist') {
        await this.executeMairListCommand(mapping.command);
      } else if (this.radioConfig.type === 'radiodj') {
        await this.executeRadioDJCommand(mapping.command);
      }
      
    } catch (error) {
      console.error('❌ Failed to execute radio command:', error);
    }
  }

  private async executeMairListCommand(command: string): Promise<void> {
    if (!this.radioConfig) return;

    const url = `http://${this.radioConfig.host}:${this.radioConfig.port}/execute`;
    const body = `command=${encodeURIComponent(command)}`;
    
    // Create basic auth header if username/password provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.radioConfig.username && this.radioConfig.password) {
      const credentials = btoa(`${this.radioConfig.username}:${this.radioConfig.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
      console.log(`🔐 Using basic auth for user: ${this.radioConfig.username}`);
    }

    console.log(`📡 Sending POST to: ${url}`);
    console.log(`📡 Body: ${body}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(`✅ mAirList command executed successfully: ${command}`);
    console.log(`📡 Response: ${responseText}`);
  }

  private async executeRadioDJCommand(command: string): Promise<void> {
    // RadioDJ implementation would go here
    // For now, just log it
    console.log(`📻 RadioDJ command would be executed: ${command}`);
  }

  public getFaderState(channel: number): FaderState | undefined {
    return this.faderStates.get(channel);
  }

  public getActiveMappings(): FaderMapping[] {
    return this.mappings;
  }

  public isChannelMapped(channel: number): boolean {
    return this.mappings.some(mapping => {
      if (mapping.isStereo) {
        return channel === mapping.channel || channel === mapping.channel + 1;
      }
      return channel === mapping.channel;
    });
  }

  public getMappingForChannel(channel: number): FaderMapping | undefined {
    return this.mappings.find(mapping => {
      if (mapping.isStereo) {
        return channel === mapping.channel || channel === mapping.channel + 1;
      }
      return channel === mapping.channel;
    });
  }
}

// Create singleton instance
export const faderMappingService = new FaderMappingService();
