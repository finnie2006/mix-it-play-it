
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { FaderChannel } from '@/components/FaderChannel';
import { RadioSoftwareStatus } from '@/components/RadioSoftwareStatus';

interface MixerDashboardProps {
  isConnected: boolean;
  faderValues?: Record<number, number>;
  testRadioConnection?: (software: 'mAirList' | 'RadioDJ', host?: string, port?: number) => Promise<boolean>;
}

export const MixerDashboard: React.FC<MixerDashboardProps> = ({ 
  isConnected, 
  faderValues = {}, 
  testRadioConnection 
}) => {
  const [configuredFaders] = useState([1, 2, 3, 4, 5, 6, 7, 8]);

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your X-Air 18 mixer to see live fader values and control radio software.</p>
          <p className="text-sm mt-2">Make sure your mixer is connected to the same network and OSC is enabled.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RadioSoftwareStatus testConnection={testRadioConnection} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
