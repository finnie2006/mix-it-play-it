import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FaderMapping, SettingsService } from '@/services/settingsService';
import { Plus, Trash2, Volume2, Settings, HelpCircle, Copy, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FaderMappingConfigProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  onSettingsUpdate?: () => void;
}

export const FaderMappingConfig: React.FC<FaderMappingConfigProps> = ({
  mixerModel,
  onSettingsUpdate
}) => {
  const [mappings, setMappings] = useState<FaderMapping[]>(() =>
    SettingsService.loadSettings().faderMappings
  );
  const [editingMapping, setEditingMapping] = useState<Partial<FaderMapping> | null>(null);
  const [showCommandExamples, setShowCommandExamples] = useState(false);
  const { toast } = useToast();

  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;
  const radioSoftwareType = SettingsService.loadSettings().radioSoftware.type;

  const handleSaveMappings = () => {
    SettingsService.updateFaderMappings(mappings);

    // Trigger settings reload in fader mapping service
    if (onSettingsUpdate) {
      onSettingsUpdate();
    }

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

    let updatedMappings: FaderMapping[];

    if (editingMapping.id) {
      // Update existing
      updatedMappings = mappings.map(m =>
        m.id === editingMapping.id ? { ...m, ...editingMapping } as FaderMapping : m
      );
    } else {
      // Add new
      const newMapping: FaderMapping = {
        ...editingMapping as Omit<FaderMapping, 'id'>,
        id: `fader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      updatedMappings = [...mappings, newMapping];
    }

    setMappings(updatedMappings);

    // Save to persistent storage immediately
    SettingsService.updateFaderMappings(updatedMappings);

    // Trigger settings reload in fader mapping service
    if (onSettingsUpdate) {
      onSettingsUpdate();
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
    const updatedMappings = mappings.filter(m => m.id !== id);
    setMappings(updatedMappings);

    // Save to persistent storage immediately
    SettingsService.updateFaderMappings(updatedMappings);

    // Trigger settings reload in fader mapping service
    if (onSettingsUpdate) {
      onSettingsUpdate();
    }

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

    // Save to persistent storage immediately
    SettingsService.updateFaderMappings(updatedMappings);

    // Trigger settings reload in fader mapping service
    if (onSettingsUpdate) {
      onSettingsUpdate();
    }
  };

  const handleCopyJSON = async () => {
    const currentSettings = SettingsService.loadSettings();

    const bridgeSettings = {
      mixer: {
        ip: "192.168.1.67",
        port: 10024
      },
      radioSoftware: currentSettings.radioSoftware,
      faderMappings: mappings,
      lastUpdated: new Date().toISOString()
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(bridgeSettings, null, 2));
      toast({
        title: "JSON Copied!",
        description: `Configuration with ${mappings.length} fader mappings copied to clipboard. Paste this into bridge-settings.json for bridge-only mode.`,
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(bridgeSettings, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      toast({
        title: "JSON Copied!",
        description: `Configuration with ${mappings.length} fader mappings copied to clipboard. Paste this into bridge-settings.json for bridge-only mode.`,
      });
    }
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
          <div className="flex gap-2">
            {mappings.length > 0 && (
              <Button
                onClick={handleCopyJSON}
                size="sm"
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Copy size={16} className="mr-2" />
                Copy JSON
              </Button>
            )}
            <Button onClick={handleAddMapping} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus size={16} className="mr-2" />
              Add Mapping
            </Button>
          </div>
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

        {/* Bridge-Only Mode Instructions */}
        {mappings.length > 0 && (
          <Card className="bg-blue-900/20 border-blue-600/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-400">Bridge-Only Mode Setup</h4>
                  <p className="text-sm text-slate-300">
                    To use these fader mappings in bridge-only mode (headless operation):
                  </p>
                  <ol className="text-sm text-slate-300 space-y-1 ml-4 list-decimal">
                    <li>Click "Copy JSON" above to copy the complete configuration</li>
                    <li>Save it as <code className="bg-slate-700 px-1 rounded text-blue-300">bridge-settings.json</code> in your project folder</li>
                    <li>Run <code className="bg-slate-700 px-1 rounded text-blue-300">node start-bridge-only.js</code> to start headless mode</li>
                    <li>The bridge will automatically load your fader mappings and radio settings</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <Label className="text-slate-200">Fade Up Threshold (%)</Label>
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
                <div className="flex items-center gap-2">
                  <Label className="text-slate-200">Fade Up Command</Label>
                  <Dialog open={showCommandExamples} onOpenChange={setShowCommandExamples}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-6 px-2"
                      >
                        <HelpCircle size={14} className="mr-1" />
                        Examples
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-white">Command Examples</DialogTitle>
                        <DialogDescription className="text-slate-300">
                          Example commands for {radioSoftwareType === 'radiodj' ? 'RadioDJ' : 'mAirList'} automation
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {radioSoftwareType === 'radiodj' ? (
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-green-400 mb-2">Player Controls</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>PlayPlaylist</div>
                                <div>StopPlayer</div>
                                <div>PausePlayer</div>
                                <div>RestartPlayer</div>
                                <div>PlayFromIntro</div>
                                <div>RemovePlaylist</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-400 mb-2">Playlist Management</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>ClearPlaylist</div>
                                <div>Loop</div>
                                <div>Record</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-purple-400 mb-2">Automation</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>EnableAutomation</div>
                                <div>DisableAutomation</div>
                                <div>EnableAssisted</div>
                                <div>DisableAssisted</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-orange-400 mb-2">Cart Players</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>LoadCart 1,1234</div>
                                <div>PlayCart 1</div>
                                <div>StopCart 1</div>
                                <div>PlayInstantCart 1234</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-green-400 mb-2">Player Controls</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>PLAYER 1-1 START</div>
                                <div>PLAYER 1-1 STOP</div>
                                <div>PLAYER 1-1 PAUSE</div>
                                <div>PLAYER 1-1 FADEOUT</div>
                                <div>PLAYER 1-2 START</div>
                                <div>ALL PLAYERS STOP</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-400 mb-2">Automation</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>AUTOMATION 1 ON</div>
                                <div>AUTOMATION 1 OFF</div>
                                <div>AUTOMATION 1 PLAY</div>
                                <div>AUTOMATION 1 STOP</div>
                                <div>AUTOMATION 1 BREAK</div>
                                <div>AUTOMATION 1 NEXT</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-purple-400 mb-2">Playlist Operations</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>PLAYLIST 1 LOAD C:\music\playlist.mlp</div>
                                <div>PLAYLIST 1 CLEAR</div>
                                <div>PLAYLIST 1 NEXT</div>
                                <div>PLAYLIST 1 CURSOR DOWN</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-orange-400 mb-2">Cartwall & Audio</h4>
                              <div className="space-y-1 text-sm font-mono bg-slate-900 p-3 rounded">
                                <div>CARTWALL ALL CLICK</div>
                                <div>PLAYER 1-1 VOLUME -6</div>
                                <div>ON AIR</div>
                                <div>OFF AIR</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-400 border-t border-slate-600 pt-3">
                          <p><strong>Tip:</strong> Commands are case-sensitive. Check your {radioSoftwareType === 'radiodj' ? 'RadioDJ' : 'mAirList'} documentation for complete command reference.</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Textarea
                  value={editingMapping.command || ''}
                  onChange={(e) => setEditingMapping(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="e.g., PLAYER 1 PLAY"
                  rows={2}
                  className="bg-slate-700 border-slate-600 text-white"
                />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Fade Down Threshold (%) - Optional</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingMapping.fadeDownThreshold || ''}
                    onChange={(e) => setEditingMapping(prev => ({ ...prev, fadeDownThreshold: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="e.g., 5"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Fade Down Command - Optional</Label>
                  <Textarea
                    value={editingMapping.fadeDownCommand || ''}
                    onChange={(e) => setEditingMapping(prev => ({ ...prev, fadeDownCommand: e.target.value || undefined }))}
                    placeholder="e.g., PLAYER 1 STOP"
                    rows={2}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
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
