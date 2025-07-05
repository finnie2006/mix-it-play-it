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
  private bridgeConnection: WebSocket | null = null;
  private radioConfigSent = false;

  constructor() {
    this.loadSettings();
    this.connectToBridge();
  }

  private connectToBridge() {
    try {
      this.bridgeConnection = new WebSocket('ws://localhost:8080');

      this.bridgeConnection.onopen = () => {
        console.log('📻 Connected to bridge for radio commands');
        this.sendRadioConfigToBridge();
      };

      this.bridgeConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'radio_command_result') {
            if (message.success) {
              console.log(`✅ Radio command executed successfully: ${message.command}`);
              console.log(`📋 Response (${message.statusCode}): ${message.response}`);
            } else {
              console.error(`❌ Radio command failed: ${message.command} - ${message.error}`);
            }
          } else if (message.type === 'radio_config_updated') {
            console.log('📻 Radio configuration updated on bridge server');
            this.radioConfigSent = true;
          }
        } catch (error) {
          console.error('❌ Error parsing bridge message:', error);
        }
      };

      this.bridgeConnection.onclose = () => {
        console.log('❌ Bridge connection closed, attempting to reconnect...');
        this.radioConfigSent = false;
        setTimeout(() => this.connectToBridge(), 3000);
      };

      this.bridgeConnection.onerror = (error) => {
        console.error('❌ Bridge connection error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to bridge:', error);
      setTimeout(() => this.connectToBridge(), 3000);
    }
  }

  private sendRadioConfigToBridge() {
    if (this.bridgeConnection?.readyState === WebSocket.OPEN && this.radioConfig && !this.radioConfigSent) {
      const message = {
        type: 'radio_config',
        config: this.radioConfig
      };

      this.bridgeConnection.send(JSON.stringify(message));
      console.log('📻 Sent radio config to bridge server');
    }
  }

  private loadSettings() {
    const settings = SettingsService.loadSettings();
    this.mappings = settings.faderMappings.filter(m => m.enabled);
    this.radioConfig = settings.radioSoftware.enabled ? settings.radioSoftware : null;
    console.log(`🎚️ Loaded ${this.mappings.length} active fader mappings`);

    // Send updated config to bridge if connected
    this.radioConfigSent = false;
    this.sendRadioConfigToBridge();
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
        return channel === mapping.channel; // Only consider the primary channel for stereo mappings
      }
      return channel === mapping.channel;
    });

    let isActive = false;
    let commandExecuted = false;

    for (const mapping of relevantMappings) {
      // Check for fade up trigger
      const shouldTriggerFadeUp = this.shouldTriggerFadeUp(mapping, channel, value, previousValue);
      
      // Check for fade down trigger
      const shouldTriggerFadeDown = this.shouldTriggerFadeDown(mapping, channel, value, previousValue);

      if (shouldTriggerFadeUp) {
        console.log(`🎚️ Triggering fade UP mapping for channel ${channel}: ${mapping.command}`);
        this.executeCommand(mapping.command);
        commandExecuted = true;
        currentState.lastTriggered = Date.now();
      }

      if (shouldTriggerFadeDown && mapping.fadeDownCommand) {
        console.log(`🎚️ Triggering fade DOWN mapping for channel ${channel}: ${mapping.fadeDownCommand}`);
        this.executeCommand(mapping.fadeDownCommand);
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

  private shouldTriggerFadeUp(mapping: FaderMapping, channel: number, currentValue: number, previousValue: number): boolean {
    // Only trigger when crossing the threshold upwards
    const wasAboveThreshold = previousValue >= mapping.threshold;
    const isAboveThreshold = currentValue >= mapping.threshold;

    // Trigger when going from below threshold to above threshold
    return !wasAboveThreshold && isAboveThreshold;
  }

  private shouldTriggerFadeDown(mapping: FaderMapping, channel: number, currentValue: number, previousValue: number): boolean {
    if (!mapping.fadeDownThreshold || !mapping.fadeDownCommand) {
      return false;
    }

    // Only trigger when crossing the fade down threshold downwards
    const wasAboveFadeDownThreshold = previousValue >= mapping.fadeDownThreshold;
    const isBelowFadeDownThreshold = currentValue < mapping.fadeDownThreshold;

    // Trigger when going from above fade down threshold to below fade down threshold
    return wasAboveFadeDownThreshold && isBelowFadeDownThreshold;
  }

  private formatRadioDJCommand(command: string): string {
    if (!this.radioConfig || this.radioConfig.type !== 'radiodj') {
      return command;
    }

    // Format RadioDJ command as HTTP GET URL
    // Structure: http://[URL/IP]:[PORT]/opt?auth=[password]&command=[command]&arg=[argument]
    const baseUrl = `http://${this.radioConfig.host}:${this.radioConfig.port}/opt`;
    const password = this.radioConfig.password || '';
    
    // Parse command to extract command and argument
    const parts = command.trim().split(' ');
    const cmd = parts[0];
    const arg = parts.slice(1).join(' ');
    
    let url = `${baseUrl}?command=${encodeURIComponent(cmd)}`;
    
    if (password) {
      url += `&auth=${encodeURIComponent(password)}`;
    }
    
    if (arg) {
      url += `&arg=${encodeURIComponent(arg)}`;
    }
    
    return url;
  }

  private async executeCommand(command: string) {
    if (!this.radioConfig) {
      console.warn('⚠️ Radio software not configured, cannot execute command');
      return;
    }

    if (!this.bridgeConnection || this.bridgeConnection.readyState !== WebSocket.OPEN) {
      console.error('❌ Bridge connection not available for radio command');
      return;
    }

    try {
      let formattedCommand = command;
      
      // Format command based on radio software type
      if (this.radioConfig.type === 'radiodj') {
        formattedCommand = this.formatRadioDJCommand(command);
        console.log(`📻 Executing RadioDJ HTTP command: ${formattedCommand}`);
      } else {
        console.log(`📻 Executing ${this.radioConfig.type} command: ${command}`);
      }
      
      console.log(`📻 Target: ${this.radioConfig.host}:${this.radioConfig.port}`);

      await this.sendRadioCommandThroughBridge(formattedCommand);

    } catch (error) {
      console.error('❌ Failed to execute radio command:', error);
    }
  }

  private async sendRadioCommandThroughBridge(command: string): Promise<void> {
    if (!this.bridgeConnection || this.bridgeConnection.readyState !== WebSocket.OPEN) {
      throw new Error('Bridge connection not available');
    }

    const message = {
      type: 'radio_command',
      command: command
    };

    this.bridgeConnection.send(JSON.stringify(message));
    console.log(`🌐 Sent command to bridge: ${command}`);
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
