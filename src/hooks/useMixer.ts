import { useState, useEffect, useCallback } from 'react';
import { XAirWebSocket, FaderData, MuteData, OSCBridgeConfig } from '@/services/xairWebSocket';
import { RadioSoftwareService, RadioCommand } from '@/services/radioSoftware';

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

const FADER_CONFIG_STORAGE_KEY = 'xair-fader-configurations';

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

  // Load saved fader configurations on mount
  useEffect(() => {
    const savedConfigs = localStorage.getItem(FADER_CONFIG_STORAGE_KEY);
    if (savedConfigs) {
      try {
        const parsedConfigs = JSON.parse(savedConfigs);
        console.log('🔧 Loaded saved fader configurations:', parsedConfigs);
        setFaderConfigs(parsedConfigs);
      } catch (error) {
        console.error('Failed to load saved fader configurations:', error);
      }
    }
  }, []);

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
    
    // Check if we're crossing the threshold from below to above
    const crossedThreshold = currentState.lastValue < faderConfig.threshold && data.value >= faderConfig.threshold;
    
    // Check if we've fallen back below threshold (with small hysteresis to prevent flicker)
    const fellBelowThreshold = currentState.lastValue >= (faderConfig.threshold - 5) && data.value < (faderConfig.threshold - 5);
    
    if (crossedThreshold && !currentState.triggered) {
      console.log(`🎚️ Fader ${data.channel} crossed threshold ${faderConfig.threshold}% -> Sending ${faderConfig.radioCommand.software} command:`, faderConfig.radioCommand.command);
      
      // Use the software selection from the dropdown properly
      const command: RadioCommand = {
        software: faderConfig.radioCommand.software === 'RadioDJ' ? 'RadioDJ' : 'mAirList',
        command: faderConfig.radioCommand.command,
        host: 'localhost'
      };
      
      radioService.sendCommand(command);
      
      // Update trigger state
      setFaderTriggerStates(prev => ({
        ...prev,
        [data.channel]: { triggered: true, lastValue: data.value }
      }));
    } else if (fellBelowThreshold && currentState.triggered) {
      // Reset trigger state when falling below threshold
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
      
      // Use the software selection from the dropdown properly  
      const command: RadioCommand = {
        software: faderConfig.muteCommand.software === 'RadioDJ' ? 'RadioDJ' : 'mAirList',
        command: faderConfig.muteCommand.command,
        host: 'localhost'
      };
      
      radioService.sendCommand(command);
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
    
    console.log('🔧 Updated fader configurations with proper software selection:', convertedConfigs);
    setFaderConfigs(convertedConfigs);
    
    // Reset trigger states when config changes
    setFaderTriggerStates({});
    
    // Save to localStorage
    try {
      localStorage.setItem(FADER_CONFIG_STORAGE_KEY, JSON.stringify(convertedConfigs));
      console.log('💾 Fader configurations saved to localStorage');
    } catch (error) {
      console.error('Failed to save fader configurations:', error);
    }
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
