import { useState, useEffect, useCallback } from 'react';
import { XAirWebSocket, FaderData, MuteData, OSCBridgeConfig } from '@/services/xairWebSocket';
import { RadioSoftwareService, RadioCommand } from '@/services/radioSoftware';
import { SettingsService, FaderMappingConfig } from '@/services/settingsService';

interface MixerConfig {
  ip: string;
  port?: number;
  model: 'X-Air 16' | 'X-Air 18';
}

interface FaderConfig {
  channel: number;
  threshold: number;
  radioCommand: RadioCommand;
  enabled: boolean;
  muteCommand?: RadioCommand;
  muteEnabled?: boolean;
}

interface FaderTriggerState {
  [channel: number]: {
    triggered: boolean;
    lastValue: number;
  };
}

export const useMixer = (config: MixerConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [mixerValidated, setMixerValidated] = useState(false);
  const [mixerStatusMessage, setMixerStatusMessage] = useState('');
  const [faderValues, setFaderValues] = useState<Record<number, number>>({});
  const [muteStates, setMuteStates] = useState<Record<number, boolean>>({});
  const [mixer, setMixer] = useState<XAirWebSocket | null>(null);
  const [radioService] = useState(() => new RadioSoftwareService());
  const [faderConfigs, setFaderConfigs] = useState<FaderConfig[]>([]);
  const [faderTriggerStates, setFaderTriggerStates] = useState<FaderTriggerState>({});
  const settingsService = SettingsService.getInstance();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      // Load fader mappings
      const savedMappings = settingsService.getFaderMappings();
      console.log('🔧 Loading fader mappings from settings:', savedMappings);
      
      if (savedMappings.length > 0) {
        const convertedConfigs: FaderConfig[] = savedMappings.map(mapping => ({
          channel: mapping.channel,
          threshold: mapping.threshold,
          enabled: mapping.enabled,
          radioCommand: {
            software: mapping.radioSoftware === 'RadioDJ' ? 'RadioDJ' : 'mAirList',
            command: mapping.command,
            host: 'localhost'
          },
          muteEnabled: mapping.muteEnabled || false,
          muteCommand: mapping.muteCommand ? {
            software: mapping.muteRadioSoftware === 'RadioDJ' ? 'RadioDJ' : 'mAirList',
            command: mapping.muteCommand,
            host: 'localhost'
          } : undefined
        }));
        
        setFaderConfigs(convertedConfigs);
      }

      // Load radio software config and set credentials
      const radioConfig = settingsService.getRadioSoftwareConfig();
      if (radioConfig.mairlist && radioConfig.mairlist.username && radioConfig.mairlist.password) {
        console.log('🔧 Loading mAirList credentials on startup');
        radioService.setMairListCredentials(radioConfig.mairlist.username, radioConfig.mairlist.password);
      }
    };

    loadSettings();
  }, [radioService, settingsService]);

  // Initialize mixer connection
  useEffect(() => {
    if (!config.ip) return;

    const xairMixer = new XAirWebSocket(config.ip, config.port, config.model);
    setMixer(xairMixer);

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

      // Check if this fader should trigger a radio command
      checkFaderTrigger(data);
    });

    // Subscribe to mute updates
    const unsubscribeMute = xairMixer.onMuteUpdate((data: MuteData) => {
      setMuteStates(prev => ({
        ...prev,
        [data.channel]: data.muted
      }));

      // Check if this mute should trigger a radio command
      checkMuteTrigger(data);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMixerStatus();
      unsubscribeFader();
      unsubscribeMute();
      xairMixer.disconnect();
    };
  }, [config.ip, config.port, config.model]);

  const checkFaderTrigger = useCallback((data: FaderData) => {
    const faderConfig = faderConfigs.find(config => 
      config.channel === data.channel && config.enabled
    );

    if (!faderConfig) return;

    const currentState = faderTriggerStates[data.channel] || { triggered: false, lastValue: 0 };
    
    // Check if we're crossing the threshold from below to above (with 2% hysteresis)
    const crossedThreshold = currentState.lastValue < (faderConfig.threshold - 2) && data.value >= faderConfig.threshold;
    
    // Check if we've fallen back below threshold (with hysteresis to prevent flicker)
    const fellBelowThreshold = currentState.lastValue >= faderConfig.threshold && data.value < (faderConfig.threshold - 5);
    
    if (crossedThreshold && !currentState.triggered) {
      console.log(`🎚️ Fader ${data.channel} crossed threshold ${faderConfig.threshold}% -> Sending ${faderConfig.radioCommand.software} command:`, faderConfig.radioCommand.command);
      
      radioService.sendCommand(faderConfig.radioCommand);
      
      // Update trigger state
      setFaderTriggerStates(prev => ({
        ...prev,
        [data.channel]: { triggered: true, lastValue: data.value }
      }));
    } else if (fellBelowThreshold && currentState.triggered) {
      // Reset trigger state when falling below threshold
      console.log(`🎚️ Fader ${data.channel} fell below threshold, resetting trigger state`);
      setFaderTriggerStates(prev => ({
        ...prev,
        [data.channel]: { triggered: false, lastValue: data.value }
      }));
    } else {
      // Just update the last value without changing trigger state
      setFaderTriggerStates(prev => ({
        ...prev,
        [data.channel]: { ...currentState, lastValue: data.value }
      }));
    }
  }, [faderConfigs, radioService, faderTriggerStates]);

  const checkMuteTrigger = useCallback((data: MuteData) => {
    const faderConfig = faderConfigs.find(config => 
      config.channel === data.channel && config.muteEnabled
    );

    if (faderConfig && faderConfig.muteCommand) {
      console.log(`🔇 Channel ${data.channel} ${data.muted ? 'MUTED' : 'UNMUTED'} -> Sending ${faderConfig.muteCommand.software} command:`, faderConfig.muteCommand.command);
      
      radioService.sendCommand(faderConfig.muteCommand);
    }
  }, [faderConfigs, radioService]);

  const connect = useCallback(async () => {
    if (!mixer) return false;
    return await mixer.connect();
  }, [mixer]);

  const disconnect = useCallback(() => {
    if (mixer) {
      mixer.disconnect();
    }
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

  const updateFaderConfig = useCallback((configs: any[]) => {
    // Convert the configuration format to match our FaderConfig interface
    const convertedConfigs: FaderConfig[] = configs.map(config => ({
      channel: config.channel,
      threshold: config.threshold,
      enabled: config.enabled,
      radioCommand: {
        software: config.radioSoftware === 'RadioDJ' ? 'RadioDJ' : 'mAirList',
        command: config.command,
        host: 'localhost'
      },
      muteEnabled: config.muteEnabled || false,
      muteCommand: config.muteCommand ? {
        software: config.muteRadioSoftware === 'RadioDJ' ? 'RadioDJ' : 'mAirList',
        command: config.muteCommand,
        host: 'localhost'
      } : undefined
    }));
    
    console.log('🔧 Updated fader configurations:', convertedConfigs);
    setFaderConfigs(convertedConfigs);
    
    // Reset trigger states when config changes
    setFaderTriggerStates({});
  }, []);

  const testRadioConnection = useCallback(async (
    software: 'mAirList' | 'RadioDJ', 
    host: string = 'localhost', 
    port?: number
  ) => {
    return await radioService.testConnection(software, host, port);
  }, [radioService]);

  return {
    isConnected,
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    connect,
    disconnect,
    validateMixer,
    configureBridge,
    updateFaderConfig,
    testRadioConnection,
    radioService
  };
};
