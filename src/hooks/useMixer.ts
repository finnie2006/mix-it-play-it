
import { useState, useEffect, useCallback } from 'react';
import { XAirWebSocket, FaderData, OSCBridgeConfig } from '@/services/xairWebSocket';
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
}

const FADER_CONFIG_STORAGE_KEY = 'xair-fader-configurations';

export const useMixer = (config: MixerConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [mixerValidated, setMixerValidated] = useState(false);
  const [mixerStatusMessage, setMixerStatusMessage] = useState('');
  const [faderValues, setFaderValues] = useState<Record<number, number>>({});
  const [mixer, setMixer] = useState<XAirWebSocket | null>(null);
  const [radioService] = useState(() => new RadioSoftwareService());
  const [faderConfigs, setFaderConfigs] = useState<FaderConfig[]>([]);

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

    return () => {
      unsubscribeStatus();
      unsubscribeMixerStatus();
      unsubscribeFader();
      xairMixer.disconnect();
    };
  }, [config.ip, config.port, config.model]);

  const checkFaderTrigger = useCallback((data: FaderData) => {
    const faderConfig = faderConfigs.find(config => 
      config.channel === data.channel && config.enabled
    );

    if (faderConfig && data.value >= faderConfig.threshold) {
      console.log(`🎚️ Fader ${data.channel} at ${data.value.toFixed(1)}% triggered radio command (threshold: ${faderConfig.threshold}%):`, faderConfig.radioCommand);
      
      // Use the radio command directly since it's already in the correct format
      const command: RadioCommand = {
        software: faderConfig.radioCommand.software,
        command: faderConfig.radioCommand.command,
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
        software: config.radioSoftware === 'mairlist' ? 'mAirList' : 'RadioDJ',
        command: config.command,
        host: 'localhost'
      }
    }));
    
    console.log('🔧 Updated fader configurations:', convertedConfigs);
    setFaderConfigs(convertedConfigs);
    
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
    connect,
    disconnect,
    validateMixer,
    configureBridge,
    updateFaderConfig,
    testRadioConnection,
    radioService
  };
};
