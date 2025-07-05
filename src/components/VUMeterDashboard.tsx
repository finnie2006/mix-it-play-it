
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { VUMeter } from '@/components/VUMeter';
import { AnalogClock } from '@/components/AnalogClock';
import { vuMeterService, VUMeterData } from '@/services/vuMeterService';
import { Activity, Clock } from 'lucide-react';

interface VUMeterDashboardProps {
  isConnected?: boolean;
}

export const VUMeterDashboard: React.FC<VUMeterDashboardProps> = ({ isConnected = false }) => {
  const [meterData, setMeterData] = useState<VUMeterData | null>(null);
  const [serviceConnected, setServiceConnected] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    const connectService = async () => {
      try {
        const connected = await vuMeterService.connect();
        setServiceConnected(connected);
        
        if (connected) {
          // Subscribe to meter updates
          const unsubscribe = vuMeterService.onMeterUpdate((data) => {
            setMeterData(data);
          });

          return unsubscribe;
        }
      } catch (error) {
        console.error('Failed to connect VU meter service:', error);
        setServiceConnected(false);
      }
    };

    connectService();

    return () => {
      vuMeterService.disconnect();
      setServiceConnected(false);
    };
  }, [isConnected]);

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <Activity className="mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your X-Air mixer to see live VU meters.</p>
        </div>
      </Card>
    );
  }

  if (!serviceConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <Activity className="mx-auto mb-4 animate-pulse" size={48} />
          <h3 className="text-xl font-semibold mb-2">Connecting to VU Meters</h3>
          <p>Establishing connection to meter bridge service...</p>
        </div>
      </Card>
    );
  }

  // Get meter labels based on typical X-Air usage
  const getMeterLabel = (index: number) => {
    if (index < 16) return `CH ${index + 1}`;
    if (index < 18) return `AUX ${index - 15}`;
    if (index < 20) return `FX ${index - 17}`;
    return `OUT ${index - 19}`;
  };

  // Show main channels (first 4) and key outputs
  const displayChannels = meterData?.channels.slice(0, 4) || [];
  const auxOutputs = meterData?.channels.slice(16, 18) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-green-400" size={32} />
            VU Meter & Clock Dashboard
          </h2>
          <p className="text-slate-400 mt-1">Real-time audio level monitoring and system time</p>
        </div>
        
        {meterData && (
          <div className="text-sm text-slate-500">
            Last update: {new Date(meterData.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Channel VU Meters */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Program Channels
          </h3>
          
          <div className="flex justify-around items-end relative">
            {displayChannels.map((level, index) => (
              <VUMeter
                key={index}
                level={level}
                label={getMeterLabel(index)}
                className="relative"
              />
            ))}
          </div>
        </Card>

        {/* Analog Clock */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700 flex items-center justify-center">
          <AnalogClock />
        </Card>

        {/* Auxiliary Outputs */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Auxiliary Outputs
          </h3>
          
          <div className="flex justify-around items-end relative">
            {auxOutputs.map((level, index) => (
              <VUMeter
                key={index + 16}
                level={level}
                label={getMeterLabel(index + 16)}
                className="relative"
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Status Information */}
      <Card className="p-4 bg-slate-800/50 border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-slate-300">VU Meters Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span className="text-slate-300">System Time Synchronized</span>
            </div>
          </div>
          
          <div className="text-slate-500">
            {meterData?.channels.length || 0} channels monitored
          </div>
        </div>
      </Card>
    </div>
  );
};
