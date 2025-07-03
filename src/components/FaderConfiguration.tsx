
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SettingsService, FaderMappingConfig } from '@/services/settingsService';

interface FaderConfigurationProps {
  onFaderConfigUpdate: (configs: any[]) => void;
}

export const FaderConfiguration: React.FC<FaderConfigurationProps> = ({ onFaderConfigUpdate }) => {
  const [configurations, setConfigurations] = useState<FaderMappingConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<FaderMappingConfig | null>(null);
  const { toast } = useToast();
  const settingsService = SettingsService.getInstance();

  // Load saved configurations on mount
  useEffect(() => {
    const loadSavedConfigurations = () => {
      const savedConfigs = settingsService.getFaderMappings();
      console.log('🔧 Loading fader configurations from settings service:', savedConfigs);
      setConfigurations(savedConfigs);
    };

    loadSavedConfigurations();
  }, []);

  const handleSaveConfig = (config: FaderMappingConfig) => {
    console.log('💾 Saving configuration:', config);
    
    let updatedConfigurations;
    if (editingConfig && editingConfig.id) {
      // Editing existing configuration
      updatedConfigurations = configurations.map(c => c.id === config.id ? config : c);
      console.log('✏️ Updated existing configuration');
    } else {
      // Adding new configuration
      const newConfig = { ...config, id: Date.now().toString() };
      updatedConfigurations = [...configurations, newConfig];
      console.log('➕ Added new configuration');
    }
    
    console.log('📋 All configurations after save:', updatedConfigurations);
    
    setConfigurations(updatedConfigurations);
    
    // Save using settings service and notify parent
    settingsService.updateFaderMappings(updatedConfigurations);
    onFaderConfigUpdate(updatedConfigurations);
    setEditingConfig(null);
    
    toast({
      title: editingConfig && editingConfig.id ? "Configuration Updated" : "Configuration Added",
      description: `Fader ${config.channel} configuration has been ${editingConfig && editingConfig.id ? 'updated' : 'added'}.`,
    });
  };

  const handleDeleteConfig = (id: string) => {
    const updatedConfigurations = configurations.filter(c => c.id !== id);
    setConfigurations(updatedConfigurations);
    
    // Save using settings service and notify parent
    settingsService.updateFaderMappings(updatedConfigurations);
    onFaderConfigUpdate(updatedConfigurations);
    
    toast({
      title: "Configuration Deleted",
      description: "Fader configuration has been removed.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Fader Configurations</h3>
        <Button 
          onClick={() => setEditingConfig({
            id: '',
            channel: 1,
            enabled: true,
            threshold: 50,
            action: 'play',
            radioSoftware: 'mAirList',
            command: '',
            description: '',
            muteEnabled: false,
            muteAction: 'stop',
            muteRadioSoftware: 'mAirList',
            muteCommand: ''
          })}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus size={16} className="mr-2" />
          Add Configuration
        </Button>
      </div>

      <div className="grid gap-4">
        {configurations.map((config) => (
          <Card key={config.id} className="p-4 bg-slate-900/50 border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">Ch {config.channel}</div>
                  <Badge variant={config.enabled ? 'default' : 'secondary'}>
                    {config.enabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white">{config.description || `Channel ${config.channel}`}</h4>
                  <div className="flex items-center gap-2">
                    <Volume2 size={14} className="text-blue-400" />
                    <p className="text-sm text-slate-400">
                      Fader: {config.action.toUpperCase()} on {config.radioSoftware} @ {config.threshold}%
                    </p>
                  </div>
                  {config.muteEnabled && (
                    <div className="flex items-center gap-2">
                      <VolumeX size={14} className="text-red-400" />
                      <p className="text-sm text-slate-400">
                        Mute: {config.muteAction?.toUpperCase()} on {config.muteRadioSoftware}
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                    Fader: {config.command}
                  </p>
                  {config.muteEnabled && config.muteCommand && (
                    <p className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                      Mute: {config.muteCommand}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingConfig(config)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteConfig(config.id)}
                  className="border-red-600 text-red-400 hover:bg-red-600/20"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingConfig && (
        <FaderConfigEditor
          config={editingConfig}
          onSave={handleSaveConfig}
          onCancel={() => setEditingConfig(null)}
        />
      )}
    </div>
  );
};

interface FaderConfigEditorProps {
  config: FaderMappingConfig;
  onSave: (config: FaderMappingConfig) => void;
  onCancel: () => void;
}

const FaderConfigEditor: React.FC<FaderConfigEditorProps> = ({ config, onSave, onCancel }) => {
  const [editConfig, setEditConfig] = useState(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted with config:', editConfig);
    onSave(editConfig);
  };

  return (
    <Card className="p-6 bg-slate-800/80 border-blue-500/50">
      <h3 className="text-lg font-semibold text-white mb-4">
        {config.id ? 'Edit' : 'Add'} Fader Configuration
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="channel" className="text-slate-300">Channel</Label>
            <Input
              id="channel"
              type="number"
              min="1"
              max="18"
              value={editConfig.channel}
              onChange={(e) => setEditConfig(prev => ({ ...prev, channel: parseInt(e.target.value) || 1 }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Input
              id="description"
              value={editConfig.description}
              onChange={(e) => setEditConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Main Jingle Player"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>

        {/* Fader Configuration Section */}
        <div className="border border-slate-600 rounded-lg p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={editConfig.enabled}
              onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, enabled: checked }))}
            />
            <Label htmlFor="enabled" className="text-slate-300 font-medium flex items-center gap-2">
              <Volume2 size={16} className="text-blue-400" />
              Enable Fader Trigger
            </Label>
          </div>

          {editConfig.enabled && (
            <>
              <div>
                <Label htmlFor="threshold" className="text-slate-300">Trigger Threshold (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={editConfig.threshold}
                  onChange={(e) => setEditConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="action" className="text-slate-300">Fader Action</Label>
                  <Select value={editConfig.action} onValueChange={(value) => setEditConfig(prev => ({ ...prev, action: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="play">Play</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="pause">Pause</SelectItem>
                      <SelectItem value="next">Next Track</SelectItem>
                      <SelectItem value="prev">Previous Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="software" className="text-slate-300">Radio Software</Label>
                  <Select value={editConfig.radioSoftware} onValueChange={(value) => setEditConfig(prev => ({ ...prev, radioSoftware: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="mAirList">mAirList</SelectItem>
                      <SelectItem value="RadioDJ">RadioDJ (via mAirList)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="command" className="text-slate-300">Fader Command/URL</Label>
                <Textarea
                  id="command"
                  value={editConfig.command}
                  onChange={(e) => setEditConfig(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="e.g., PLAYER 1 PLAY or http://localhost:9300/api/command"
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        {/* Mute Configuration Section */}
        <div className="border border-slate-600 rounded-lg p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="muteEnabled"
              checked={editConfig.muteEnabled || false}
              onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, muteEnabled: checked }))}
            />
            <Label htmlFor="muteEnabled" className="text-slate-300 font-medium flex items-center gap-2">
              <VolumeX size={16} className="text-red-400" />
              Enable Mute Trigger
            </Label>
          </div>

          {editConfig.muteEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="muteAction" className="text-slate-300">Mute Action</Label>
                  <Select 
                    value={editConfig.muteAction || 'stop'} 
                    onValueChange={(value) => setEditConfig(prev => ({ ...prev, muteAction: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="play">Play</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="pause">Pause</SelectItem>
                      <SelectItem value="next">Next Track</SelectItem>
                      <SelectItem value="prev">Previous Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="muteSoftware" className="text-slate-300">Radio Software</Label>
                  <Select 
                    value={editConfig.muteRadioSoftware || 'mAirList'} 
                    onValueChange={(value) => setEditConfig(prev => ({ ...prev, muteRadioSoftware: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="mAirList">mAirList</SelectItem>
                      <SelectItem value="RadioDJ">RadioDJ (via mAirList)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="muteCommand" className="text-slate-300">Mute Command/URL</Label>
                <Textarea
                  id="muteCommand"
                  value={editConfig.muteCommand || ''}
                  onChange={(e) => setEditConfig(prev => ({ ...prev, muteCommand: e.target.value }))}
                  placeholder="e.g., PLAYER 1 STOP or http://localhost:9300/api/stop"
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300">
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Save Configuration
          </Button>
        </div>
      </form>
    </Card>
  );
};
