import React, { useState } from 'react';
import { MixerDashboard } from '@/components/MixerDashboard';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { VUMeterDashboard } from '@/components/VUMeterDashboard';
import { HelpModal } from '@/components/HelpModal';
import { AdvancedSettingsModal } from '@/components/AdvancedSettingsModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Radio, Volume2, Settings, Activity, Shield, ShieldOff } from 'lucide-react';
import { useMixer } from '@/hooks/useMixer';
import { FullscreenButton } from '@/components/FullscreenButton';

const Index = () => {
  const [mixerIP, setMixerIP] = useState('192.168.1.10');
  const [mixerModel, setMixerModel] = useState<'X-Air 16' | 'X-Air 18'>('X-Air 18');
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(false);
  const [isEndUserMode, setIsEndUserMode] = useState(false);
  
  const { 
    isConnected, 
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    faderStates,
    vuLevels,
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
      } catch (error) {
        console.error('Failed to load auto-connect settings:', error);
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
  const handlePasswordProtectionChange = (enabled: boolean, password: string) => {
    // This is handled within the VUMeterDashboard component now
    // Just acknowledge the change
  };

  // Handle quick channel configuration from dashboard
  const handleConfigureChannel = (channel: number) => {
    setCurrentTab('config');
    // TODO: Could add specific channel focus/scroll functionality here
    console.log(`Navigating to configuration for channel ${channel}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Radio className="text-green-400" size={36} />
              X-Air Radio Mode
            </h1>
            <p className="text-slate-300">Professional X-Air 16/18 Control for Radio Broadcasting</p>
          </div>
          <div className="flex gap-2">
            <AdvancedSettingsModal 
              onPasswordProtectionChange={handlePasswordProtectionChange}
              onAutoConnectChange={handleAutoConnectChange}
            />
            <FullscreenButton />
            <HelpModal />
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

        <div className="mt-8">
          <Tabs value={currentTab} className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Volume2 size={16} />
                Mixer Dashboard
              </TabsTrigger>
              <TabsTrigger value="meters" className="flex items-center gap-2">
                <Activity size={16} />
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
                        ? 'Protected mode with working password exit functionality' 
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
              <ConfigurationPanel mixerModel={mixerModel} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
