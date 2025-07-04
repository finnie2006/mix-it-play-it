
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
      // For now, we'll simulate the command execution and log it
      // In a real implementation, this would send the command to the radio software
      console.log(`📻 Executing ${this.radioConfig.type} command: ${mapping.command}`);
      console.log(`📻 Target: ${this.radioConfig.host}:${this.radioConfig.port}`);
      
      // Simulate command execution with a fake HTTP request
      // In real implementation, you'd integrate with mAirList API or RadioDJ API
      await this.simulateRadioCommand(mapping.command);
      
    } catch (error) {
      console.error('❌ Failed to execute radio command:', error);
    }
  }

  private async simulateRadioCommand(command: string): Promise<void> {
    // This simulates sending a command to radio software
    // Replace this with actual API calls to mAirList or RadioDJ
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`✅ Command executed successfully: ${command}`);
        resolve();
      }, 100);
    });
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
