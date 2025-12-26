import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { VUMeter } from '@/components/VUMeter';
import { AnalogClock } from '@/components/AnalogClock';
import { PasswordUnlockModal } from '@/components/PasswordUnlockModal';
import { SilenceAlarm } from '@/components/SilenceAlarm';
import { vuMeterService, VUMeterData } from '@/services/vuMeterService';
import { silenceDetectionService } from '@/services/silenceDetectionService';
import { faderMappingService } from '@/services/faderMappingService';
import { SettingsService, BusMeterConfig, MainLRConfig } from '@/services/settingsService';
import { formatTime, getTimeSettings, saveTimeSettings, TimeSettings } from '@/lib/utils';
import { Activity, Clock, Maximize, Minimize, Mic, Settings, VolumeX } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      fullscreen: {
        setFullscreen: (enabled: boolean) => Promise<{ success: boolean }>;
        getState: () => Promise<{ isFullScreen: boolean }>;
        onRequestExit: (callback: () => void) => void;
        onFullscreenChanged: (callback: (event: unknown, isFullScreen: boolean) => void) => void;
      };
    };
  }
}

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
  const [showBusSettings, setShowBusSettings] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({ use24Hour: true });
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  const [speakerMuteConfig, setSpeakerMuteConfig] = useState<{ enabled: boolean; isMuted: boolean; triggerChannels: number[] }>({
    enabled: false,
    isMuted: false,
    triggerChannels: []
  });
  const [busMeterConfig, setBusMeterConfig] = useState<BusMeterConfig>({
    enabled: false,
    busNumber: 1,
    label: 'CRM',
    isStereo: true
  });
  const [mainLRConfig, setMainLRConfig] = useState<MainLRConfig>({
    label: 'PGM'
  });
  const [showStereoFaderMappings, setShowStereoFaderMappings] = useState<boolean>(() => {
    const saved = localStorage.getItem('vuMeter_showStereoFaderMappings');
    return saved ? JSON.parse(saved) : false;
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

  // Load bus meter and main LR settings
  useEffect(() => {
    const loadMeterSettings = () => {
      const appSettings = SettingsService.loadSettings();
      if (appSettings.busMeter) {
        setBusMeterConfig(appSettings.busMeter);
      }
      if (appSettings.mainLR) {
        setMainLRConfig(appSettings.mainLR);
      }
    };

    loadMeterSettings();

    // Listen for storage changes to update settings in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'xair-controller-settings') {
        loadMeterSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load time settings
  useEffect(() => {
    const loadedTimeSettings = getTimeSettings();
    setTimeSettings(loadedTimeSettings);

    // Listen for storage changes to update time settings in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timeSettings') {
        const newTimeSettings = getTimeSettings();
        setTimeSettings(newTimeSettings);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Electron fullscreen state synchronization
  useEffect(() => {
    if (!isElectron) return;

    // Get initial fullscreen state
    const syncElectronFullscreen = async () => {
      const state = await window.electronAPI!.fullscreen.getState();
      setIsFullscreen(state.isFullScreen);
    };

    syncElectronFullscreen();

    // Listen for fullscreen changes from Electron
    const handleElectronFullscreenChange = (_event: unknown, isFullScreen: boolean) => {
      console.log('Electron fullscreen changed:', isFullScreen);
      setIsFullscreen(isFullScreen);
      
      // If entering fullscreen in end-user mode, lock the interface
      if (isFullScreen && endUserMode && passwordProtectionEnabled) {
        setIsLocked(true);
      }
    };

    // Listen for fullscreen exit requests (from F11/Escape)
    const handleElectronRequestExit = () => {
      console.log('Electron requesting fullscreen exit');
      
      // If password protected, show modal
      if (endUserMode && passwordProtectionEnabled) {
        console.log('Password protected - showing modal');
        setIsPasswordModalOpen(true);
      } else {
        // No password protection, allow exit
        console.log('No password protection - exiting');
        window.electronAPI!.fullscreen.setFullscreen(false);
      }
    };

    window.electronAPI!.fullscreen.onFullscreenChanged(handleElectronFullscreenChange);
    window.electronAPI!.fullscreen.onRequestExit(handleElectronRequestExit);
  }, [isElectron, endUserMode, passwordProtectionEnabled]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    console.log('toggleFullscreen called, current isFullscreen:', isFullscreen);
    console.log('End user mode:', endUserMode);
    console.log('Password protection enabled:', passwordProtectionEnabled);
    console.log('Is Electron:', isElectron);
    
    if (isFullscreen) {
      // Exiting fullscreen
      if (endUserMode && passwordProtectionEnabled) {
        console.log('End user mode with password - showing modal');
        setIsPasswordModalOpen(true);
        return; // Important: stop here and wait for password
      } else {
        console.log('Admin mode or no password - exiting directly');
        setIsFullscreen(false);
        
        // Exit fullscreen in appropriate environment
        if (isElectron) {
          await window.electronAPI!.fullscreen.setFullscreen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    } else {
      // Entering fullscreen
      console.log('Entering fullscreen');
      setIsFullscreen(true);
      
      // Enter fullscreen in appropriate environment
      if (isElectron) {
        await window.electronAPI!.fullscreen.setFullscreen(true);
      } else {
        document.documentElement.requestFullscreen?.();
      }
    }
  }, [isFullscreen, endUserMode, passwordProtectionEnabled, isElectron]);

  // Handle password verification
  const handlePasswordSubmit = async (enteredPassword: string): Promise<boolean> => {
    console.log('Password submitted for verification');
    if (enteredPassword === savedPassword) {
      console.log('Password correct - exiting fullscreen');
      setIsPasswordModalOpen(false);
      setIsLocked(false);
      setIsFullscreen(false);
      
      // Exit fullscreen in appropriate environment
      if (isElectron) {
        await window.electronAPI!.fullscreen.setFullscreen(false);
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      
      return true;
    } else {
      console.log('Password incorrect');
      return false;
    }
  };

  // Handle escape key to exit fullscreen (only for browser, Electron handles via IPC)
  useEffect(() => {
    // Skip keyboard handling in Electron - it's handled via IPC
    if (isElectron) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        // If password protected in end-user mode, prevent default browser behavior
        if (endUserMode && passwordProtectionEnabled) {
          event.preventDefault();
          event.stopPropagation();
        }
        // Use the same logic as fullscreen toggle for consistency
        toggleFullscreen();
      }
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyPress, true);
  }, [isFullscreen, toggleFullscreen, endUserMode, passwordProtectionEnabled, isElectron]);

  useEffect(() => {
    console.log('State changed - isFullscreen:', isFullscreen);
  }, [isFullscreen]);

  // Handle browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // If password protected in end-user mode, re-enter fullscreen
        if (endUserMode && passwordProtectionEnabled) {
          console.log('Password protected mode - preventing fullscreen exit, re-entering');
          document.documentElement.requestFullscreen?.().catch((err) => {
            console.log('Could not re-enter fullscreen:', err);
            // If we can't re-enter fullscreen, show the password modal
            setIsPasswordModalOpen(true);
          });
        } else {
          console.log('Browser exited fullscreen, updating component state');
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen, endUserMode, passwordProtectionEnabled]);

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
            
            // Update silence detection service with current levels
            silenceDetectionService.updateLevels({
              channels: data.channels,
              buses: data.buses
            });
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
  const getDisplayChannels = (): Array<{ level: number; channel: number; label: string; isStereo: boolean; levelR?: number; labelR?: string }> => {
    const mappings = faderMappingService.getAllMappings();
    
    if (mappings.length === 0) {
      // Fallback to first 4 channels if no mappings
      return meterData?.channels.slice(0, 4).map((level, index) => ({
        level,
        channel: index,
        label: getMeterLabel(index),
        isStereo: false
      })) || [];
    }

    // Build display array considering stereo mappings
    const displayArray: Array<{ level: number; channel: number; label: string; isStereo: boolean; levelR?: number; labelR?: string }> = [];
    
    for (let i = 0; i < Math.min(4, mappings.length); i++) {
      const mapping = mappings[i];
      
      if (showStereoFaderMappings && mapping.isStereo) {
        // Show as stereo meter (L/R)
        displayArray.push({
          level: meterData?.channels[mapping.channel - 1] || -90,
          levelR: meterData?.channels[mapping.channel] || -90, // Next channel
          channel: mapping.channel - 1,
          label: getMeterLabel(mapping.channel - 1),
          labelR: getMeterLabel(mapping.channel),
          isStereo: true
        });
      } else {
        // Show as mono meter
        displayArray.push({
          level: meterData?.channels[mapping.channel - 1] || -90,
          channel: mapping.channel - 1,
          label: getMeterLabel(mapping.channel - 1),
          isStereo: false
        });
      }
    }
    
    return displayArray;
  };

  const displayChannels = getDisplayChannels();
  const mainLR = meterData ? [meterData.channels[36] || -90, meterData.channels[37] || -90] : [-90, -90];

  // Get bus meters (buses are mono, but we can show them as stereo if configured)
  const busMeters = meterData && busMeterConfig.enabled && meterData.buses 
    ? (busMeterConfig.isStereo 
        ? [meterData.buses[busMeterConfig.busNumber - 1] || -90, meterData.buses[busMeterConfig.busNumber - 1] || -90] // Show same level for L/R
        : [meterData.buses[busMeterConfig.busNumber - 1] || -90])
    : [];

  // Get mic levels for all selected channels
  const micLevels = micChannels.map(channel => {
    // Try to get the actual channel name from settings
    const channelName = SettingsService.getChannelName(channel);
    return {
      channel,
      level: meterData?.channels[channel - 1] || -90,
      label: channelName || `Mic ${channel}`
    };
  });

  // Enhanced mic settings panel 
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
              const channelName = SettingsService.getChannelName(channel);
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
                  <div>CH {channel}</div>
                  {channelName && (
                    <div className="text-[10px] opacity-75 truncate mt-0.5">
                      {channelName}
                    </div>
                  )}
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

  // Bus meter settings panel
  const renderBusSettings = () => (
    <div className="absolute top-full right-0 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 min-w-[320px] max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-semibold">Bus & Main Meter Settings</h4>
      </div>
      
      <div className="space-y-4">
        {/* Stereo Fader Mapping Display */}
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showStereoFaderMappings}
              onChange={(e) => {
                const newValue = e.target.checked;
                setShowStereoFaderMappings(newValue);
                localStorage.setItem('vuMeter_showStereoFaderMappings', JSON.stringify(newValue));
              }}
              className="w-4 h-4"
            />
            Show Stereo Meters for Stereo Mappings
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Display stereo fader mappings as L/R meters (uses channel + next channel)
          </p>
        </div>

        {/* Main LR Label */}
        <div className="pt-3 border-t border-slate-600">
          <label className="block text-sm text-slate-300 mb-2">
            Main LR Label:
          </label>
          <input
            type="text"
            value={mainLRConfig.label}
            onChange={(e) => {
              const newConfig = { label: e.target.value };
              setMainLRConfig(newConfig);
              SettingsService.updateMainLR(newConfig);
            }}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            placeholder="e.g., PGM"
          />
        </div>

        {/* Enable Bus Meter */}
        <div className="pt-3 border-t border-slate-600">
          <label className="flex items-center gap-2 text-sm text-slate-300 mb-3">
            <input
              type="checkbox"
              checked={busMeterConfig.enabled}
              onChange={(e) => {
                const newConfig = { ...busMeterConfig, enabled: e.target.checked };
                setBusMeterConfig(newConfig);
                SettingsService.updateBusMeter(newConfig);
              }}
              className="w-4 h-4"
            />
            Enable Bus Meter
          </label>

          {busMeterConfig.enabled && (
            <div className="space-y-3 pl-6">
              {/* Bus Number */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Bus Number (1-6):
                </label>
                <select
                  value={busMeterConfig.busNumber}
                  onChange={(e) => {
                    const newConfig = { ...busMeterConfig, busNumber: parseInt(e.target.value) };
                    setBusMeterConfig(newConfig);
                    SettingsService.updateBusMeter(newConfig);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>Bus {num}</option>
                  ))}
                </select>
              </div>

              {/* Bus Label */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Bus Label:
                </label>
                <input
                  type="text"
                  value={busMeterConfig.label}
                  onChange={(e) => {
                    const newConfig = { ...busMeterConfig, label: e.target.value };
                    setBusMeterConfig(newConfig);
                    SettingsService.updateBusMeter(newConfig);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                  placeholder="e.g., CRM"
                />
              </div>

              {/* Display as Stereo */}
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={busMeterConfig.isStereo}
                    onChange={(e) => {
                      const newConfig = { ...busMeterConfig, isStereo: e.target.checked };
                      setBusMeterConfig(newConfig);
                      SettingsService.updateBusMeter(newConfig);
                    }}
                    className="w-4 h-4"
                  />
                  Display as Stereo (L/R)
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Note: Buses are mono, but this will show two identical meters
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={() => setShowBusSettings(false)}
        className="mt-4 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm"
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
        {/* Silence Alarm - critical for fullscreen broadcasting */}
        <SilenceAlarm />
        
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
              Broadcasting Dashboard
            </h1>
          </div>

          {/* Main content grid - optimized for fullscreen */}
          <div className={`flex-1 grid gap-8 ${
            micChannels.length > 0 && busMeterConfig.enabled ? 'grid-cols-5' :
            micChannels.length > 0 || busMeterConfig.enabled ? 'grid-cols-4' : 
            'grid-cols-3'
          }`}>
            {/* Input Channel VU Meters */}
            <Card className="p-8 bg-slate-800/50 border-slate-700 flex flex-col">
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 justify-center">
                <Activity size={24} />
                {faderMappingService.getAllMappings().length > 0 ? 'Mapped Channels' : 'Input Channels'}
              </h3>
              
              <div className="flex-1 flex justify-center items-center">
                <div className={`${displayChannels.length >= 4 ? 'grid grid-cols-2 gap-4' : 'flex justify-around items-end'} w-full max-w-md`}>
                  {displayChannels.map((channel, index) => (
                    channel.isStereo ? (
                      <div key={`input-stereo-${index}`} className="flex flex-col items-center">
                        <div className="text-xs text-slate-400 mb-1">{channel.label}</div>
                        <div className="flex gap-1 pl-9">
                          <VUMeter
                            level={channel.level}
                            label="L"
                            height="tall"
                            showScale={true}
                            className=""
                          />
                          <VUMeter
                            level={channel.levelR || -90}
                            label="R"
                            height="tall"
                            showScale={false}
                            className=""
                          />
                        </div>
                      </div>
                    ) : (
                      <VUMeter
                        key={`input-${index}`}
                        level={channel.level}
                        label={channel.label}
                        height="tall"
                        className="mx-3"
                      />
                    )
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
                  <div className="flex flex-col gap-4 w-full max-w-md">
                    {/* First row - first 4 mics */}
                    <div className="flex justify-around items-end">
                      {micLevels.slice(0, 4).map((mic, index) => (
                        <VUMeter
                          key={`mic-${index}`}
                          level={mic.level}
                          label={mic.label}
                          height={micLevels.length > 4 ? 'tall' : 'extra-tall'}
                          className="mx-2"
                        />
                      ))}
                    </div>
                    {/* Second row - remaining mics (5-8) */}
                    {micLevels.length > 4 && (
                      <div className="flex justify-around items-end">
                        {micLevels.slice(4, 8).map((mic, index) => (
                          <VUMeter
                            key={`mic-${index + 4}`}
                            level={mic.level}
                            label={mic.label}
                            height="tall"
                            className="mx-2"
                          />
                        ))}
                      </div>
                    )}
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
                {mainLRConfig.label} Output
              </h3>
              
              <div className="flex-1 flex justify-center items-center">
                <div className="flex justify-around items-end w-full max-w-xs">
                  {mainLR.map((level, index) => (
                    <VUMeter
                      key={`main-${index}`}
                      level={level}
                      label={index === 0 ? 'L' : 'R'}
                      height="extra-tall"
                      className="mx-6"
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Bus Output (if enabled) */}
            {busMeterConfig.enabled && (
              <Card className="p-8 bg-slate-800/50 border-slate-700 flex flex-col">
                <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3 justify-center">
                  <Activity size={24} />
                  {busMeterConfig.label} Output
                </h3>
                
                <div className="flex-1 flex justify-center items-center">
                  <div className="flex justify-around items-end w-full max-w-xs">
                    {busMeters.map((level, index) => (
                      <VUMeter
                        key={`bus-${index}`}
                        level={level}
                        label={busMeterConfig.isStereo ? (index === 0 ? 'L' : 'R') : busMeterConfig.label}
                        height="extra-tall"
                        className="mx-6"
                      />
                    ))}
                  </div>
                </div>
              </Card>
            )}
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
              <div className="text-slate-500">
                {meterData && `Last update: ${formatTime(new Date(meterData.timestamp), timeSettings.use24Hour)}`}
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
      {/* Silence Alarm - appears in fullscreen and normal view */}
      <SilenceAlarm />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-green-400" size={32} />
            Broadcasting Dashboard
          </h2>
          <p className="text-slate-400 mt-1">Real-time audio level monitoring and system time</p>
        </div>
        
        <div className="flex items-center gap-4">
          <SpeakerMuteIndicator />
          
          <div className="relative">
            <button
              onClick={() => setShowMicSettings(!showMicSettings)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
              title="Mic Settings"
            >
              <Mic size={20} />
            </button>
            
            {showMicSettings && renderMicSettings()}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowBusSettings(!showBusSettings)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
              title="Bus & Main Meter Settings"
            >
              <Settings size={20} />
            </button>
            
            {showBusSettings && renderBusSettings()}
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

      <div className={`grid grid-cols-1 gap-6 ${
        micChannels.length > 0 && busMeterConfig.enabled ? 'lg:grid-cols-5' :
        micChannels.length > 0 || busMeterConfig.enabled ? 'lg:grid-cols-4' : 
        'lg:grid-cols-3'
      }`}>
        {/* Input Channel VU Meters */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            {faderMappingService.getAllMappings().length > 0 ? 'Mapped Channels' : 'Input Channels'}
          </h3>
          
          <div className={`${displayChannels.length >= 4 ? 'grid grid-cols-2 gap-3' : 'flex justify-around items-end'}`}>
            {displayChannels.map((channel, index) => (
              channel.isStereo ? (
                <div key={`input-stereo-${index}`} className="flex flex-col items-center">
                  <div className="text-xs text-slate-400 mb-1">{channel.label}</div>
                  <div className="flex gap-1 pl-9">
                    <VUMeter
                      level={channel.level}
                      label="L"
                      showScale={true}
                      className=""
                    />
                    <VUMeter
                      level={channel.levelR || -90}
                      label="R"
                      showScale={false}
                      className=""
                    />
                  </div>
                </div>
              ) : (
                <VUMeter
                  key={`input-${index}`}
                  level={channel.level}
                  label={channel.label}
                  className="mx-1"
                />
              )
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
            
            <div className="flex flex-col gap-3">
              {/* First row - first 4 mics */}
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
              {/* Second row - remaining mics (5-8) */}
              {micLevels.length > 4 && (
                <div className="flex justify-around items-end">
                  {micLevels.slice(4, 8).map((mic, index) => (
                    <VUMeter
                      key={`mic-${index + 4}`}
                      level={mic.level}
                      label={mic.label}
                      className="mx-1"
                    />
                  ))}
                </div>
              )}
            </div>
            
            {micLevels.length > 8 && (
              <div className="text-xs text-slate-400 mt-2 text-center">
                +{micLevels.length - 8} more channels
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
            {mainLRConfig.label} Output
          </h3>
          
          <div className="flex justify-around items-end">
            {mainLR.map((level, index) => (
              <VUMeter
                key={`main-${index}`}
                level={level}
                label={index === 0 ? 'L' : 'R'}
                className="mx-1"
              />
            ))}
          </div>
        </Card>

        {/* Bus Output (if enabled) */}
        {busMeterConfig.enabled && (
          <Card className="lg:col-span-1 p-6 bg-slate-800/50 border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity size={20} />
              {busMeterConfig.label} Output
            </h3>
            
            <div className="flex justify-around items-end">
              {busMeters.map((level, index) => (
                <VUMeter
                  key={`bus-${index}`}
                  level={level}
                  label={busMeterConfig.isStereo ? (index === 0 ? 'L' : 'R') : busMeterConfig.label}
                  className="mx-1"
                />
              ))}
            </div>
          </Card>
        )}
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
          
          <div className="flex items-center gap-4">
            {meterData && (
              <div className="text-slate-500">
                Last update: {formatTime(new Date(meterData.timestamp), timeSettings.use24Hour)}
              </div>
            )}
            <div className="text-slate-500">
              {meterData?.channels.length || 0} channels monitored
            </div>
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
