import React, { useState } from 'react';
import { MixerDashboard } from '@/components/MixerDashboard';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { VUMeterDashboard } from '@/components/VUMeterDashboard';
import { HelpModal } from '@/components/HelpModal';
import { AdvancedSettingsModal } from '@/components/AdvancedSettingsModal';
import { SceneQuickSwitcher } from '@/components/SceneQuickSwitcher';
import { SilenceAlarm } from '@/components/SilenceAlarm';
import { CloudSyncModal } from '@/components/CloudSyncModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Radio, Volume2, Settings, Shield, ShieldOff } from 'lucide-react';
import { useMixer } from '@/hooks/useMixer';
import { FullscreenButton } from '@/components/FullscreenButton';

const Index = () => {
  const [mixerIP, setMixerIP] = useState('');
  const [mixerModel, setMixerModel] = useState<'X-Air 16' | 'X-Air 18'>('X-Air 18');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [_autoConnectEnabled, setAutoConnectEnabled] = useState(false);
  const [isEndUserMode, setIsEndUserMode] = useState(false);
  const [configPanelTab, setConfigPanelTab] = useState('radio');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen logic for the classic window maximize button
  React.useEffect(() => {
    const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;

    if (electronAPI) {
      const checkElectronFullscreen = async () => {
        const state = await electronAPI.fullscreen.getState();
        setIsFullscreen(state.isFullScreen);
      };
      checkElectronFullscreen();

      const handleElectronFullscreenChange = (_event: unknown, isFS: boolean) => {
        setIsFullscreen(isFS);
      };
      electronAPI.fullscreen.onFullscreenChanged(handleElectronFullscreenChange);
    } else {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }
  }, []);

  const toggleFullscreen = async () => {
    try {
      const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
      if (electronAPI) {
        await electronAPI.fullscreen.setFullscreen(!isFullscreen);
      } else {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      }
    } catch (_error) {
      console.log('Fullscreen not supported or failed:', _error);
    }
  };
  
  const { 
    isConnected, 
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    faderStates,
    vuLevels,
    channelNames,
    connect, 
    disconnect, 
    validateMixer,
    configureBridge,
    reloadMappings
  } = useMixer({ ip: mixerIP, port: 10024, model: mixerModel });

  // Load auto-connect settings and connect if enabled
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('advancedSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.autoConnectEnabled && settings.autoConnectIP) {
          setAutoConnectEnabled(true);
          setMixerIP(settings.autoConnectIP);
          // Auto-connect after a short delay to ensure everything is initialized
          setTimeout(() => {
            connect();
          }, 1000);
        }
      } catch (_error) {
        // Silent fail for auto-connect settings
      }
    }
  }, [connect]);

  // Reload mappings when tab changes to dashboard (to pick up any new settings)
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    
    if (value === 'dashboard') {
      reloadMappings();
    }
  };

  // Handle auto-connect settings change
  const handleAutoConnectChange = (enabled: boolean, ip: string) => {
    setAutoConnectEnabled(enabled);
    if (enabled && ip) {
      setMixerIP(ip);
    }
  };

  // Handle password protection settings change
  const handlePasswordProtectionChange = (_enabled: boolean, _password: string) => {
    // This is handled within the VUMeterDashboard component now
  };

  // Handle quick channel configuration from dashboard
  const handleConfigureChannel = (_channel: number) => {
    setConfigPanelTab('faders'); // Set to fader mappings tab
    setCurrentTab('config');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Silence Alarm - Global overlay */}
      <SilenceAlarm />
      
      <div className="container mx-auto p-6">
        <div className="mb-8 app-header-window p-px md:p-0">
          {/* Classic Window Titlebar (Only visible in WinClassic via CSS) */}
          <div className="classic-titlebar hidden">
            <div className="flex items-center gap-1.5 pl-1 classic-title-text">
              <Radio size={14} className="classic-title-icon" />
              <span>X-Air Radio Control</span>
            </div>
            <div className="classic-window-controls flex">
              <button className="win-btn win-minimize" disabled><span>_</span></button>
              <button className="win-btn win-maximize" onClick={toggleFullscreen} title="Toggle Fullscreen"><span>{isFullscreen ? '❐' : '□'}</span></button>
              <button className="win-btn win-close" disabled><span>×</span></button>
            </div>
          </div>

          <div className="app-header-titlebar flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-0 md:p-2">
            <div className="app-header-text-container">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 md:mb-2 flex items-center gap-3 app-header-title">
                <Radio className="text-green-400 app-header-icon" size={32} />
                X-Air Radio Control
              </h1>
              <p className="text-slate-300 app-header-subtitle text-sm md:text-base">Professional X-Air 16/18 Control for Radio Broadcasting</p>
            </div>
            <div className="flex flex-wrap gap-2 app-header-actions w-full md:w-auto justify-end">
              <CloudSyncModal />
              <AdvancedSettingsModal 
                onPasswordProtectionChange={handlePasswordProtectionChange}
                onAutoConnectChange={handleAutoConnectChange}
              />
              <div className="fullscreen-btn-container hidden-in-classic">
                <FullscreenButton />
              </div>
              <HelpModal />
            </div>
          </div>
        </div>

        <ConnectionStatus 
          isConnected={isConnected}
          mixerValidated={mixerValidated}
          mixerStatusMessage={mixerStatusMessage}
          mixerIP={mixerIP}
          mixerModel={mixerModel}
          onConnect={() => {}}
          onIPChange={setMixerIP}
          onModelChange={setMixerModel}
          onConnectMixer={connect}
          onDisconnectMixer={disconnect}
          onValidateMixer={validateMixer}
          onBridgeConfigured={configureBridge}
        />

        {/* Scene Quick Switcher */}
        <div className="mt-4 flex justify-end">
          <SceneQuickSwitcher isConnected={isConnected && mixerValidated} />
        </div>

        <div className="mt-8">
          <Tabs value={currentTab} className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Volume2 size={16} />
                Mixer Dashboard
              </TabsTrigger>
              <TabsTrigger value="meters" className="flex items-center gap-2">
                <Volume2 size={16} />
                VU Meters & Clock
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings size={16} />
                Configuration
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <MixerDashboard 
                isConnected={isConnected && mixerValidated} 
                faderValues={faderValues}
                muteStates={muteStates}
                faderStates={faderStates}
                vuLevels={vuLevels}
                mixerModel={mixerModel}
                onConfigureChannel={handleConfigureChannel}
                channelNames={channelNames}
              />
            </TabsContent>
            
            <TabsContent value="meters">
              <div className="space-y-4">
                {/* Mode Toggle */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      VU Meters & Clock - {isEndUserMode ? 'End User Mode' : 'Admin Mode'}
                    </h2>
                    <p className="text-slate-400">
                      {isEndUserMode 
                        ? 'Protected mode' 
                        : 'Full admin access mode'
                      }
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsEndUserMode(!isEndUserMode)}
                    variant={isEndUserMode ? "secondary" : "default"}
                    className="flex items-center gap-2"
                  >
                    {isEndUserMode ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    {isEndUserMode ? 'Switch to Admin Mode' : 'Switch to End User Mode'}
                  </Button>
                </div>
                
                {/* Dashboard Content */}
                <VUMeterDashboard 
                  isConnected={isConnected && mixerValidated}
                  endUserMode={isEndUserMode}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="config">
              <ConfigurationPanel 
                mixerModel={mixerModel} 
                channelNames={channelNames}
                onSettingsUpdate={reloadMappings}
                isConnected={isConnected && mixerValidated}
                initialTab={configPanelTab}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
