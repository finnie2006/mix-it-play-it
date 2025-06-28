
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FaderConfig {
  id: string;
  channel: number;
  enabled: boolean;
  threshold: number;
  action: string;
  radioSoftware: string;
  command: string;
  description: string;
}

export const FaderConfiguration: React.FC = () => {
  const [configurations, setConfigurations] = useState<FaderConfig[]>([
    {
      id: '1',
      channel: 1,
      enabled: true,
      threshold: 50,
      action: 'play',
      radioSoftware: 'mairlist',
      command: 'PLAYER 1 PLAY',
      description: 'Main Jingle Player'
    },
    {
      id: '2',
      channel: 2,
      enabled: true,
      threshold: 60,
      action: 'stop',
      radioSoftware: 'mairlist',
      command: 'PLAYER 2 STOP',
      description: 'Music Stop'
    }
  ]);

  const [editingConfig, setEditingConfig] = useState<FaderConfig | null>(null);
  const { toast } = useToast();

  const handleSaveConfig = (config: FaderConfig) => {
    if (editingConfig) {
      setConfigurations(prev => prev.map(c => c.id === config.id ? config : c));
      toast({
        title: "Configuration Updated",
        description: `Fader ${config.channel} configuration has been updated.`,
      });
    } else {
      setConfigurations(prev => [...prev, { ...config, id: Date.now().toString() }]);
      toast({
        title: "Configuration Added",
        description: `New fader configuration for channel ${config.channel} has been added.`,
      });
    }
    setEditingConfig(null);
  };

  const handleDeleteConfig = (id: string) => {
    setConfigurations(prev => prev.filter(c => c.id !== id));
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
            radioSoftware: 'mairlist',
            command: '',
            description: ''
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
                  <p className="text-sm text-slate-400">
                    {config.action.toUpperCase()} on {config.radioSoftware} @ {config.threshold}%
                  </p>
                  <p className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                    {config.command}
                  </p>
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
  config: FaderConfig;
  onSave: (config: FaderConfig) => void;
  onCancel: () => void;
}

const FaderConfigEditor: React.FC<FaderConfigEditorProps> = ({ config, onSave, onCancel }) => {
  const [editConfig, setEditConfig] = useState(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editConfig);
  };

  return (
    <Card className="p-6 bg-slate-800/80 border-blue-500/50">
      <h3 className="text-lg font-semibold text-white mb-4">
        {config.id ? 'Edit' : 'Add'} Fader Configuration
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="channel" className="text-slate-300">Channel</Label>
            <Input
              id="channel"
              type="number"
              min="1"
              max="18"
              value={editConfig.channel}
              onChange={(e) => setEditConfig(prev => ({ ...prev, channel: parseInt(e.target.value) }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="threshold" className="text-slate-300">Trigger Threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              max="100"
              value={editConfig.threshold}
              onChange={(e) => setEditConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="action" className="text-slate-300">Action</Label>
            <Select value={editConfig.action} onValueChange={(value) => setEditConfig(prev => ({ ...prev, action: value }))}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              <SelectContent>
                <SelectItem value="mairlist">mAirList</SelectItem>
                <SelectItem value="radiodj">RadioDJ</SelectItem>
                <SelectItem value="custom">Custom HTTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="command" className="text-slate-300">Command/URL</Label>
          <Textarea
            id="command"
            value={editConfig.command}
            onChange={(e) => setEditConfig(prev => ({ ...prev, command: e.target.value }))}
            placeholder="e.g., PLAYER 1 PLAY or http://localhost:9300/api/command"
            className="bg-slate-700 border-slate-600 text-white"
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={editConfig.enabled}
            onCheckedChange={(checked) => setEditConfig(prev => ({ ...prev, enabled: checked }))}
          />
          <Label htmlFor="enabled" className="text-slate-300">Enable this configuration</Label>
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
