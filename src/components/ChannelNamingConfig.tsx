import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tag, Save, RefreshCw, Trash2, Download, Upload, ArrowRightLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { channelNamingService, ChannelName } from '@/services/channelNamingService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChannelNamingConfigProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  isConnected: boolean;
}

const COLOR_OPTIONS = [
  { value: '#10b981', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange' },
];

export const ChannelNamingConfig: React.FC<ChannelNamingConfigProps> = ({ mixerModel, isConnected }) => {
  const maxChannels = mixerModel === 'X-Air 18' ? 16 : 16; // Both have 16 channels
  const [channelNames, setChannelNames] = useState<Map<number, ChannelName>>(new Map());
  const [editingChannel, setEditingChannel] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempColor, setTempColor] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [swapSourceChannel, setSwapSourceChannel] = useState<number | null>(null);
  const [swapTargetChannel, setSwapTargetChannel] = useState<number | null>(null);
  const [swapMode, setSwapMode] = useState<'swap' | 'copy'>('swap');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();

  // Connect to bridge WebSocket and setup channel naming service
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
          console.log('🏷️ Channel naming WebSocket connected');
          setWsConnected(true);
          channelNamingService.connectToMixer(ws!);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            channelNamingService.handleMixerResponse(data);
          } catch (error) {
            // Ignore non-JSON messages
          }
        };

        ws.onerror = (error) => {
          console.error('🏷️ WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log('🏷️ Channel naming WebSocket disconnected');
          setWsConnected(false);
          channelNamingService.disconnect();
        };
      } catch (error) {
        console.error('🏷️ Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Fetch channel names when mixer connection status changes
  useEffect(() => {
    if (isConnected && wsConnected) {
      setTimeout(() => {
        channelNamingService.syncFromMixer();
        console.log('🏷️ Fetching channel names from mixer on connection...');
      }, 1000);
    }
  }, [isConnected, wsConnected]);

  useEffect(() => {
    loadChannelNames();

    const unsubscribe = channelNamingService.onChange((names) => {
      setChannelNames(new Map(names));
    });

    return unsubscribe;
  }, []);

  const loadChannelNames = () => {
    const names = channelNamingService.getAllChannelNames();
    setChannelNames(new Map(names));
  };

  const handleEditChannel = (channel: number) => {
    const existing = channelNames.get(channel);
    setEditingChannel(channel);
    setTempName(existing?.name || '');
    setTempColor(existing?.color);
  };

  const handleSaveChannel = () => {
    if (editingChannel && tempName.trim()) {
      channelNamingService.setChannelName(editingChannel, tempName.trim(), tempColor);
      
      toast({
        title: 'Channel Name Saved',
        description: `Channel ${editingChannel} is now "${tempName}"`,
      });

      setEditingChannel(null);
      setTempName('');
      setTempColor(undefined);
    }
  };

  const handleCancelEdit = () => {
    setEditingChannel(null);
    setTempName('');
    setTempColor(undefined);
  };

  const handleClearChannel = (channel: number) => {
    channelNamingService.clearChannelName(channel);
    
    toast({
      title: 'Channel Name Cleared',
      description: `Channel ${channel} reset to default`,
    });
  };

  const handleSyncFromMixer = async () => {
    if (!isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Connect to mixer first to sync channel names',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    await channelNamingService.syncFromMixer();
    
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: 'Sync Requested',
        description: 'Requesting channel names from mixer...',
      });
    }, 1000);
  };

  const handleExport = () => {
    const data = channelNamingService.exportChannelNames();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channel-names-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Channel names exported successfully',
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ChannelName[];
        channelNamingService.importChannelNames(data);
        
        toast({
          title: 'Imported',
          description: `Imported ${data.length} channel names`,
        });
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: 'Invalid channel names file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSwapChannels = async () => {
    if (!swapSourceChannel || !swapTargetChannel) {
      toast({
        title: 'Error',
        description: 'Please select both source and target channels',
        variant: 'destructive',
      });
      return;
    }

    if (swapSourceChannel === swapTargetChannel) {
      toast({
        title: 'Error',
        description: 'Source and target channels must be different',
        variant: 'destructive',
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Connect to mixer first to swap/copy channels',
        variant: 'destructive',
      });
      return;
    }

    setIsSwapping(true);

    try {
      // Send swap/copy request to bridge server
      const ws = new WebSocket('ws://localhost:8080');
      
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: swapMode === 'swap' ? 'swap_channels' : 'copy_channel',
            sourceChannel: swapSourceChannel - 1, // Convert to 0-based
            targetChannel: swapTargetChannel - 1, // Convert to 0-based
          }));

          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Operation timeout'));
          }, 15000);

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type === 'channel_operation_complete') {
                clearTimeout(timeout);
                ws.close();
                resolve(message);
              } else if (message.type === 'channel_operation_error') {
                clearTimeout(timeout);
                ws.close();
                reject(new Error(message.error || 'Operation failed'));
              }
            } catch (error) {
              // Ignore parse errors
            }
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection error'));
          };
        };
      });

      toast({
        title: swapMode === 'swap' ? 'Channels Swapped' : 'Channel Copied',
        description: `Successfully ${swapMode === 'swap' ? 'swapped' : 'copied'} Channel ${swapSourceChannel} ${swapMode === 'swap' ? '↔' : '→'} Channel ${swapTargetChannel}`,
      });

      setIsSwapDialogOpen(false);
      setSwapSourceChannel(null);
      setSwapTargetChannel(null);

      // Refresh channel names after operation
      setTimeout(() => {
        channelNamingService.syncFromMixer();
      }, 1000);
    } catch (error) {
      toast({
        title: 'Operation Failed',
        description: error instanceof Error ? error.message : 'Failed to perform channel operation',
        variant: 'destructive',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={20} className="text-green-400" />
          <h3 className="text-lg font-semibold text-white">Channel Labels</h3>
        </div>

        <div className="flex gap-2">
          {isConnected && (
            <>
              <Button
                size="sm"
                onClick={() => setIsSwapDialogOpen(true)}
                variant="outline"
                className="border-purple-600 text-purple-400 hover:bg-purple-600/10"
              >
                <ArrowRightLeft size={14} className="mr-2" />
                Swap/Copy Channels
              </Button>
              <Button
                size="sm"
                onClick={handleSyncFromMixer}
                disabled={isSyncing}
                variant="outline"
                className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
              >
                {isSyncing ? (
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={14} className="mr-2" />
                )}
                Sync from Mixer
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={handleExport}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            <Download size={14} className="mr-2" />
            Export
          </Button>

          <label>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-600"
              asChild
            >
              <span>
                <Upload size={14} className="mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: maxChannels }, (_, i) => i + 1).map((channel) => {
          const channelData = channelNames.get(channel);
          const isEditing = editingChannel === channel;

          return (
            <Card
              key={channel}
              className="p-3 bg-slate-800 border-slate-600"
              style={channelData?.color ? { borderLeftColor: channelData.color, borderLeftWidth: '4px' } : {}}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Channel {channel}</Label>
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder={`Ch ${channel}`}
                    className="bg-slate-700 border-slate-600 text-white text-sm"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveChannel();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />

                  <div className="flex flex-wrap gap-1">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setTempColor(color.value)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          tempColor === color.value ? 'border-white' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                    <button
                      onClick={() => setTempColor(undefined)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        !tempColor ? 'border-white' : 'border-slate-600'
                      } bg-slate-700`}
                      title="No color"
                    >
                      <span className="text-xs text-slate-400">✕</span>
                    </button>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={handleSaveChannel}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save size={12} className="mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      Ch {channel}
                    </Badge>
                    {channelData && (
                      <button
                        onClick={() => handleClearChannel(channel)}
                        className="text-red-400 hover:text-red-300"
                        title="Clear name"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleEditChannel(channel)}
                    className="w-full text-left p-2 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition-colors"
                  >
                    <div className="text-sm text-white font-medium truncate">
                      {channelData?.name || `Ch ${channel}`}
                    </div>
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-600">
        <p className="font-medium mb-1 text-slate-300">Channel Naming:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Click any channel to set a custom label</li>
          <li>Names sync with the mixer in real-time when connected</li>
          <li>Color coding helps organize channels visually</li>
          <li>Export/Import to share setups between computers</li>
          <li>Use Swap/Copy to rearrange channels with all their properties (EQ, dynamics, routing, etc.)</li>
        </ul>
      </div>

      {/* Swap/Copy Channel Dialog */}
      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ArrowRightLeft className="text-purple-400" size={20} />
              Swap or Copy Channels
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Move channels with all their properties: name, color, EQ, dynamics, routing, sends, and more.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Mode Selection */}
            <div className="flex gap-2 p-1 bg-slate-700 rounded-lg">
              <button
                onClick={() => setSwapMode('swap')}
                className={`flex-1 py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors ${
                  swapMode === 'swap'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                <ArrowRightLeft size={16} />
                Swap
              </button>
              <button
                onClick={() => setSwapMode('copy')}
                className={`flex-1 py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors ${
                  swapMode === 'copy'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Copy size={16} />
                Copy
              </button>
            </div>

            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
              <p className="text-sm text-slate-300 mb-2">
                {swapMode === 'swap' 
                  ? '🔄 Swap exchanges all properties between two channels'
                  : '📋 Copy overwrites target channel with source channel properties'}
              </p>
            </div>

            {/* Source Channel */}
            <div className="space-y-2">
              <Label className="text-slate-200">Source Channel</Label>
              <select
                value={swapSourceChannel || ''}
                onChange={(e) => setSwapSourceChannel(Number(e.target.value) || null)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select source channel...</option>
                {Array.from({ length: maxChannels }, (_, i) => i + 1).map((ch) => {
                  const channelData = channelNames.get(ch);
                  return (
                    <option key={ch} value={ch}>
                      Ch {ch} {channelData?.name ? `- ${channelData.name}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-purple-400 text-2xl">
                {swapMode === 'swap' ? '⇅' : '↓'}
              </div>
            </div>

            {/* Target Channel */}
            <div className="space-y-2">
              <Label className="text-slate-200">Target Channel</Label>
              <select
                value={swapTargetChannel || ''}
                onChange={(e) => setSwapTargetChannel(Number(e.target.value) || null)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select target channel...</option>
                {Array.from({ length: maxChannels }, (_, i) => i + 1).map((ch) => {
                  const channelData = channelNames.get(ch);
                  return (
                    <option key={ch} value={ch}>
                      Ch {ch} {channelData?.name ? `- ${channelData.name}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="bg-amber-900/20 border border-amber-600/50 rounded-lg p-3">
              <p className="text-xs text-amber-200">
                ⚠️ This operation will modify channel settings on your mixer. Make sure to save your mixer state before proceeding.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setIsSwapDialogOpen(false);
                setSwapSourceChannel(null);
                setSwapTargetChannel(null);
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={isSwapping}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwapChannels}
              disabled={isSwapping || !swapSourceChannel || !swapTargetChannel}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSwapping ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {swapMode === 'swap' ? <ArrowRightLeft size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                  {swapMode === 'swap' ? 'Swap Channels' : 'Copy Channel'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
