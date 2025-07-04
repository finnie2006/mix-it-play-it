

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FaderMapping, SettingsService } from '@/services/settingsService';
import { Plus, Trash2, Volume2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FaderMappingConfigProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
}

export const FaderMappingConfig: React.FC<FaderMappingConfigProps> = ({ mixerModel }) => {
  const [mappings, setMappings] = useState<FaderMapping[]>(() => 
    SettingsService.loadSettings().faderMappings
  );
  const [editingMapping, setEditingMapping] = useState<Partial<FaderMapping> | null>(null);
  const { toast } = useToast();

  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;

  const handleSaveMappings = () => {
    SettingsService.updateFaderMappings(mappings);
    toast({
      title: "Settings Saved",
      description: "Fader mappings have been saved successfully.",
    });
  };

  const handleAddMapping = () => {
    setEditingMapping({
      channel: 1,
      isStereo: false,
      threshold: 10,
      command: 'PLAYER 1 PLAY',
      enabled: true,
      description: 'New Fader Mapping'
    });
  };

  const handleSaveMapping = () => {
    if (!editingMapping) return;

    if (editingMapping.id) {
      // Update existing
      const updatedMappings = mappings.map(m => 
        m.id === editingMapping.id ? { ...m, ...editingMapping } as FaderMapping : m
      );
      setMappings(updatedMappings);
    } else {
      // Add new
      const newMapping: FaderMapping = {
        ...editingMapping as Omit<FaderMapping, 'id'>,
        id: `fader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setMappings([...mappings, newMapping]);
    }

    setEditingMapping(null);
    toast({
      title: "Mapping Saved",
      description: "Fader mapping has been configured successfully.",
    });
  };

  const handleEditMapping = (mapping: FaderMapping) => {
    setEditingMapping({ ...mapping });
  };

  const handleDeleteMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
    toast({
      title: "Mapping Deleted",
      description: "Fader mapping has been removed.",
      variant: "destructive",
    });
  };

  const handleToggleMapping = (id: string, enabled: boolean) => {
    const updatedMappings = mappings.map(m => 
      m.id === id ? { ...m, enabled } : m
    );
    setMappings(updatedMappings);
  };

  // Check if channel is already used
  const isChannelUsed = (channel: number, isStereo: boolean, excludeId?: string) => {
    return mappings.some(m => {
      if (excludeId && m.id === excludeId) return false;
      
      if (m.isStereo) {
        // Stereo mapping uses current channel and next
        return channel === m.channel || channel === m.channel + 1 ||
               (isStereo && (channel + 1 === m.channel || channel + 1 === m.channel + 1));
      } else {
        // Mono mapping
        return channel === m.channel || (isStereo && channel + 1 === m.channel);
      }
    });
  };

  const getChannelDisplay = (mapping: FaderMapping) => {
    return mapping.isStereo ? `${mapping.channel}-${mapping.channel + 1}` : mapping.channel.toString();
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Volume2 className="text-green-400" size={20} />
          Fader Mappings
        </CardTitle>
        <CardDescription className="text-slate-300">
          Configure which faders trigger radio software commands
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">
            {mappings.length} mapping(s) configured
          </span>
          <Button onClick={handleAddMapping} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus size={16} className="mr-2" />
            Add Mapping
          </Button>
        </div>

        {/* Existing Mappings */}
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <Card key={mapping.id} className="bg-slate-700/50 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={mapping.enabled}
                          onCheckedChange={(checked) => handleToggleMapping(mapping.id, checked)}
                        />
                        <span className="font-medium text-white">
                          CH {getChannelDisplay(mapping)}
                          {mapping.isStereo && " (Stereo)"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Threshold: {mapping.threshold}%
                      </div>
                      <div className="text-sm text-slate-300">
                        {mapping.description}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      {mapping.command}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditMapping(mapping)}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-600"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit/Add Mapping Form */}
        {editingMapping && (
          <Card className="bg-blue-900/30 border-blue-600/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                {editingMapping.id ? 'Edit' : 'Add'} Fader Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Channel</Label>
                  <Select
                    value={editingMapping.channel?.toString()}
                    onValueChange={(value) => setEditingMapping(prev => ({ ...prev, channel: parseInt(value) }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {Array.from({ length: maxChannels }, (_, i) => {
                        const channel = i + 1;
                        const wouldBeUsed = isChannelUsed(channel, editingMapping.isStereo || false, editingMapping.id);
                        const isLastChannel = editingMapping.isStereo && channel === maxChannels;
                        
                        return (
                          <SelectItem 
                            key={channel} 
                            value={channel.toString()}
                            disabled={wouldBeUsed || isLastChannel}
                            className="text-white hover:bg-slate-600"
                          >
                            Channel {channel} {wouldBeUsed && "(Used)"} {isLastChannel && "(Can't be stereo)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Threshold (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={editingMapping.threshold || 10}
                    onChange={(e) => setEditingMapping(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingMapping.isStereo || false}
                  onCheckedChange={(checked) => setEditingMapping(prev => ({ ...prev, isStereo: checked }))}
                />
                <Label className="text-slate-200">Stereo (uses this channel + next channel)</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Description</Label>
                <Input
                  value={editingMapping.description || ''}
                  onChange={(e) => setEditingMapping(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Main Music Player"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Command</Label>
                <Textarea
                  value={editingMapping.command || ''}
                  onChange={(e) => setEditingMapping(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="e.g., PLAYER 1 PLAY"
                  rows={2}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveMapping} className="bg-green-600 hover:bg-green-700">
                  Save Mapping
                </Button>
                <Button onClick={() => setEditingMapping(null)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-600">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mappings.length > 0 && (
          <Button onClick={handleSaveMappings} className="w-full bg-blue-600 hover:bg-blue-700">
            <Settings size={16} className="mr-2" />
            Save All Mappings
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
