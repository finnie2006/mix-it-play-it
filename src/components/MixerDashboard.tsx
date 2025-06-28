
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { FaderChannel } from '@/components/FaderChannel';
import { RadioSoftwareStatus } from '@/components/RadioSoftwareStatus';

interface MixerDashboardProps {
  isConnected: boolean;
}

export const MixerDashboard: React.FC<MixerDashboardProps> = ({ isConnected }) => {
  const [faderValues, setFaderValues] = useState<Record<number, number>>({});
  const [configuredFaders] = useState([1, 2, 3, 4, 5, 6, 7, 8]);

  useEffect(() => {
    if (!isConnected) return;

    // Simulate real-time fader updates
    const interval = setInterval(() => {
      // In real implementation, this would come from the X-Air API
      const updates: Record<number, number> = {};
      configuredFaders.forEach(channel => {
        // Simulate some fader movement
        updates[channel] = Math.random() * 100;
      });
      setFaderValues(updates);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, configuredFaders]);

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your X-Air 18 mixer to see live fader values and control radio software.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RadioSoftwareStatus />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {configuredFaders.map(channel => (
          <FaderChannel
            key={channel}
            channel={channel}
            value={faderValues[channel] || 0}
            isActive={faderValues[channel] > 50}
          />
        ))}
      </div>
    </div>
  );
};
