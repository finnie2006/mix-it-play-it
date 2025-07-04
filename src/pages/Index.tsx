
import React, { useState } from 'react';
import { MixerDashboard } from '@/components/MixerDashboard';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Volume2, Settings } from 'lucide-react';
import { useMixer } from '@/hooks/useMixer';

const Index = () => {
  const [mixerIP, setMixerIP] = useState('192.168.1.10');
  const [mixerModel, setMixerModel] = useState<'X-Air 16' | 'X-Air 18'>('X-Air 18');
  
  const { 
    isConnected, 
    mixerValidated,
    mixerStatusMessage,
    faderValues,
    muteStates,
    connect, 
    disconnect, 
    validateMixer,
    configureBridge
  } = useMixer({ ip: mixerIP, port: 10024, model: mixerModel });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Radio className="text-green-400" size={36} />
            X-Air Radio Controller
          </h1>
          <p className="text-slate-300">Behringer X-Air 16/18 Radio Automation Interface</p>
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
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Volume2 size={16} />
                Mixer Dashboard
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
                mixerModel={mixerModel}
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
