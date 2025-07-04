
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioSoftwareConfig } from '@/components/RadioSoftwareConfig';
import { FaderMappingConfig } from '@/components/FaderMappingConfig';
import { Settings, Radio, Volume2 } from 'lucide-react';

interface ConfigurationPanelProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ mixerModel }) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Settings className="text-blue-400" size={28} />
          Configuration
        </h2>
        <p className="text-slate-300">Configure radio software integration and fader mappings</p>
      </div>

      <Tabs defaultValue="radio" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="radio" className="flex items-center gap-2">
            <Radio size={16} />
            Radio Software
          </TabsTrigger>
          <TabsTrigger value="faders" className="flex items-center gap-2">
            <Volume2 size={16} />
            Fader Mappings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="radio" className="mt-6">
          <RadioSoftwareConfig />
        </TabsContent>
        
        <TabsContent value="faders" className="mt-6">
          <FaderMappingConfig mixerModel={mixerModel} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
