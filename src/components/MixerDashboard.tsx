
import React from 'react';
import { Card } from '@/components/ui/card';
import { FaderChannel } from '@/components/FaderChannel';

interface MixerDashboardProps {
  isConnected: boolean;
  faderValues?: Record<number, number>;
  muteStates?: Record<number, boolean>;
  faderStates?: Record<number, { isActive: boolean; commandExecuted: boolean }>;
  vuLevels?: Record<number, number>;
  mixerModel?: 'X-Air 16' | 'X-Air 18';
  onConfigureChannel?: (channel: number) => void;
}

export const MixerDashboard: React.FC<MixerDashboardProps> = ({ 
  isConnected, 
  faderValues, 
  muteStates = {},
  faderStates = {},
  vuLevels = {},
  mixerModel,
  onConfigureChannel
}) => {
  // Set channel count based on mixer model
  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your {mixerModel} mixer to see live fader values.</p>
          <p className="text-sm mt-2">Make sure your mixer is connected to the same network and OSC is enabled.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          {mixerModel} Channels ({maxChannels} channels)
        </h3>
        <p className="text-sm text-slate-400">
          The percentage bars show the current fader positions. Mapped faders will trigger radio commands at their threshold.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: maxChannels }, (_, i) => {
          const channel = i + 1;
          const value = faderValues[channel] || 0;
          const isMuted = muteStates[channel] || false;
          const faderState = faderStates[channel];
          const isActive = faderState?.isActive || value > 5;
          const commandExecuted = faderState?.commandExecuted || false;
          const vuLevel = vuLevels[channel] || -90;

          return (
            <FaderChannel
              key={channel}
              channel={channel}
              value={value}
              isActive={isActive}
              isMuted={isMuted}
              commandExecuted={commandExecuted}
              vuLevel={vuLevel}
              onConfigureClick={onConfigureChannel}
            />
          );
        })}
      </div>
    </div>
  );
};
