import React, { useState } from 'react';
import { MixerDashboard } from '@/components/MixerDashboard';
import { ConfigurationPanel } from '@/components/ConfigurationPanel';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Radio, Sliders } from 'lucide-react';
import { useMixer } from '@/hooks/useMixer';

const Index = () => {
  const [mixerIP, setMixerIP] = useState('192.168.1.10');
  // Set default to X-Air 18 since your logs show XR18
  const [mixerModel, setMixerModel] = useState<'X-Air 16' | 'X-Air 18'>('X-Air 18');
  const { 
    isConnected, 
    mixerValidated,
    mixerStatusMessage,
    faderValues, 
    connect, 
    disconnect, 
    validateMixer,
    configureBridge,
    updateFaderConfig, 
    testRadioConnection 
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
          onConnect={() => {}} // Handled by useMixer hook
          onIPChange={setMixerIP}
          onModelChange={setMixerModel}
          onConnectMixer={connect}
          onDisconnectMixer={disconnect}
          onValidateMixer={validateMixer}
          onBridgeConfigured={configureBridge}
        />

        <Tabs defaultValue="dashboard" className="mt-8">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-green-600">
              <Sliders size={16} />
              Mixer Dashboard
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
              <Settings size={16} />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <MixerDashboard 
              isConnected={isConnected && mixerValidated} 
              faderValues={faderValues}
              testRadioConnection={testRadioConnection}
              mixerModel={mixerModel}
            />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <ConfigurationPanel 
              onFaderConfigUpdate={updateFaderConfig}
              testRadioConnection={testRadioConnection}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
