import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { VUMeter } from '@/components/VUMeter';
import { AnalogClock } from '@/components/AnalogClock';
import { vuMeterService, VUMeterData } from '@/services/vuMeterService';
import { Activity, Clock, Maximize, Minimize } from 'lucide-react';

interface VUMeterDashboardProps {
  isConnected?: boolean;
}

export const VUMeterDashboard: React.FC<VUMeterDashboardProps> = ({ isConnected = false }) => {
  const [meterData, setMeterData] = useState<VUMeterData | null>(null);
  const [serviceConnected, setServiceConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

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
    if (index === 36) return 'MAIN L';
    if (index === 37) return 'MAIN R';
    if (index < 18) return `AUX ${index - 15}`;
    if (index < 20) return `FX ${index - 17}`;
    return `OUT ${index - 19}`;
  };

  // Show main channels (first 4) and main LR output
  const displayChannels = meterData?.channels.slice(0, 4) || [];
  const mainLR = meterData ? [meterData.channels[36] || -90, meterData.channels[37] || -90] : [-90, -90];

  // Fullscreen wrapper
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 p-4 overflow-hidden">
        {/* Fullscreen controls */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-white transition-colors"
            title="Exit Fullscreen (ESC or F11)"
          >
            <Minimize size={20} />
          </button>
        </div>

        {/* Fullscreen content */}
        <div className="h-full flex flex-col">
          {/* Compact header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
              <Activity className="text-green-400" size={36} />
              VU Meter & Clock Dashboard
            </h1>
            {meterData && (
              <div className="text-sm text-slate-500 mt-2">
                Last update: {new Date(meterData.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Main content grid - optimized for fullscreen */}
          <div className="flex-1 grid grid-cols-3 gap-8">
            {/* Input Channel VU Meters */}
            <Card className="p-8 bg-slate-800/50 border-slate-700 flex flex-col">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 justify-center">
                <Activity size={24} />
                Input Channels
              </h3>
              
              <div className="flex-1 flex justify-center items-center">
                <div className="flex justify-around items-end w-full max-w-md">
                  {displayChannels.map((level, index) => (
                    <VUMeter
                      key={index}
                      level={level}
                      label={getMeterLabel(index)}
                      height="extra-tall"
                      className="mx-3"
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Analog Clock - larger in fullscreen */}
            <Card className="p-8 bg-slate-800/50 border-slate-700 flex items-center justify-center">
              <div className="scale-150">
                <AnalogClock />
              </div>
            </Card>

            {/* Main LR Output */}
            <Card className="p-8 bg-slate-800/50 border-slate-700 flex flex-col">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 justify-center">
                <Activity size={24} />
                Main LR Output
              </h3>
              
              <div className="flex-1 flex justify-center items-center">
                <div className="flex justify-around items-end w-full max-w-xs">
                  {mainLR.map((level, index) => (
                    <VUMeter
                      key={`main-${index}`}
                      level={level}
                      label={getMeterLabel(36 + index)}
                      height="extra-tall"
                      className="mx-6"
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Fullscreen status bar */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${serviceConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-slate-300 text-lg">{serviceConnected ? 'VU Meters Active' : 'VU Meters Disconnected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span className="text-slate-300 text-lg">System Time Synchronized</span>
                </div>
              </div>
              
              <div className="text-slate-400 text-lg">
                Press ESC or F11 to exit fullscreen
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal view
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
        
        <div className="flex items-center gap-4">
          {meterData && (
            <div className="text-sm text-slate-500">
              Last update: {new Date(meterData.timestamp).toLocaleTimeString()}
            </div>
          )}
          
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
            title="Enter Fullscreen (F11)"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Channel VU Meters */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Input Channels
          </h3>
          
          <div className="flex justify-around items-end">
            {displayChannels.map((level, index) => (
              <VUMeter
                key={index}
                level={level}
                label={getMeterLabel(index)}
                className="mx-1"
              />
            ))}
          </div>
        </Card>

        {/* Analog Clock */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700 flex items-center justify-center">
          <AnalogClock />
        </Card>

        {/* Main LR Output */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Main LR Output
          </h3>
          
          <div className="flex justify-around items-end">
            {mainLR.map((level, index) => (
              <VUMeter
                key={`main-${index}`}
                level={level}
                label={getMeterLabel(36 + index)}
                className="mx-1"
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
              <div className={`w-2 h-2 rounded-full ${serviceConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-slate-300">{serviceConnected ? 'VU Meters Active' : 'VU Meters Disconnected'}</span>
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
