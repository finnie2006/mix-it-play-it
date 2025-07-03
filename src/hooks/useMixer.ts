
import { useState, useEffect, useCallback } from 'react';
import { XAirWebSocket, FaderData, MuteData, OSCBridgeConfig } from '@/services/xairWebSocket';

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
  const [mixer, setMixer] = useState<XAirWebSocket | null>(null);

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
    });

    // Subscribe to mute updates
    const unsubscribeMute = xairMixer.onMuteUpdate((data: MuteData) => {
      setMuteStates(prev => ({
        ...prev,
        [data.channel]: data.muted
      }));
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMixerStatus();
      unsubscribeFader();
      unsubscribeMute();
      xairMixer.disconnect();
    };
  }, [config.ip, config.port, config.model]);

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

  return {
    isConnected,
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    connect,
    disconnect,
    validateMixer,
    configureBridge
  };
};
