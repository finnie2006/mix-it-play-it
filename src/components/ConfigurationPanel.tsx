import React, { useRef } from 'react';
import { SettingsService, ChannelNameMap } from '@/services/settingsService';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioSoftwareConfig } from '@/components/RadioSoftwareConfig';
import { FaderMappingConfig } from '@/components/FaderMappingConfig';
import { SpeakerMuteConfig } from '@/components/SpeakerMuteConfig';
import { SceneManager } from '@/components/SceneManager';
import { ChannelNamingConfig } from '@/components/ChannelNamingConfig';
import { LedControlConfig } from '@/components/LedControlConfig';
import { Settings, Radio, Volume2, VolumeX, Film, Tag, Lightbulb } from 'lucide-react';

interface ConfigurationPanelProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  channelNames?: ChannelNameMap;
  onSettingsUpdate?: () => void;
  isConnected?: boolean;
  initialTab?: string;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  mixerModel,
  channelNames = {},
  onSettingsUpdate,
  isConnected = false,
  initialTab = 'radio'
}) => {

  // Backup logic
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    // Gather ALL settings from localStorage
    const comprehensiveBackup = {
      // Core settings from SettingsService
      coreSettings: SettingsService.loadSettings(),
      
      // Additional settings from other services
      silenceDetection: JSON.parse(localStorage.getItem('silence-detection-config') || 'null'),
      colorScheme: localStorage.getItem('color-scheme'),
      channelNames: JSON.parse(localStorage.getItem('channel-names') || 'null'),
      cloudSyncSettings: JSON.parse(localStorage.getItem('cloud-sync-settings') || 'null'),
      advancedSettings: JSON.parse(localStorage.getItem('advancedSettings') || 'null'),
      ledControl: JSON.parse(localStorage.getItem('xair-led-control-config') || 'null'),
      
      // Scene configurations
      scenes: JSON.parse(localStorage.getItem('mixer-scenes') || 'null'),
      
      // Backup metadata
      backupDate: new Date().toISOString(),
      backupVersion: '2.1', // Version to track backup format changes
    };

    const blob = new Blob([JSON.stringify(comprehensiveBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xair-complete-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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
        
        // Check if this is a comprehensive backup (v2.0+) or legacy backup
        if (imported.backupVersion && imported.coreSettings) {
          // New comprehensive backup format
          console.log('📦 Restoring comprehensive backup from', imported.backupDate);
          
          // Restore core settings
          if (imported.coreSettings) {
            SettingsService.saveSettings(imported.coreSettings);
          }
          
          // Restore additional settings
          if (imported.silenceDetection) {
            localStorage.setItem('silence-detection-config', JSON.stringify(imported.silenceDetection));
          }
          if (imported.colorScheme) {
            localStorage.setItem('color-scheme', imported.colorScheme);
          }
          if (imported.channelNames) {
            localStorage.setItem('channel-names', JSON.stringify(imported.channelNames));
          }
          if (imported.cloudSyncSettings) {
            localStorage.setItem('cloud-sync-settings', JSON.stringify(imported.cloudSyncSettings));
          }
          if (imported.advancedSettings) {
            localStorage.setItem('advancedSettings', JSON.stringify(imported.advancedSettings));
          }
          if (imported.ledControl) {
            localStorage.setItem('xair-led-control-config', JSON.stringify(imported.ledControl));
          }
          if (imported.scenes) {
            localStorage.setItem('mixer-scenes', JSON.stringify(imported.scenes));
          }
          
          alert('✅ Complete backup restored successfully! Page will reload.');
        } else {
          // Legacy backup format (just core settings)
          console.log('📦 Restoring legacy backup');
          SettingsService.saveSettings(imported);
          alert('✅ Settings restored successfully! Page will reload.');
        }
        
        if (onSettingsUpdate) onSettingsUpdate();
        
        // Reload to apply all changes
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (err) {
        alert('❌ Failed to import settings: ' + err);
        console.error('Import error:', err);
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
          <Button variant="outline" className="flex items-center gap-2" onClick={handleBackup} title="Download complete backup (all settings, scenes, and configurations)">
            <Download size={16} />
            Backup All Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleImportClick} title="Import settings backup (supports both new and legacy formats)">
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

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-slate-800/50 border-slate-700">
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
          <TabsTrigger value="led" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Lightbulb size={16} />
            LED Control
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Tag size={16} />
            Channel Names
          </TabsTrigger>
          <TabsTrigger value="scenes" className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Film size={16} />
            Scenes
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

        <TabsContent value="led" className="mt-6">
          <LedControlConfig />
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <ChannelNamingConfig 
            mixerModel={mixerModel}
            isConnected={isConnected} 
          />
        </TabsContent>

        <TabsContent value="scenes" className="mt-6">
          <SceneManager isConnected={isConnected} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
