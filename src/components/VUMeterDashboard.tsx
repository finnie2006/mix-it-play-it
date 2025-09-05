import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { VUMeter } from '@/components/VUMeter';
import { AnalogClock } from '@/components/AnalogClock';
import { PasswordUnlockModal } from '@/components/PasswordUnlockModal';
import { vuMeterService, VUMeterData } from '@/services/vuMeterService';
import { faderMappingService } from '@/services/faderMappingService';
import { Activity, Clock, Maximize, Minimize, Mic, Settings, VolumeX } from 'lucide-react';

interface VUMeterDashboardProps {
  isConnected?: boolean;
  endUserMode?: boolean;
}

export const VUMeterDashboard: React.FC<VUMeterDashboardProps> = ({ isConnected = false, endUserMode = false }) => {
  const [meterData, setMeterData] = useState<VUMeterData | null>(null);
  const [serviceConnected, setServiceConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [micChannels, setMicChannels] = useState<number[]>([]);
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [speakerMuteConfig, setSpeakerMuteConfig] = useState<{ enabled: boolean; isMuted: boolean; triggerChannels: number[] }>({
    enabled: false,
    isMuted: false,
    triggerChannels: []
  });

  // Load password protection settings
  useEffect(() => {
    const loadPasswordSettings = () => {
      const savedSettings = localStorage.getItem('advancedSettings');
      console.log('Loading advanced settings:', savedSettings);
      
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          console.log('Parsed settings:', settings);
          
          const hasPassword = settings.password && settings.password.trim() !== '';
          const isEnabled = settings.passwordProtectionEnabled && hasPassword;
          
          setPasswordProtectionEnabled(isEnabled);
          setSavedPassword(settings.password || '');
          
          console.log('Password protection enabled:', isEnabled);
          console.log('Has password:', hasPassword);
        } catch (error) {
          console.error('Failed to parse settings:', error);
        }
      } else {
        console.log('No advanced settings found');
      }
    };

    loadPasswordSettings();
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    console.log('toggleFullscreen called, current isFullscreen:', isFullscreen);
    console.log('End user mode:', endUserMode);
    console.log('Password protection enabled:', passwordProtectionEnabled);
    
    if (isFullscreen) {
      // Exiting fullscreen
      if (endUserMode && passwordProtectionEnabled) {
        console.log('End user mode with password - showing modal');
        setIsPasswordModalOpen(true);
        return; // Important: stop here and wait for password
      } else {
        console.log('Admin mode or no password - exiting directly');
        setIsFullscreen(false);
        // Also exit browser fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    } else {
      // Entering fullscreen
      console.log('Entering fullscreen');
      setIsFullscreen(true);
      // Also enter browser fullscreen
      document.documentElement.requestFullscreen?.();
    }
  }, [isFullscreen, endUserMode, passwordProtectionEnabled]);

  // Handle password verification
  const handlePasswordSubmit = (enteredPassword: string): boolean => {
    console.log('Password submitted for verification');
    if (enteredPassword === savedPassword) {
      console.log('Password correct - exiting fullscreen');
      setIsPasswordModalOpen(false);
      setIsFullscreen(false);
      // Also exit browser fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      return true;
    } else {
      console.log('Password incorrect');
      return false;
    }
  };

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        // Use the same logic as fullscreen toggle for consistency
        toggleFullscreen();
      }
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, toggleFullscreen]);

  useEffect(() => {
    console.log('State changed - isFullscreen:', isFullscreen);
  }, [isFullscreen]);

  // Handle browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        console.log('Browser exited fullscreen, updating component state');
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // Load speaker mute status from fader mapping service
  useEffect(() => {
    const checkSpeakerMuteStatus = () => {
      const status = faderMappingService.getSpeakerMuteStatus();
      setSpeakerMuteConfig(status);
    };

    // Check initial status
    checkSpeakerMuteStatus();

    // Check periodically for updates
    const interval = setInterval(checkSpeakerMuteStatus, 100); // Check more frequently for real-time updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const connectService = async () => {
      try {
        const connected = await vuMeterService.connect();
        setServiceConnected(connected);
        
        if (connected) {
          // Subscribe to meter updates
          const unsubscribeMeter = vuMeterService.onMeterUpdate((data) => {
            setMeterData(data);
          });

          // Subscribe to firmware version updates
          const unsubscribeFw = vuMeterService.onFirmwareVersion((fw) => {
            setFirmwareVersion(fw.version);
          });

          return () => {
            unsubscribeMeter();
            unsubscribeFw();
          };
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

  // Load mic channels setting from localStorage
  useEffect(() => {
    const savedMicChannels = localStorage.getItem('vuMeter_micChannels');
    if (savedMicChannels && savedMicChannels !== 'null') {
      try {
        const channels = JSON.parse(savedMicChannels);
        if (Array.isArray(channels)) {
          setMicChannels(channels);
        }
      } catch (error) {
        console.warn('Error parsing saved mic channels:', error);
        setMicChannels([]);
      }
    }
  }, []);

  // Save mic channels setting to localStorage
  const updateMicChannels = (channels: number[]) => {
    setMicChannels(channels);
    localStorage.setItem('vuMeter_micChannels', JSON.stringify(channels));
  };

  // Handle mic channel toggle
  const toggleMicChannel = (channel: number) => {
    const newChannels = micChannels.includes(channel)
      ? micChannels.filter(c => c !== channel)
      : [...micChannels, channel].sort((a, b) => a - b);
    
    updateMicChannels(newChannels);
  };

  // Get meter labels based on typical X-Air usage
  const getMeterLabel = (index: number) => {
    const mapping = faderMappingService.getMappingForChannel(index + 1);
    if (mapping) {
      return mapping.description || `CH ${index + 1}`;
    }
    if (index < 16) return `CH ${index + 1}`;
    if (index === 36) return 'MAIN L';
    if (index === 37) return 'MAIN R';
    if (index < 18) return `AUX ${index - 15}`;
    if (index < 20) return `FX ${index - 17}`;
    return `OUT ${index - 19}`;
  };

  // Get channels based on fader mappings
  const getDisplayChannels = () => {
    const mappings = faderMappingService.getAllMappings();
    
    if (mappings.length === 0) {
      // Fallback to first 4 channels if no mappings
      return meterData?.channels.slice(0, 4).map((level, index) => ({
        level,
        channel: index,
        label: getMeterLabel(index)
      })) || [];
    }

    // Use first 4 fader mappings
    return mappings.slice(0, 4).map(mapping => ({
      level: meterData?.channels[mapping.channel - 1] || -90,
      channel: mapping.channel - 1,
      label: getMeterLabel(mapping.channel - 1)
    }));
  };

  const displayChannels = getDisplayChannels();
  const mainLR = meterData ? [meterData.channels[36] || -90, meterData.channels[37] || -90] : [-90, -90];

  // Get mic levels for all selected channels
  const micLevels = micChannels.map(channel => ({
    channel,
    level: meterData?.channels[channel - 1] || -90,
    label: `MIC ${channel}`
  }));

  // Enhanced mic settings panel with multi-selection
  const renderMicSettings = () => (
    <div className="absolute top-full right-0 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 min-w-[280px] max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-semibold">Mic Channel Settings</h4>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Select Mic Channels (multiple allowed):
          </label>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }, (_, i) => {
              const channel = i + 1;
              const isSelected = micChannels.includes(channel);
              return (
                <button
                  key={channel}
                  onClick={() => toggleMicChannel(channel)}
                  className={`p-2 text-xs rounded border transition-colors ${
                    isSelected
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  CH {channel}
                </button>
              );
            })}
          </div>
        </div>
        
        {micChannels.length > 0 && (
          <div className="pt-2 border-t border-slate-600">
            <span className="text-sm text-slate-400">
              Selected: {micChannels.join(', ')}
            </span>
            <button
              onClick={() => updateMicChannels([])}
              className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
      
      <button
        onClick={() => setShowMicSettings(false)}
        className="mt-3 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm"
      >
        Close
      </button>
    </div>
  );

  // Speaker mute indicator component - updated to show real-time status
  const SpeakerMuteIndicator = ({ className = "" }) => {
    if (!speakerMuteConfig.enabled) return null;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${className} ${
        speakerMuteConfig.isMuted 
          ? 'bg-red-600/20 border border-red-500/50' 
          : 'bg-green-600/20 border border-green-500/50'
      }`}>
        <VolumeX className={speakerMuteConfig.isMuted ? 'text-red-400' : 'text-green-400'} size={16} />
        <span className={`font-medium ${speakerMuteConfig.isMuted ? 'text-red-300' : 'text-green-300'}`}>
          {speakerMuteConfig.isMuted ? 'ON AIR - TALKING' : 'SPEAKERS ACTIVE'}
        </span>
      </div>
    );
  };

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

  // Fullscreen wrapper
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 p-4 overflow-hidden">
        {/* Fullscreen controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <SpeakerMuteIndicator />
          <button
            onClick={() => {
              console.log('Custom exit button clicked!');
              toggleFullscreen();
            }}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-white transition-colors border-2 border-red-500"
            title="Exit Fullscreen (Custom Button)"
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
          <div className={`flex-1 grid gap-8 ${micChannels.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {/* Input Channel VU Meters */}
            <Card className="p-8 bg-slate-800/50 border-slate-700 flex flex-col">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 justify-center">
                <Activity size={24} />
                {faderMappingService.getAllMappings().length > 0 ? 'Mapped Channels' : 'Input Channels'}
              </h3>
              
              <div className="flex-1 flex justify-center items-center">
                <div className="flex justify-around items-end w-full max-w-md">
                  {displayChannels.map((channel, index) => (
                    <VUMeter
                      key={`input-${index}`}
                      level={channel.level}
                      label={channel.label}
                      height="extra-tall"
                      className="mx-3"
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Mic Channels (if enabled) */}
            {micChannels.length > 0 && (
              <Card className="p-8 bg-slate-800/50 border-slate-700 flex flex-col">
                <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 justify-center">
                  <Mic size={24} />
                  Microphones ({micChannels.length})
                </h3>
                
                <div className="flex-1 flex justify-center items-center">
                  <div className="flex justify-around items-end w-full">
                    {micLevels.slice(0, 4).map((mic, index) => (
                      <VUMeter
                        key={`mic-${index}`}
                        level={mic.level}
                        label={mic.label}
                        height="extra-tall"
                        className="mx-2"
                      />
                    ))}
                  </div>
                </div>
              </Card>
            )}

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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password unlock modal also rendered in fullscreen so user isn't locked in */}
        <PasswordUnlockModal
          isOpen={isPasswordModalOpen}
            /* When attempting to exit fullscreen under password protection, modal opens */
          onUnlock={handlePasswordSubmit}
          onClose={() => setIsPasswordModalOpen(false)}
          allowClose={true}
        />
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
          
          <SpeakerMuteIndicator />
          
          <div className="relative">
            <button
              onClick={() => setShowMicSettings(!showMicSettings)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
              title="Mic Settings"
            >
              <Settings size={20} />
            </button>
            
            {showMicSettings && renderMicSettings()}
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
            title="Enter Fullscreen (F11)"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${micChannels.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Input Channel VU Meters */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            {faderMappingService.getAllMappings().length > 0 ? 'Mapped Channels' : 'Input Channels'}
          </h3>
          
          <div className="flex justify-around items-end">
            {displayChannels.map((channel, index) => (
              <VUMeter
                key={`input-${index}`}
                level={channel.level}
                label={channel.label}
                className="mx-1"
              />
            ))}
          </div>
        </Card>

        {/* Mic Channels (if enabled) */}
        {micChannels.length > 0 && (
          <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mic size={20} />
              Microphones ({micChannels.length})
            </h3>
            
            <div className="flex justify-around items-end">
              {micLevels.slice(0, 4).map((mic, index) => (
                <VUMeter
                  key={`mic-${index}`}
                  level={mic.level}
                  label={mic.label}
                  className="mx-1"
                />
              ))}
            </div>
            
            {micLevels.length > 4 && (
              <div className="text-xs text-slate-400 mt-2 text-center">
                +{micLevels.length - 4} more channels (see fullscreen)
              </div>
            )}
          </Card>
        )}

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
              <span className="text-slate-300">
                {firmwareVersion ? `Firmware: ${firmwareVersion}` : 'Firmware: ...'}
              </span>
            </div>
            {faderMappingService.getAllMappings().length > 0 && (
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span className="text-slate-300">{faderMappingService.getAllMappings().length} fader mappings loaded</span>
              </div>
            )}
            {micChannels.length > 0 && (
              <div className="flex items-center gap-2">
                <Mic size={14} />
                <span className="text-slate-300">Mic channels: {micChannels.join(', ')}</span>
              </div>
            )}
          </div>
          
          <div className="text-slate-500">
            {meterData?.channels.length || 0} channels monitored
          </div>
        </div>
      </Card>

      {/* Password unlock modal */}
      <PasswordUnlockModal
        isOpen={isPasswordModalOpen}
        onUnlock={handlePasswordSubmit}
        onClose={() => setIsPasswordModalOpen(false)}
        allowClose={true}
      />
    </div>
  );
};
