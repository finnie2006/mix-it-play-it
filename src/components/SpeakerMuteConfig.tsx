import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SpeakerMuteConfig as SpeakerConfig, SettingsService } from '@/services/settingsService';
import { VolumeX, Mic, Settings, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpeakerMuteConfigProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  onSettingsUpdate?: () => void;
}

export const SpeakerMuteConfig: React.FC<SpeakerMuteConfigProps> = ({
  mixerModel,
  onSettingsUpdate
}) => {
  const [config, setConfig] = useState<SpeakerConfig>(() =>
    SettingsService.loadSettings().speakerMute
  );
  const { toast } = useToast();

  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;

  const handleSave = () => {
    SettingsService.updateSpeakerMute(config);

    // Trigger settings reload in fader mapping service
    if (onSettingsUpdate) {
      onSettingsUpdate();
    }

    toast({
      title: "Settings Saved",
      description: "Speaker mute configuration has been saved successfully.",
    });
  };

  const handleConfigChange = (key: keyof SpeakerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleChannelToggle = (channel: number) => {
    const newChannels = config.triggerChannels.includes(channel)
      ? config.triggerChannels.filter(c => c !== channel)
      : [...config.triggerChannels, channel].sort((a, b) => a - b);
    
    handleConfigChange('triggerChannels', newChannels);
  };

  const handleSelectAllMics = () => {
    // Typical mic channels are 1-4 for most radio setups
    const micChannels = [1, 2, 3, 4];
    handleConfigChange('triggerChannels', micChannels);
  };

  const handleClearAll = () => {
    handleConfigChange('triggerChannels', []);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <VolumeX className="text-red-400" size={20} />
          Speaker Mute Configuration
        </CardTitle>
        <CardDescription className="text-slate-300">
          Automatically mute main speakers when microphone channels are opened
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Panel */}
        <Card className="bg-blue-900/20 border-blue-600/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-400 mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-400">Radio Speaker Mute</h4>
                <p className="text-sm text-slate-300">
                  This feature automatically mutes your main speakers when microphone channels are opened above the threshold.
                  This prevents audio feedback during live broadcasts when presenters are speaking.
                </p>
                <div className="text-xs text-slate-400 space-y-1">
                  <div><strong>Bus Mute:</strong> Mutes a specific bus output (e.g., Bus 1 for main speakers)</div>
                  <div><strong>Mute Group:</strong> Activates a mute group that can control multiple channels</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enable/Disable */}
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
          />
          <Label className="text-slate-200">Enable Speaker Mute</Label>
        </div>

        {config.enabled && (
          <>
            {/* Trigger Channels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-200">Trigger Channels (Microphones)</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSelectAllMics}
                    size="sm"
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <Mic size={14} className="mr-1" />
                    Select Mics 1-4
                  </Button>
                  {config.triggerChannels.length > 0 && (
                    <Button
                      onClick={handleClearAll}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: maxChannels }, (_, i) => {
                  const channel = i + 1;
                  const isSelected = config.triggerChannels.includes(channel);
                  return (
                    <button
                      key={channel}
                      onClick={() => handleChannelToggle(channel)}
                      className={`p-3 text-sm rounded border transition-colors ${
                        isSelected
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      CH {channel}
                    </button>
                  );
                })}
              </div>
              
              {config.triggerChannels.length > 0 && (
                <div className="text-sm text-slate-400">
                  Selected channels: {config.triggerChannels.join(', ')}
                </div>
              )}
            </div>

            {/* Threshold */}
            <div className="space-y-2">
              <Label className="text-slate-200">Trigger Threshold (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={config.threshold}
                onChange={(e) => handleConfigChange('threshold', parseInt(e.target.value) || 10)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400">
                Speakers will be muted when any selected channel goes above this threshold
              </p>
            </div>

            {/* Mute Type */}
            <div className="space-y-2">
              <Label className="text-slate-200">Mute Method</Label>
              <Select
                value={config.muteType}
                onValueChange={(value: 'bus' | 'muteGroup') => handleConfigChange('muteType', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="bus" className="text-white hover:bg-slate-600">
                    Bus Mute (recommended)
                  </SelectItem>
                  <SelectItem value="muteGroup" className="text-white hover:bg-slate-600">
                    Mute Group
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bus/Mute Group Number */}
            <div className="space-y-2">
              <Label className="text-slate-200">
                {config.muteType === 'bus' ? 'Bus Number' : 'Mute Group Number'}
              </Label>
              <Select
                value={(config.muteType === 'bus' ? config.busNumber : config.muteGroupNumber)?.toString() || '1'}
                onValueChange={(value) => {
                  const num = parseInt(value);
                  if (config.muteType === 'bus') {
                    handleConfigChange('busNumber', num);
                  } else {
                    handleConfigChange('muteGroupNumber', num);
                  }
                }}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {Array.from({ length: 6 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()} className="text-white hover:bg-slate-600">
                      {config.muteType === 'bus' ? `Bus ${num}` : `Mute Group ${num}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                {config.muteType === 'bus' 
                  ? 'Select which bus output to mute (typically Bus 1 for main speakers)'
                  : 'Select which mute group to activate (configure in X-Air Edit app)'
                }
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-slate-200">Description</Label>
              <Textarea
                value={config.description}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                placeholder="e.g., Mute main speakers when mics are open"
                rows={2}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* OSC Command Preview */}
            <Card className="bg-slate-900/50 border-slate-600">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">OSC Command Preview</Label>
                  <div className="text-xs font-mono text-slate-400 bg-slate-800 p-2 rounded">
                    {config.muteType === 'bus' 
                      ? `/bus/${config.busNumber || 1}/mix/on 0` 
                      : `/config/mute/${config.muteGroupNumber || 1} 1`
                    }
                  </div>
                  <p className="text-xs text-slate-500">
                    This command will be sent to mute when trigger channels are above threshold
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700">
              <Settings size={16} className="mr-2" />
              Save Speaker Mute Configuration
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
