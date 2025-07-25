import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioSoftwareConfig } from '@/components/RadioSoftwareConfig';
import { FaderMappingConfig } from '@/components/FaderMappingConfig';
import { SpeakerMuteConfig } from '@/components/SpeakerMuteConfig';
import { Settings, Radio, Volume2, VolumeX } from 'lucide-react';

interface ConfigurationPanelProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  onSettingsUpdate?: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  mixerModel,
  onSettingsUpdate
}) => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Settings className="text-blue-400" size={28} />
          Configuration
        </h2>
        <p className="text-slate-300">Configure radio software integration, fader mappings, and speaker mute</p>
      </div>

      <Tabs defaultValue="radio" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
          <TabsTrigger value="radio" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Radio size={16} />
            Radio Software
          </TabsTrigger>
          <TabsTrigger value="faders" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Volume2 size={16} />
            Fader Mappings
          </TabsTrigger>
          <TabsTrigger value="speakers" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <VolumeX size={16} />
            Speaker Mute
          </TabsTrigger>
        </TabsList>

        <TabsContent value="radio" className="mt-6">
          <RadioSoftwareConfig onSettingsUpdate={onSettingsUpdate} />
        </TabsContent>

        <TabsContent value="faders" className="mt-6">
          <FaderMappingConfig mixerModel={mixerModel} onSettingsUpdate={onSettingsUpdate} />
        </TabsContent>

        <TabsContent value="speakers" className="mt-6">
          <SpeakerMuteConfig mixerModel={mixerModel} onSettingsUpdate={onSettingsUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
