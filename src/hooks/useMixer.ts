import { useState, useEffect, useCallback } from 'react';
import { XAirWebSocket, FaderData, MuteData, OSCBridgeConfig } from '@/services/xairWebSocket';
import { faderMappingService } from '@/services/faderMappingService';
import { vuMeterService, VUMeterData } from '@/services/vuMeterService';
import { SettingsService, ChannelNameMap } from '@/services/settingsService';

interface MixerConfig {
  ip: string;
  port?: number;
  model: 'X-Air 16' | 'X-Air 18';
}

export const useMixer = (config: MixerConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [mixerValidated, setMixerValidated] = useState(false);
  const [mixerStatusMessage, setMixerStatusMessage] = useState('');
  const [faderValues, setFaderValues] = useState<Record<number, number>>({});
  const [muteStates, setMuteStates] = useState<Record<number, boolean>>({});
  const [faderStates, setFaderStates] = useState<Record<number, { isActive: boolean; commandExecuted: boolean }>>({});
  const [vuLevels, setVuLevels] = useState<Record<number, number>>({});
  const [channelNames, setChannelNames] = useState<ChannelNameMap>({});
  const [mixer, setMixer] = useState<XAirWebSocket | null>(null);

  // Initialize mixer connection
  useEffect(() => {
    if (!config.ip) return;

    // Cleanup previous mixer if exists
    if (mixer) {
      mixer.disconnect();
    }

    const xairMixer = new XAirWebSocket(config.ip, config.port, config.model);
    setMixer(xairMixer);

    // Reset states for new connection
    setIsConnected(false);
    setMixerValidated(false);
    setMixerStatusMessage('');

    // Subscribe to connection status
    const unsubscribeStatus = xairMixer.onStatusChange(setIsConnected);

    // Subscribe to mixer validation status
    const unsubscribeMixerStatus = xairMixer.onMixerStatus((validated, message) => {
      setMixerValidated(validated);
      setMixerStatusMessage(message);
    });

    // Subscribe to fader updates
    const unsubscribeFader = xairMixer.onFaderUpdate((data: FaderData) => {
      setFaderValues(prev => ({
        ...prev,
        [data.channel]: data.value
      }));

      // Process fader update through mapping service
      faderMappingService.processFaderUpdate(data.channel, data.value);
    });

    // Subscribe to mute updates
    const unsubscribeMute = xairMixer.onMuteUpdate((data: MuteData) => {
      setMuteStates(prev => ({
        ...prev,
        [data.channel]: data.muted
      }));
      // NEW: process mute update for fader mappings
      faderMappingService.processMuteUpdate(data.channel, data.muted);
    });

    // NEW: Subscribe to channel name updates
    const unsubscribeChannelNames = xairMixer.onChannelNameUpdate((channel: number, name: string) => {
      setChannelNames(prev => {
        const updated = { ...prev, [channel]: name };
        // Save to persistent storage
        SettingsService.updateChannelNames(updated);
        
        // Refresh cached channel names for mappings that follow channel names
        setTimeout(() => {
          faderMappingService.refreshFollowedChannelNames();
        }, 100);
        
        return updated;
      });
    });

    // Load existing channel names from storage
    setChannelNames(SettingsService.getAllChannelNames());

    return () => {
      unsubscribeStatus();
      unsubscribeMixerStatus();
      unsubscribeFader();
      unsubscribeMute();
      unsubscribeChannelNames();
      xairMixer.disconnect();
    };
  }, [config.ip, config.port, config.model]);

  // Subscribe to fader mapping status updates
  useEffect(() => {
    faderMappingService.onStatusUpdate((channel, isActive, commandExecuted) => {
      setFaderStates(prev => ({
        ...prev,
        [channel]: { isActive, commandExecuted }
      }));
    });
  }, []);

  // Subscribe to VU meter updates
  useEffect(() => {
    const unsubscribeVU = vuMeterService.onMeterUpdate((data: VUMeterData) => {
      if (data.channels && Array.isArray(data.channels)) {
        const newVuLevels: Record<number, number> = {};
        data.channels.forEach((level, index) => {
          const channel = index + 1; // VU meter channels are 0-indexed, we want 1-indexed
          newVuLevels[channel] = level;
        });
        setVuLevels(newVuLevels);
      }
    });

    // Connect to VU meter service when mixer is connected
    if (isConnected && mixerValidated) {
      vuMeterService.connect().catch(error => {
        console.error('Failed to connect to VU meter service:', error);
      });

      // NEW: Request channel names when mixer is validated
      if (mixer) {
        setTimeout(() => {
          mixer.requestChannelNames();
        }, 1000); // Small delay to ensure mixer is fully ready
      }
    }

    return () => {
      unsubscribeVU();
    };
  }, [isConnected, mixerValidated, mixer]);

  const connect = useCallback(async () => {
    if (!mixer) return false;
    return await mixer.connect();
  }, [mixer]);

  const disconnect = useCallback(() => {
    if (mixer) {
      mixer.disconnect();
      // Reset states when disconnecting
      setIsConnected(false);
      setMixerValidated(false);
      setMixerStatusMessage('');
      setFaderValues({});
      setMuteStates({});
      setFaderStates({});
      setVuLevels({});
    }
    // Also disconnect VU meter service
    vuMeterService.disconnect();
  }, [mixer]);

  const validateMixer = useCallback(() => {
    if (mixer) {
      mixer.validateMixer();
    }
  }, [mixer]);

  const configureBridge = useCallback((bridgeConfig: { bridgeHost: string; bridgePort: number }) => {
    if (mixer) {
      const oscBridgeConfig: OSCBridgeConfig = {
        bridgeHost: bridgeConfig.bridgeHost,
        bridgePort: bridgeConfig.bridgePort,
        mixerIP: config.ip,
        mixerPort: config.port || 10024
      };
      mixer.setBridgeConfig(oscBridgeConfig);
    }
  }, [mixer, config.ip, config.port]);

  const reloadMappings = useCallback(() => {
    faderMappingService.reloadSettings();
  }, []);

  return {
    isConnected,
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    faderStates,
    vuLevels,
    channelNames, // NEW: expose channel names
    connect,
    disconnect,
    validateMixer,
    configureBridge,
    reloadMappings
  };
};
