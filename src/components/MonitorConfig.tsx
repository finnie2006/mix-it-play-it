import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Headphones, Volume2, VolumeX, Speaker } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MonitorConfigProps {
  isConnected: boolean;
}

interface MonitorSettings {
  source: number; // 0-14: OFF, LR, LRPFL, LRAFL, AUX, U1718, Bus1-6, Bus12, Bus34, Bus56
  level: number; // 0-1 normalized
  mute: boolean;
  mono: boolean;
  dim: boolean;
  dimAttenuation: number; // -40 to 0 dB
  channelMode: number; // 0=PFL, 1=AFL
  busMode: number; // 0=PFL, 1=AFL
}

const MONITOR_SOURCES = [
  { value: 0, label: 'OFF' },
  { value: 1, label: 'Main LR' },
  { value: 2, label: 'LR + PFL' },
  { value: 3, label: 'LR + AFL' },
  { value: 4, label: 'AUX' },
  { value: 5, label: 'USB 17/18' },
  { value: 6, label: 'Bus 1' },
  { value: 7, label: 'Bus 2' },
  { value: 8, label: 'Bus 3' },
  { value: 9, label: 'Bus 4' },
  { value: 10, label: 'Bus 5' },
  { value: 11, label: 'Bus 6' },
  { value: 12, label: 'Bus 1+2' },
  { value: 13, label: 'Bus 3+4' },
  { value: 14, label: 'Bus 5+6' },
];

export const MonitorConfig: React.FC<MonitorConfigProps> = ({ isConnected }) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [settings, setSettings] = useState<MonitorSettings>({
    source: 1, // Default to Main LR
    level: 0.75,
    mute: false,
    mono: false,
    dim: false,
    dimAttenuation: -20,
    channelMode: 0, // PFL
    busMode: 1, // AFL
  });
  const { toast } = useToast();

  // Connect to bridge WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
          console.log('🎧 Monitor config WebSocket connected');
          setWsConnected(true);
          setWebsocket(ws);

          // Request current settings
          requestCurrentSettings(ws);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleMixerResponse(data);
          } catch (error) {
            // Ignore non-JSON messages
          }
        };

        ws.onerror = (error) => {
          console.error('🎧 WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log('🎧 Monitor config WebSocket disconnected');
          setWsConnected(false);
          setWebsocket(null);
        };
      } catch (error) {
        console.error('🎧 Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Request current settings from mixer
  const requestCurrentSettings = (ws: WebSocket) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Request all monitor settings
    const commands = [
      '/config/solo/source',
      '/config/solo/level',
      '/config/solo/mute',
      '/config/solo/mono',
      '/config/solo/dim',
      '/config/solo/dimatt',
      '/config/solo/chmode',
      '/config/solo/busmode',
    ];

    commands.forEach((cmd) => {
      ws.send(
        JSON.stringify({
          type: 'osc',
          address: cmd,
          args: [],
        })
      );
    });
  };

  // Handle mixer responses
  const handleMixerResponse = (data: { type: string; address?: string; args?: unknown[] }) => {
    if (!data.address || !data.args || data.args.length === 0) return;

    const value = (data.args[0] as { value: number | string }).value;

    switch (data.address) {
      case '/config/solo/source':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, source: value }));
        }
        break;
      case '/config/solo/level':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, level: value }));
        }
        break;
      case '/config/solo/mute':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, mute: value === 1 }));
        }
        break;
      case '/config/solo/mono':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, mono: value === 1 }));
        }
        break;
      case '/config/solo/dim':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, dim: value === 1 }));
        }
        break;
      case '/config/solo/dimatt':
        if (typeof value === 'number') {
          // Convert normalized (0-1) to dB (-40 to 0)
          const dimDb = value * 40 - 40;
          setSettings((prev) => ({ ...prev, dimAttenuation: dimDb }));
        }
        break;
      case '/config/solo/chmode':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, channelMode: value }));
        }
        break;
      case '/config/solo/busmode':
        if (typeof value === 'number') {
          setSettings((prev) => ({ ...prev, busMode: value }));
        }
        break;
    }
  };

  // Send OSC command to mixer
  const sendOSC = (address: string, args: { type: string; value: number }[]) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send to mixer: WebSocket not connected');
      return;
    }

    websocket.send(
      JSON.stringify({
        type: 'osc',
        address,
        args,
      })
    );
  };

  // Update monitor source
  const setMonitorSource = (source: number) => {
    sendOSC('/config/solo/source', [{ type: 'i', value: source }]);
    setSettings((prev) => ({ ...prev, source }));
    
    const sourceName = MONITOR_SOURCES.find((s) => s.value === source)?.label || 'Unknown';
    toast({
      title: 'Monitor Source Changed',
      description: `Now monitoring: ${sourceName}`,
    });
  };

  // Update monitor level
  const setMonitorLevel = (level: number) => {
    sendOSC('/config/solo/level', [{ type: 'f', value: level }]);
    setSettings((prev) => ({ ...prev, level }));
  };

  // Toggle monitor mute
  const toggleMute = () => {
    const newMute = !settings.mute;
    sendOSC('/config/solo/mute', [{ type: 'i', value: newMute ? 1 : 0 }]);
    setSettings((prev) => ({ ...prev, mute: newMute }));
  };

  // Toggle monitor mono
  const toggleMono = () => {
    const newMono = !settings.mono;
    sendOSC('/config/solo/mono', [{ type: 'i', value: newMono ? 1 : 0 }]);
    setSettings((prev) => ({ ...prev, mono: newMono }));
  };

  // Toggle dim
  const toggleDim = () => {
    const newDim = !settings.dim;
    sendOSC('/config/solo/dim', [{ type: 'i', value: newDim ? 1 : 0 }]);
    setSettings((prev) => ({ ...prev, dim: newDim }));
  };

  // Set dim attenuation
  const setDimAttenuation = (dimDb: number) => {
    const normalized = (dimDb + 40) / 40;
    sendOSC('/config/solo/dimatt', [{ type: 'f', value: normalized }]);
    setSettings((prev) => ({ ...prev, dimAttenuation: dimDb }));
  };

  // Set channel mode (PFL/AFL)
  const setChannelMode = (mode: number) => {
    sendOSC('/config/solo/chmode', [{ type: 'i', value: mode }]);
    setSettings((prev) => ({ ...prev, channelMode: mode }));
  };

  // Set bus mode (PFL/AFL)
  const setBusMode = (mode: number) => {
    sendOSC('/config/solo/busmode', [{ type: 'i', value: mode }]);
    setSettings((prev) => ({ ...prev, busMode: mode }));
  };

  // Convert level to dB for display
  const levelToDb = (level: number): number => {
    if (level === 0) return -Infinity;
    return Math.round(20 * Math.log10(level));
  };

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <Headphones className="mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your X-Air mixer to configure monitor output.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones size={20} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Monitor / Headphone Output</h3>
        </div>

        <Badge variant={wsConnected ? 'default' : 'destructive'} className="gap-1">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {wsConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      {/* Main Controls */}
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="space-y-6">
          {/* Source Selection */}
          <div>
            <Label className="text-slate-300 mb-3 block text-base font-semibold">
              Monitor Source
            </Label>
            <Select
              value={String(settings.source)}
              onValueChange={(val) => setMonitorSource(parseInt(val))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {MONITOR_SOURCES.map((source) => (
                  <SelectItem key={source.value} value={String(source.value)} className="text-white">
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-400 mt-2">
              Select what you want to hear in your headphones/monitors
            </p>
          </div>

          {/* Volume Control */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-slate-300 text-base font-semibold">
                Monitor Level
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-slate-300">
                  {levelToDb(settings.level) === -Infinity ? '-∞' : `${levelToDb(settings.level)} dB`}
                </Badge>
                <Button
                  size="sm"
                  onClick={toggleMute}
                  variant={settings.mute ? 'destructive' : 'outline'}
                  className="gap-2"
                >
                  {settings.mute ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {settings.mute ? 'Muted' : 'On'}
                </Button>
              </div>
            </div>
            <Slider
              value={[settings.level]}
              onValueChange={([val]) => setSettings((prev) => ({ ...prev, level: val }))}
              onValueCommit={([val]) => setMonitorLevel(val)}
              min={0}
              max={1}
              step={0.01}
              className="flex-1"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>-∞</span>
              <span>+10 dB</span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={toggleMono}
              variant="outline"
              className={
                settings.mono
                  ? 'bg-slate-600 border-slate-500 text-white hover:bg-slate-500'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
              }
            >
              <Speaker size={16} className="mr-2" />
              Mono
            </Button>

            <Button
              onClick={toggleDim}
              variant="outline"
              className={
                settings.dim
                  ? 'bg-slate-600 border-slate-500 text-white hover:bg-slate-500'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
              }
            >
              <Volume2 size={16} className="mr-2" />
              Dim
            </Button>
          </div>

          {/* Dim Attenuation (when dim is enabled) */}
          {settings.dim && (
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
              <Label className="text-slate-300 mb-2 block">
                Dim Attenuation: {settings.dimAttenuation.toFixed(1)} dB
              </Label>
              <Slider
                value={[settings.dimAttenuation]}
                onValueChange={([val]) =>
                  setSettings((prev) => ({ ...prev, dimAttenuation: val }))
                }
                onValueCommit={([val]) => setDimAttenuation(val)}
                min={-40}
                max={0}
                step={0.5}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>-40 dB</span>
                <span>0 dB</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Advanced Settings */}
      <Card className="p-6 bg-slate-800 border-slate-600">
        <h4 className="text-white font-semibold mb-4">Solo/Monitor Tap Points</h4>
        <div className="space-y-4">
          {/* Channel Solo Mode */}
          <div>
            <Label className="text-slate-300 mb-2 block">Channel Solo Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setChannelMode(0)}
                variant="outline"
                className={
                  settings.channelMode === 0
                    ? 'bg-slate-600 border-slate-500 text-white hover:bg-slate-500'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
                }
              >
                PFL (Pre-Fader)
              </Button>
              <Button
                onClick={() => setChannelMode(1)}
                variant="outline"
                className={
                  settings.channelMode === 1
                    ? 'bg-slate-600 border-slate-500 text-white hover:bg-slate-500'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
                }
              >
                AFL (After-Fader)
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {settings.channelMode === 0
                ? 'PFL: Monitor before fader/mute (useful for cueing)'
                : 'AFL: Monitor after fader/mute (hear what goes to output)'}
            </p>
          </div>

          {/* Bus Solo Mode */}
          <div>
            <Label className="text-slate-300 mb-2 block">Bus Solo Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setBusMode(0)}
                variant="outline"
                className={
                  settings.busMode === 0
                    ? 'bg-slate-600 border-slate-500 text-white hover:bg-slate-500'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
                }
              >
                PFL (Pre-Fader)
              </Button>
              <Button
                onClick={() => setBusMode(1)}
                variant="outline"
                className={
                  settings.busMode === 1
                    ? 'bg-slate-600 border-slate-500 text-white hover:bg-slate-500'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
                }
              >
                AFL (After-Fader)
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {settings.busMode === 0
                ? 'PFL: Monitor bus before fader/mute'
                : 'AFL: Monitor bus after fader/mute'}
            </p>
          </div>
        </div>
      </Card>

      {/* Info Panel */}
      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-600">
        <p className="font-medium mb-1 text-slate-300">Monitor Output Tips:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Use "Main LR" to monitor what's going to the audience</li>
          <li>Use "LR + PFL" to hear channels you solo while still hearing the main mix</li>
          <li>Bus monitoring is useful for checking aux sends (headphone mixes, streaming, etc.)</li>
          <li>Dim temporarily reduces volume without changing your level setting</li>
          <li>PFL is great for cueing tracks before they go live</li>
        </ul>
      </div>
    </div>
  );
};
