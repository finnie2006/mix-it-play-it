
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, BarChart3 } from 'lucide-react';
import { faderMappingService } from '@/services/faderMappingService';

interface MeterData {
  channel: number;
  level: number;
  description?: string;
}

interface MetersDashboardProps {
  isConnected: boolean;
}

export const MetersDashboard: React.FC<MetersDashboardProps> = ({ isConnected }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [meterData, setMeterData] = useState<MeterData[]>([]);
  const [programLevel, setProgramLevel] = useState({ left: -60, right: -60 });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mock meter data for now - will be replaced with actual OSC data
  useEffect(() => {
    if (!isConnected) return;

    // Get mapped channels from fader mapping service
    const mappedChannels = faderMappingService.getActiveMappings().map(mapping => ({
      channel: mapping.channel,
      level: Math.random() * -60, // Random level for demo
      description: mapping.description
    }));

    setMeterData(mappedChannels);

    // Mock program levels
    const interval = setInterval(() => {
      setProgramLevel({
        left: Math.random() * -60,
        right: Math.random() * -60
      });

      // Update mapped channel levels
      const updatedChannels = mappedChannels.map(ch => ({
        ...ch,
        level: Math.random() * -60
      }));
      setMeterData(updatedChannels);
    }, 100);

    return () => clearInterval(interval);
  }, [isConnected]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMeterColor = (level: number) => {
    if (level > -6) return 'bg-red-500';
    if (level > -12) return 'bg-yellow-500';
    if (level > -24) return 'bg-green-500';
    return 'bg-green-600';
  };

  const getMeterHeight = (level: number) => {
    // Convert dB to percentage (assuming -60dB to 0dB range)
    const percentage = Math.max(0, Math.min(100, ((level + 60) / 60) * 100));
    return `${percentage}%`;
  };

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <BarChart3 className="mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Meters Not Available</h3>
          <p>Connect to your mixer to see live meter levels.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Meters */}
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Program Output
          </h3>
          <div className="flex gap-4 justify-center items-end h-48">
            {/* Left Channel */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs text-slate-400 font-mono">
                {programLevel.left.toFixed(1)}dB
              </div>
              <div className="w-8 h-40 bg-slate-700 rounded-sm relative overflow-hidden">
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-100 ${getMeterColor(programLevel.left)}`}
                  style={{ height: getMeterHeight(programLevel.left) }}
                />
              </div>
              <div className="text-xs text-slate-400">L</div>
            </div>
            {/* Right Channel */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs text-slate-400 font-mono">
                {programLevel.right.toFixed(1)}dB
              </div>
              <div className="w-8 h-40 bg-slate-700 rounded-sm relative overflow-hidden">
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-100 ${getMeterColor(programLevel.right)}`}
                  style={{ height: getMeterHeight(programLevel.right) }}
                />
              </div>
              <div className="text-xs text-slate-400">R</div>
            </div>
          </div>
        </Card>

        {/* Clock */}
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={20} />
            System Time
          </h3>
          <div className="flex flex-col items-center justify-center h-48">
            <div className="relative w-32 h-32 rounded-full border-4 border-green-400 mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white font-mono">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatDate(currentTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Channel Meters */}
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Mapped Channels ({meterData.length})
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {meterData.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                No fader mappings configured
              </div>
            ) : (
              meterData.map((meter) => (
                <div key={meter.channel} className="flex items-center gap-3">
                  <div className="text-xs text-slate-400 w-8">
                    Ch{meter.channel}
                  </div>
                  <div className="flex-1 h-3 bg-slate-700 rounded-sm relative overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-100 ${getMeterColor(meter.level)}`}
                      style={{ width: getMeterHeight(meter.level) }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 font-mono w-12">
                    {meter.level.toFixed(1)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Extended Channel Grid */}
      {meterData.length > 0 && (
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Channel Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {meterData.map((meter) => (
              <div key={meter.channel} className="text-center">
                <div className="text-sm text-slate-400 mb-2">
                  Ch {meter.channel}
                </div>
                <div className="h-32 w-8 bg-slate-700 rounded-sm relative overflow-hidden mx-auto mb-2">
                  <div 
                    className={`absolute bottom-0 w-full transition-all duration-100 ${getMeterColor(meter.level)}`}
                    style={{ height: getMeterHeight(meter.level) }}
                  />
                </div>
                <div className="text-xs text-slate-400 font-mono mb-1">
                  {meter.level.toFixed(1)}dB
                </div>
                {meter.description && (
                  <div className="text-xs text-slate-500 truncate" title={meter.description}>
                    {meter.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
