
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ClockDisplay } from '@/components/ClockDisplay';
import { VUMeter } from '@/components/VUMeter';
import { metersService, MeterData } from '@/services/metersService';
import { faderMappingService } from '@/services/faderMappingService';
import { Activity, Volume2 } from 'lucide-react';

interface MetersDashboardProps {
  isConnected: boolean;
  mixerModel?: 'X-Air 16' | 'X-Air 18';
}

export const MetersDashboard: React.FC<MetersDashboardProps> = ({ 
  isConnected, 
  mixerModel 
}) => {
  const [meterData, setMeterData] = useState<MeterData[]>([]);
  const [mappedChannels, setMappedChannels] = useState<number[]>([]);

  useEffect(() => {
    // Get mapped channels from fader mapping service
    const activeMappings = faderMappingService.getActiveMappings();
    const channels = activeMappings.map(mapping => mapping.channel);
    setMappedChannels(channels);
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = metersService.onMeterUpdate((data: MeterData[]) => {
      setMeterData(data);
    });

    return unsubscribe;
  }, [isConnected]);

  // Get master/program level (typically the last channel in meters)
  const getMasterLevel = () => {
    if (meterData.length === 0) return -60;
    // For X-Air mixers, the master is typically at the end of the meter array
    const masterIndex = mixerModel === 'X-Air 16' ? 15 : 17; // Adjust based on mixer model
    return meterData[masterIndex]?.level || -60;
  };

  // Get levels for mapped channels
  const getMappedChannelLevels = () => {
    return mappedChannels.map(channel => {
      const channelData = meterData.find(data => data.channel === channel);
      return {
        channel,
        level: channelData?.level || -60,
        mapping: faderMappingService.getMappingForChannel(channel)
      };
    });
  };

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <Activity className="mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Meters Not Available</h3>
          <p>Connect to your {mixerModel} mixer to see live meter data.</p>
          <p className="text-sm mt-2">Make sure the OSC bridge server is running and configured.</p>
        </div>
      </Card>
    );
  }

  const mappedChannelLevels = getMappedChannelLevels();

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Volume2 className="text-green-400" size={20} />
          Audio Meters Dashboard
        </h3>
        <p className="text-sm text-slate-400">
          Live audio levels from {mixerModel} - Master output and mapped channels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Clock Display */}
        <div className="lg:col-span-1">
          <ClockDisplay />
        </div>

        {/* Master/Program Level */}
        <div className="lg:col-span-1">
          <VUMeter 
            label="MASTER"
            level={getMasterLevel()}
            isProgram={true}
          />
        </div>

        {/* Mapped Channel Levels */}
        {mappedChannelLevels.map(({ channel, level, mapping }) => (
          <div key={channel} className="lg:col-span-1">
            <VUMeter 
              label={mapping?.label || `CH ${channel}`}
              level={level}
            />
          </div>
        ))}

        {/* Show message if no channels are mapped */}
        {mappedChannelLevels.length === 0 && (
          <div className="lg:col-span-2">
            <Card className="p-6 bg-slate-800/50 border-slate-700 text-center">
              <div className="text-slate-400">
                <Volume2 className="mx-auto mb-3" size={32} />
                <h4 className="font-semibold mb-2">No Mapped Channels</h4>
                <p className="text-sm">
                  Configure fader mappings in the Configuration tab to see channel meters here.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <Card className="p-4 bg-slate-800/30 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              metersService.isServiceConnected() ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-sm text-slate-300">
              Meters Service: {metersService.isServiceConnected() ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {meterData.length > 0 ? `${meterData.length} channels` : 'No data'}
          </div>
        </div>
      </Card>
    </div>
  );
};
