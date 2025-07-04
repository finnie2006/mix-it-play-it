
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
  private mappingLastTriggered: Map<string, number> = new Map();

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
        // Check if this mapping was already triggered recently to prevent duplicates
        const lastTriggered = this.mappingLastTriggered.get(mapping.id);
        const now = Date.now();
        
        // Only trigger if it hasn't been triggered in the last 500ms
        if (!lastTriggered || now - lastTriggered > 500) {
          console.log(`🎚️ Triggering mapping for channel ${channel}: ${mapping.command}`);
          this.executeCommand(mapping);
          commandExecuted = true;
          currentState.lastTriggered = now;
          this.mappingLastTriggered.set(mapping.id, now);
        } else {
          console.log(`⏸️ Skipping duplicate trigger for mapping ${mapping.id} (triggered ${now - lastTriggered}ms ago)`);
        }
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
    // For stereo mappings, only trigger on the primary channel (lower numbered channel)
    if (mapping.isStereo && channel !== mapping.channel) {
      return false;
    }

    // Only trigger when crossing the threshold upwards
    const wasAboveThreshold = previousValue >= mapping.threshold;
    const isAboveThreshold = currentValue >= mapping.threshold;

    // For stereo mappings, check both channels
    if (mapping.isStereo) {
      const otherChannelState = this.faderStates.get(mapping.channel + 1);
      const otherChannelValue = otherChannelState?.value || 0;
      const isOtherChannelAboveThreshold = otherChannelValue >= mapping.threshold;
      
      // Trigger if either channel crosses the threshold
      return (!wasAboveThreshold && isAboveThreshold) || 
             (!wasAboveThreshold && isOtherChannelAboveThreshold);
    }

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

      await this.sendRadioCommand(mapping.command);

    } catch (error) {
      console.error('❌ Failed to execute radio command:', error);
    }
  }

  private async sendRadioCommand(command: string): Promise<void> {
    if (!this.radioConfig) {
      throw new Error('Radio configuration not available');
    }

    try {
      console.log(`🔐 Using basic auth with username: ${this.radioConfig.username}`);
      
      const requestBody = new URLSearchParams();
      requestBody.append('command', command);

      console.log(`🌐 Sending POST request to: http://localhost:3001/radio-command`);
      console.log(`📝 Command: ${command}`);

      const response = await fetch('http://localhost:3001/radio-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: this.radioConfig.host,
          port: this.radioConfig.port,
          username: this.radioConfig.username,
          password: this.radioConfig.password,
          command: command
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      console.log(`✅ Radio command executed successfully: ${result}`);

    } catch (error) {
      console.error('❌ Failed to send command to radio software:', error);
      throw error;
    }
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
