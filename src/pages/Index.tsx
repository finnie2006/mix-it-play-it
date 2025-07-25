import React, { useState } from 'react';
import { MixerDashboard } from '@/components/MixerDashboard';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { VUMeterDashboard } from '@/components/VUMeterDashboard';
import { HelpModal } from '@/components/HelpModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Volume2, Settings, Activity } from 'lucide-react';
import { useMixer } from '@/hooks/useMixer';
import { FullscreenButton } from '@/components/FullscreenButton';

const Index = () => {
  const [mixerIP, setMixerIP] = useState('192.168.1.10');
  const [mixerModel, setMixerModel] = useState<'X-Air 16' | 'X-Air 18'>('X-Air 18');
  
  const { 
    isConnected, 
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    faderStates,
    connect, 
    disconnect, 
    validateMixer,
    configureBridge,
    reloadMappings
  } = useMixer({ ip: mixerIP, port: 10024, model: mixerModel });

  // Reload mappings when tab changes to dashboard (to pick up any new settings)
  const handleTabChange = (value: string) => {
    if (value === 'dashboard') {
      reloadMappings();
    }
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
          <Tabs defaultValue="dashboard" className="w-full" onValueChange={handleTabChange}>
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
                mixerModel={mixerModel}
              />
            </TabsContent>
            
            <TabsContent value="meters">
              <VUMeterDashboard 
                isConnected={isConnected && mixerValidated}
              />
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
