import { FaderMapping, SettingsService, SpeakerMuteConfig, ChannelNameMap } from './settingsService';
import { RadioSoftwareConfig } from './settingsService';

export interface FaderState {
  channel: number;
  value: number;
  isActive: boolean;
  lastTriggered?: number;
  commandExecuted: boolean;
  muted?: boolean; // Track mute state
}

export class FaderMappingService {
  private faderStates: Map<number, FaderState> = new Map();
  private mappings: FaderMapping[] = [];
  private radioConfig: RadioSoftwareConfig | null = null;
  private speakerMuteConfig: SpeakerMuteConfig | null = null;
  private isSpeakerMuted: boolean = false;
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
    this.speakerMuteConfig = settings.speakerMute.enabled ? settings.speakerMute : null;
    console.log(`🎚️ Loaded ${this.mappings.length} active fader mappings`);
    
    if (this.speakerMuteConfig) {
      console.log(`🔇 Speaker mute enabled for channels: ${this.speakerMuteConfig.triggerChannels.join(', ')}`);
    }

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
      commandExecuted: false,
      muted: false
    };

    const previousValue = currentState.value;
    currentState.value = value;

    // Process speaker mute logic
    this.processSpeakerMute();

    // Find mappings for this channel (using name-based or position-based matching)
    const relevantMappings = this.mappings.filter(mapping => {
      const mappingChannel = this.getMappingChannelByName(mapping);
      
      if (mapping.isStereo) {
        return channel === mappingChannel; // Only consider the primary channel for stereo mappings
      }
      return channel === mappingChannel;
    });

    let isActive = false;
    let commandExecuted = false;

    for (const mapping of relevantMappings) {
      // Check for fade up trigger
      const shouldTriggerFadeUp = this.shouldTriggerFadeUp(mapping, channel, value, previousValue);
      
      // Check for fade down trigger
      const shouldTriggerFadeDown = this.shouldTriggerFadeDown(mapping, channel, value, previousValue);

      // --- Listen to mute logic ---
      let isMuted = false;
      if (mapping.listenToMute) {
        if (typeof currentState.muted === 'boolean') {
          isMuted = currentState.muted;
        }
      }

      if (shouldTriggerFadeUp) {
        // If listenToMute is enabled and currently muted, do NOT run the start command
        if (!(mapping.listenToMute && isMuted)) {
          console.log(`🎚️ Triggering fade UP mapping for channel ${channel}: ${mapping.command}`);
          this.executeCommand(mapping.command);
          commandExecuted = true;
          currentState.lastTriggered = Date.now();
        } else {
          console.log(`⏸️ Fade UP ignored for channel ${channel} (muted, listenToMute enabled)`);
        }
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
      console.log(`📻 Executing ${this.radioConfig.type} command: ${command}`);
      console.log(`📻 Target: ${this.radioConfig.host}:${this.radioConfig.port}`);

      await this.sendRadioCommandThroughBridge(command);

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

  private processSpeakerMute() {
    if (!this.speakerMuteConfig) return;

    // Check if any trigger channels are above threshold
    const shouldMute = this.speakerMuteConfig.triggerChannels.some(channel => {
      const state = this.faderStates.get(channel);
      return state && state.value >= this.speakerMuteConfig!.threshold;
    });

    // Only send command if mute state has changed
    if (shouldMute !== this.isSpeakerMuted) {
      this.isSpeakerMuted = shouldMute;
      
      if (shouldMute) {
        console.log(`🔇 Muting speakers - mic channels active`);
        this.sendSpeakerMuteCommand(true);
      } else {
        console.log(`🔊 Unmuting speakers - no mic channels active`);
        this.sendSpeakerMuteCommand(false);
      }
    }
  }

  private sendSpeakerMuteCommand(mute: boolean) {
    if (!this.speakerMuteConfig || !this.bridgeConnection || this.bridgeConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    let oscCommand: { address: string; args: { type: string; value: number | string }[] };

    if (this.speakerMuteConfig.muteType === 'bus') {
      // Bus mute: /bus/1/mix/on with 0 (mute) or 1 (unmute)
      oscCommand = {
        address: `/bus/${this.speakerMuteConfig.busNumber || 1}/mix/on`,
        args: [{ type: 'i', value: mute ? 0 : 1 }]
      };
    } else {
      // Mute group: /config/mute/1 with 1 (activate) or 0 (deactivate)
      oscCommand = {
        address: `/config/mute/${this.speakerMuteConfig.muteGroupNumber || 1}`,
        args: [{ type: 'i', value: mute ? 1 : 0 }]
      };
    }

    const message = {
      type: 'osc',
      address: oscCommand.address,
      args: oscCommand.args
    };

    this.bridgeConnection.send(JSON.stringify(message));
    console.log(`🔇 Sent speaker ${mute ? 'mute' : 'unmute'} command: ${oscCommand.address}`);
  }

  public getFaderState(channel: number): FaderState | undefined {
    return this.faderStates.get(channel);
  }

  public getActiveMappings(): FaderMapping[] {
    return this.mappings;
  }

  public getAllMappings(): FaderMapping[] {
    return this.mappings;
  }

  public isChannelMapped(channel: number): boolean {
    return this.mappings.some(mapping => {
      const mappingChannel = this.getMappingChannelByName(mapping);
      
      if (mapping.isStereo) {
        return channel === mappingChannel || channel === mappingChannel + 1;
      }
      return channel === mappingChannel;
    });
  }

  public getMappingForChannel(channel: number): FaderMapping | undefined {
    return this.mappings.find(mapping => {
      const mappingChannel = this.getMappingChannelByName(mapping);
      
      if (mapping.isStereo) {
        return channel === mappingChannel || channel === mappingChannel + 1;
      }
      return channel === mappingChannel;
    });
  }

  public getSpeakerMuteStatus(): { enabled: boolean; isMuted: boolean; triggerChannels: number[] } {
    return {
      enabled: !!this.speakerMuteConfig,
      isMuted: this.isSpeakerMuted,
      triggerChannels: this.speakerMuteConfig?.triggerChannels || []
    };
  }

  // Add this new method to process mute changes
  public processMuteUpdate(channel: number, muted: boolean) {
    // Store mute state in faderStates for use in processFaderUpdate
    const state = this.faderStates.get(channel) || { channel, value: 0, isActive: false, commandExecuted: false };
    state.muted = muted;
    this.faderStates.set(channel, state);

    // Find mappings for this channel that listen to mute
    const relevantMappings = this.mappings.filter(
      mapping => mapping.listenToMute && (
        (mapping.isStereo && (channel === mapping.channel || channel === mapping.channel + 1)) ||
        (!mapping.isStereo && channel === mapping.channel)
      )
    );

    for (const mapping of relevantMappings) {
      if (muted) {
        // Mute = Stop command
        if (mapping.fadeDownCommand) {
          this.executeCommand(mapping.fadeDownCommand);
        }
      } else {
        // Unmute = Play command, but only if fader is above 0
        if (mapping.command && state.value > 0) {
          console.log(`🎚️ Unmute triggered start command for channel ${channel} (fader: ${state.value.toFixed(1)}%)`);
          this.executeCommand(mapping.command);
        } else if (mapping.command && state.value === 0) {
          console.log(`⏸️ Unmute ignored for channel ${channel} (fader at 0%)`);
        }
      }
    }
  }

  // NEW: Channel name-based mapping methods
  public findChannelByName(channelName: string): number | null {
    const channelNames = SettingsService.getAllChannelNames();
    for (const [channel, name] of Object.entries(channelNames)) {
      if (name.toLowerCase().trim() === channelName.toLowerCase().trim()) {
        return parseInt(channel);
      }
    }
    return null;
  }

  public getMappingChannelByName(mapping: FaderMapping): number {
    // If followChannelName is enabled and we have a cached name, try to find it
    if (mapping.followChannelName && mapping.channelName) {
      const foundChannel = this.findChannelByName(mapping.channelName);
      if (foundChannel !== null) {
        return foundChannel;
      } else {
        console.warn(`⚠️ Channel with name "${mapping.channelName}" not found, falling back to channel ${mapping.channel}`);
      }
    }
    // Fall back to original channel number
    return mapping.channel;
  }

  public updateMappingWithChannelName(mappingId: string, channelName: string): void {
    SettingsService.updateFaderMapping(mappingId, { channelName });
    this.reloadSettings();
  }

  // NEW: Update mapping to follow channel name and cache the current name
  public setMappingFollowChannelName(mappingId: string, followChannelName: boolean, currentChannelName?: string): void {
    const updates: Partial<FaderMapping> = { 
      followChannelName,
      channelName: followChannelName ? currentChannelName : undefined
    };
    SettingsService.updateFaderMapping(mappingId, updates);
    this.reloadSettings();
  }

  // NEW: Refresh channel names for all mappings that follow channel names
  public refreshFollowedChannelNames(): void {
    const channelNames = SettingsService.getAllChannelNames();
    const settings = SettingsService.loadSettings();
    
    let updated = false;
    settings.faderMappings.forEach(mapping => {
      if (mapping.followChannelName) {
        const currentName = channelNames[mapping.channel];
        if (currentName && currentName !== mapping.channelName) {
          mapping.channelName = currentName;
          updated = true;
        }
      }
    });

    if (updated) {
      SettingsService.updateFaderMappings(settings.faderMappings);
      this.reloadSettings();
    }
  }
}

// Create singleton instance
export const faderMappingService = new FaderMappingService();
