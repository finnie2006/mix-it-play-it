import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { FaderChannel } from '@/components/FaderChannel';
import { RadioSoftwareStatus } from '@/components/RadioSoftwareStatus';

interface FaderConfig {
  id: string;
  channel: number;
  enabled: boolean;
  threshold: number;
  action: string;
  radioSoftware: string;
  command: string;
  description: string;
  muteEnabled: boolean;
  muteAction: string;
  muteRadioSoftware: string;
  muteCommand: string;
}

interface MixerDashboardProps {
  isConnected: boolean;
  faderValues?: Record<number, number>;
  muteStates?: Record<number, boolean>;
  testRadioConnection?: (software: 'mAirList' | 'RadioDJ', host?: string, port?: number) => Promise<boolean>;
  mixerModel?: 'X-Air 16' | 'X-Air 18';
  faderConfigs?: FaderConfig[];
}

export const MixerDashboard: React.FC<MixerDashboardProps> = ({ 
  isConnected, 
  faderValues, 
  muteStates = {},
  testRadioConnection, 
  mixerModel,
  faderConfigs = []
}) => {
  // Set channel count based on mixer model
  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;
  const [configuredFaders] = useState(
    Array.from({ length: maxChannels }, (_, i) => i + 1)
  );

  // Helper function to get config for a specific channel
  const getConfigForChannel = (channel: number) => {
    return faderConfigs.find(config => config.channel === channel);
  };

  // Helper function to determine if a fader is active based on its configuration
  const isFaderActive = (channel: number, value: number) => {
    const config = getConfigForChannel(channel);
    if (!config || !config.enabled) {
      return false;
    }
    return value >= config.threshold;
  };

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your {mixerModel} mixer to see live fader values and control radio software.</p>
          <p className="text-sm mt-2">Make sure your mixer is connected to the same network and OSC is enabled.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RadioSoftwareStatus testConnection={testRadioConnection} />
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          {mixerModel} Channels ({maxChannels} channels)
        </h3>
        <p className="text-sm text-slate-400">
          The percentage bars show the current fader positions (0-100%), not input levels.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: maxChannels }, (_, i) => {
          const channel = i + 1;
          const value = faderValues[channel] || 0;
          const isMuted = muteStates[channel] || false;
          const isActive = value > 5; // Consider active if fader is above 5%
          
          // Find matching configuration for this channel
          const config = faderConfigs.find(c => c.channel === channel);
          const channelConfig = config ? {
            action: config.action,
            radioSoftware: config.radioSoftware,
            playerCommand: config.command,
            threshold: config.threshold,
            enabled: config.enabled,
            description: config.description,
            muteEnabled: config.muteEnabled,
            muteAction: config.muteAction,
            muteRadioSoftware: config.muteRadioSoftware,
            muteCommand: config.muteCommand
          } : undefined;

          return (
            <FaderChannel
              key={channel}
              channel={channel}
              value={value}
              isActive={isActive}
              isMuted={isMuted}
              config={channelConfig}
            />
          );
        })}
      </div>
    </div>
  );
};
