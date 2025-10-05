import React, { useRef } from 'react';
import { SettingsService, ChannelNameMap } from '@/services/settingsService';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioSoftwareConfig } from '@/components/RadioSoftwareConfig';
import { FaderMappingConfig } from '@/components/FaderMappingConfig';
import { SpeakerMuteConfig } from '@/components/SpeakerMuteConfig';
import { Settings, Radio, Volume2, VolumeX } from 'lucide-react';

interface ConfigurationPanelProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  channelNames?: ChannelNameMap;
  onSettingsUpdate?: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  mixerModel,
  channelNames = {},
  onSettingsUpdate
}) => {

  // Backup logic
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const settings = SettingsService.loadSettings();
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xair-settings-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        // Optionally validate structure here
        SettingsService.saveSettings(imported);
        if (onSettingsUpdate) onSettingsUpdate();
        window.location.reload(); // Ensure all settings reload
      } catch (err) {
        alert('Failed to import settings: ' + err);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings className="text-blue-400" size={28} />
            Configuration
          </h2>
          <p className="text-slate-300">Configure radio software integration, fader mappings, and speaker mute</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleBackup} title="Download settings backup">
            <Download size={16} />
            Backup Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleImportClick} title="Import settings backup">
            <Upload size={16} />
            Import Backup
          </Button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
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
          <FaderMappingConfig 
            mixerModel={mixerModel} 
            channelNames={channelNames}
            onSettingsUpdate={onSettingsUpdate} 
          />
        </TabsContent>

        <TabsContent value="speakers" className="mt-6">
          <SpeakerMuteConfig 
            mixerModel={mixerModel} 
            channelNames={channelNames}
            onSettingsUpdate={onSettingsUpdate} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
