
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { FaderChannel } from '@/components/FaderChannel';
import { RadioSoftwareStatus } from '@/components/RadioSoftwareStatus';

interface MixerDashboardProps {
  isConnected: boolean;
  faderValues?: Record<number, number>;
  testRadioConnection?: (software: 'mAirList' | 'RadioDJ', host?: string, port?: number) => Promise<boolean>;
  mixerModel?: 'X-Air 16' | 'X-Air 18';
}

export const MixerDashboard: React.FC<MixerDashboardProps> = ({ 
  isConnected, 
  faderValues = {}, 
  testRadioConnection,
  mixerModel = 'X-Air 18'
}) => {
  // Set channel count based on mixer model
  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;
  const [configuredFaders] = useState(
    Array.from({ length: maxChannels }, (_, i) => i + 1)
  );

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {configuredFaders.map(channel => (
          <FaderChannel
            key={channel}
            channel={channel}
            value={faderValues[channel] || 0}
            isActive={(faderValues[channel] || 0) > 50}
          />
        ))}
      </div>
    </div>
  );
};
