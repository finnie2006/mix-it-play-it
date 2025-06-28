
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

export const useMixer = (config: MixerConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [faderValues, setFaderValues] = useState<Record<number, number>>({});
  const [mixer, setMixer] = useState<XAirWebSocket | null>(null);
  const [radioService] = useState(() => new RadioSoftwareService());
  const [faderConfigs, setFaderConfigs] = useState<FaderConfig[]>([]);

  // Initialize mixer connection
  useEffect(() => {
    if (!config.ip) return;

    const xairMixer = new XAirWebSocket(config.ip, config.port, config.model);
    setMixer(xairMixer);

    // Subscribe to connection status
    const unsubscribeStatus = xairMixer.onStatusChange(setIsConnected);

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
      unsubscribeFader();
      xairMixer.disconnect();
    };
  }, [config.ip, config.port, config.model]);

  const checkFaderTrigger = useCallback((data: FaderData) => {
    const faderConfig = faderConfigs.find(config => 
      config.channel === data.channel && config.enabled
    );

    if (faderConfig && data.value >= faderConfig.threshold) {
      console.log(`Fader ${data.channel} triggered radio command:`, faderConfig.radioCommand);
      radioService.sendCommand(faderConfig.radioCommand);
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

  const updateFaderConfig = useCallback((configs: FaderConfig[]) => {
    setFaderConfigs(configs);
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
    faderValues,
    connect,
    disconnect,
    configureBridge,
    updateFaderConfig,
    testRadioConnection,
    radioService
  };
};
