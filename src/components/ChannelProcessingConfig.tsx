/**
 * Channel Processing Configuration Component
 * 
 * Professional broadcast audio processing for X-Air mixers
 * Provides High-Pass Filter, Gate, and Compressor controls with research-backed presets
 * 
 * PRESET RESEARCH & ENGINEERING SPECIFICATIONS:
 * =============================================
 * 
 * Sources:
 * - NPR Technical Operations Standards
 * - BBC Engineering Guidelines for Radio Production
 * - Waves Audio Broadcast Processing Research
 * - AES (Audio Engineering Society) recommended practices
 * - Professional broadcast console manufacturers (SSL, Neve, API)
 * 
 * Key Principles:
 * 1. HPF: Remove subsonic content below fundamental voice frequencies (85-250 Hz male, 165-255 Hz female)
 * 2. Gate: Threshold set 3-6dB above noise floor, fast attack (0.5-2ms), hold bridges syllables (80-250ms)
 * 3. Compression: Broadcast standard 3-5:1 ratio, -16 to -20dB threshold, 5-15ms attack, 80-150ms release
 * 
 * Attack/Release Time Constants:
 * - Attack: Time to reduce gain by 63% when signal exceeds threshold
 * - Release: Time to return gain to 63% of original after signal drops below threshold
 * - Speech requires faster times than music (syllable rate ~4-6 Hz, phoneme duration 40-300ms)
 * 
 * Compression Ratios:
 * - 1.5-2.5:1: Transparent, preserves dynamics (natural voice, high-quality production)
 * - 3-5:1: Broadcast standard (NPR, BBC, commercial radio)
 * - 7-12:1: Heavy compression (competitive loudness, consistent levels)
 * - 20:1+: Brick-wall limiting (peak control, prevents clipping)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Filter, Gauge, Sliders, Power, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ChannelProcessingConfigProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  isConnected: boolean;
}

interface HPFSettings {
  enabled: boolean;
  frequency: number; // 20-200 Hz
}

interface GateSettings {
  enabled: boolean;
  threshold: number; // -80 to 0 dB
  mode: 'GATE' | 'EXP2' | 'EXP3' | 'EXP4' | 'DUCK';
  attack: number; // 0-120 ms
  hold: number; // 0.02-2000 ms
  release: number; // 5-4000 ms
  range: number; // 3-60 dB
}

interface CompressorSettings {
  enabled: boolean;
  threshold: number; // -60 to 0 dB
  ratio: number; // 0-11 index (1.1, 1.3, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10, 20, 100)
  attack: number; // 0-120 ms
  hold: number; // 0.02-2000 ms
  release: number; // 5-4000 ms
  knee: number; // 0-5
  makeupGain: number; // 0-24 dB
  mode: 'COMP' | 'EXP';
}

const RATIO_VALUES = [
  { index: 0, label: '1.1:1', value: 1.1 },
  { index: 1, label: '1.3:1', value: 1.3 },
  { index: 2, label: '1.5:1', value: 1.5 },
  { index: 3, label: '2.0:1', value: 2.0 },
  { index: 4, label: '2.5:1', value: 2.5 },
  { index: 5, label: '3.0:1', value: 3.0 },
  { index: 6, label: '4.0:1', value: 4.0 },
  { index: 7, label: '5.0:1', value: 5.0 },
  { index: 8, label: '7.0:1', value: 7.0 },
  { index: 9, label: '10:1', value: 10 },
  { index: 10, label: '20:1', value: 20 },
  { index: 11, label: '100:1', value: 100 },
];

// Broadcasting presets - Based on professional broadcast standards
// Research sources: NPR, BBC Engineering, Waves Audio broadcast processors, industry standards
const BROADCAST_PRESETS = {
  radio: {
    name: 'Professional Radio',
    description: 'Industry-standard FM/AM radio voice processing',
    hpf: { enabled: true, frequency: 85 }, // Remove proximity effect and room rumble
    gate: {
      enabled: true,
      threshold: -42, // Gate opens just above room noise floor
      mode: 'GATE' as const,
      attack: 0.5, // Very fast attack for clean gate opening (0.5ms is professional standard)
      hold: 120, // Hold long enough to bridge word gaps (120ms)
      release: 250, // Natural release matching speech patterns
      range: 45, // Reduce background by 45dB when closed
    },
    compressor: {
      enabled: true,
      threshold: -16, // Compression starts at typical speaking levels
      ratio: 6, // 4:1 ratio - broadcast standard for voice consistency
      attack: 5, // 5ms fast enough to catch peaks, slow enough to preserve transients
      hold: 0.02, // Minimal hold
      release: 80, // 80ms release - fast enough for density, slow enough to avoid pumping
      knee: 2.5, // Medium-soft knee for natural transition into compression
      makeupGain: 8, // Compensate for ~8dB of gain reduction
      mode: 'COMP' as const,
    },
  },
  podcast: {
    name: 'Podcast/Streaming',
    description: 'Optimized for spoken word content with natural dynamics',
    hpf: { enabled: true, frequency: 75 }, // Lighter HPF for warmer tone
    gate: {
      enabled: true,
      threshold: -48, // Gentler threshold for quiet studio environments
      mode: 'EXP2' as const, // Expander for more gradual, natural gating
      attack: 1.0, // Slightly slower for smooth opening
      hold: 200, // Longer hold for conversational speech
      release: 400, // Slower release for natural fade
      range: 35, // Less aggressive attenuation
    },
    compressor: {
      enabled: true,
      threshold: -20, // Higher threshold for more dynamic range
      ratio: 4, // 2.5:1 ratio - gentle compression
      attack: 15, // Slower attack preserves natural dynamics
      hold: 0.02,
      release: 150, // Medium release for musical quality
      knee: 3.5, // Softer knee for transparent compression
      makeupGain: 5, // Less makeup gain preserves dynamics
      mode: 'COMP' as const,
    },
  },
  aggressive: {
    name: 'High-Impact Broadcast',
    description: 'Maximum loudness and consistency for competitive radio',
    hpf: { enabled: true, frequency: 100 }, // Aggressive HPF for clarity
    gate: {
      enabled: true,
      threshold: -38, // Higher threshold for cleaner signal
      mode: 'GATE' as const,
      attack: 0.3, // Ultra-fast attack
      hold: 80, // Shorter hold for tighter gating
      release: 120, // Faster release for aggressive sound
      range: 55, // Maximum background reduction
    },
    compressor: {
      enabled: true,
      threshold: -12, // Low threshold for heavy compression
      ratio: 9, // 10:1 ratio - heavy limiting
      attack: 2, // Very fast attack to catch all peaks
      hold: 0.02,
      release: 50, // Fast release for maximum density
      knee: 1.0, // Hard knee for aggressive compression character
      makeupGain: 10, // High makeup gain for loudness
      mode: 'COMP' as const,
    },
  },
  natural: {
    name: 'Natural Voice',
    description: 'Minimal processing for high-quality, transparent sound',
    hpf: { enabled: true, frequency: 60 }, // Minimal HPF, only removes subsonic content
    gate: {
      enabled: false, // No gating for most natural sound
      threshold: -55,
      mode: 'EXP3' as const, // Gentle expander if enabled
      attack: 3.0,
      hold: 300,
      release: 600,
      range: 25,
    },
    compressor: {
      enabled: true,
      threshold: -24, // Light compression only on peaks
      ratio: 2, // 1.5:1 ratio - very gentle
      attack: 25, // Slow attack preserves transients
      hold: 0.02,
      release: 250, // Slow release for musicality
      knee: 4.5, // Very soft knee for transparency
      makeupGain: 3, // Minimal makeup gain
      mode: 'COMP' as const,
    },
  },
  voiceover: {
    name: 'Voice-Over/Narration',
    description: 'Optimized for voice-over work and narration',
    hpf: { enabled: true, frequency: 90 }, // Clean low-end for clarity
    gate: {
      enabled: true,
      threshold: -45,
      mode: 'GATE' as const,
      attack: 1.0,
      hold: 150,
      release: 300,
      range: 40,
    },
    compressor: {
      enabled: true,
      threshold: -18, // Moderate threshold
      ratio: 5, // 3:1 ratio - professional VO standard
      attack: 8, // Fast but not too aggressive
      hold: 0.02,
      release: 120, // Medium-fast release
      knee: 2.0, // Medium knee
      makeupGain: 7, // Compensate for compression
      mode: 'COMP' as const,
    },
  },
  interview: {
    name: 'Interview/Talk',
    description: 'Multiple speakers with varying levels and distances',
    hpf: { enabled: true, frequency: 80 },
    gate: {
      enabled: true,
      threshold: -50, // Lower threshold for varying mic distances
      mode: 'EXP2' as const, // Smooth expander
      attack: 2.0,
      hold: 250, // Long hold for back-and-forth conversation
      release: 500, // Slow release to avoid cutting off
      range: 30, // Gentle reduction
    },
    compressor: {
      enabled: true,
      threshold: -16, // Catch varying speaker levels
      ratio: 7, // 5:1 ratio - strong compression for level matching
      attack: 10, // Medium attack
      hold: 0.02,
      release: 120, // Medium release
      knee: 3.0, // Soft knee for natural sound
      makeupGain: 8, // Strong makeup gain for consistency
      mode: 'COMP' as const,
    },
  },
  liveMusic: {
    name: 'Live Music Performance',
    description: 'Transparent processing for live music with punch',
    hpf: { enabled: true, frequency: 40 }, // Minimal HPF preserves bass
    gate: {
      enabled: false, // No gating for music dynamics
      threshold: -60,
      mode: 'GATE' as const,
      attack: 0.1,
      hold: 50,
      release: 200,
      range: 0,
    },
    compressor: {
      enabled: true,
      threshold: -12, // Light compression preserves dynamics
      ratio: 3, // 2:1 ratio - gentle, transparent
      attack: 20, // Slow attack preserves transients and punch
      hold: 0.02,
      release: 150, // Medium release for musical quality
      knee: 5, // Very soft knee for transparency
      makeupGain: 2, // Minimal makeup gain
      mode: 'COMP' as const,
    },
  },
  recordedMusic: {
    name: 'Recorded Music Playback',
    description: 'Clean, uncolored playback for pre-mastered content',
    hpf: { enabled: false, frequency: 20 }, // No HPF - preserve full spectrum
    gate: {
      enabled: false, // No gating for mastered content
      threshold: -70,
      mode: 'GATE' as const,
      attack: 0.1,
      hold: 30,
      release: 100,
      range: 0,
    },
    compressor: {
      enabled: false, // No compression - content already mastered
      threshold: -10,
      ratio: 2, // 1.5:1 if enabled
      attack: 30,
      hold: 0.02,
      release: 200,
      knee: 5, // Soft knee if enabled
      makeupGain: 0, // No makeup gain needed
      mode: 'COMP' as const,
    },
  },
};

export const ChannelProcessingConfig: React.FC<ChannelProcessingConfigProps> = ({
  mixerModel,
  isConnected,
}) => {
  const maxChannels = 16;
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const { toast } = useToast();

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('channelProcessingSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          hpf: new Map(parsed.hpf || []),
          gate: new Map(parsed.gate || []),
          compressor: new Map(parsed.compressor || [])
        };
      }
    } catch (error) {
      console.error('Failed to load channel processing settings:', error);
    }
    return { hpf: new Map(), gate: new Map(), compressor: new Map() };
  };

  // Save settings to localStorage
  const saveSettings = (hpf: Map<number, HPFSettings>, gate: Map<number, GateSettings>, comp: Map<number, CompressorSettings>) => {
    try {
      const toSave = {
        hpf: Array.from(hpf.entries()),
        gate: Array.from(gate.entries()),
        compressor: Array.from(comp.entries())
      };
      localStorage.setItem('channelProcessingSettings', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save channel processing settings:', error);
    }
  };

  // Processing settings per channel - load from localStorage on mount
  const [hpfSettings, setHpfSettings] = useState<Map<number, HPFSettings>>(() => loadSettings().hpf);
  const [gateSettings, setGateSettings] = useState<Map<number, GateSettings>>(() => loadSettings().gate);
  const [compressorSettings, setCompressorSettings] = useState<Map<number, CompressorSettings>>(() => loadSettings().compressor);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    saveSettings(hpfSettings, gateSettings, compressorSettings);
  }, [hpfSettings, gateSettings, compressorSettings]);

  // Update local state from mixer responses
  const updateHPFFrequency = useCallback((channel: number, normalizedValue: number) => {
    const frequency = normalizedValue * (200 - 20) + 20;
    setHpfSettings((prev) => {
      const current = prev.get(channel) || { enabled: false, frequency: 80 };
      const updated = new Map(prev);
      updated.set(channel, { ...current, frequency });
      return updated;
    });
  }, []);

  const updateHPFEnabled = useCallback((channel: number, enabled: boolean) => {
    setHpfSettings((prev) => {
      const current = prev.get(channel) || { enabled: false, frequency: 80 };
      const updated = new Map(prev);
      updated.set(channel, { ...current, enabled });
      return updated;
    });
  }, []);

  // Handle mixer responses
  const handleMixerResponse = useCallback((data: { type: string; address?: string; args?: unknown[] }) => {
    if (!data.address) return;

    // Parse HPF responses
    if (data.address.match(/\/ch\/\d+\/preamp\/hpf$/)) {
      const match = data.address.match(/\/ch\/(\d+)\/preamp\/hpf/);
      if (match && data.args && data.args.length > 0) {
        const channel = parseInt(match[1]);
        const value = data.args[0] as { value: number };
        updateHPFFrequency(channel, value.value);
      }
    } else if (data.address.match(/\/ch\/\d+\/preamp\/hpon$/)) {
      const match = data.address.match(/\/ch\/(\d+)\/preamp\/hpon/);
      if (match && data.args && data.args.length > 0) {
        const channel = parseInt(match[1]);
        const value = data.args[0] as { value: number };
        updateHPFEnabled(channel, value.value === 1);
      }
    }
    // Add more response handlers as needed
  }, [updateHPFFrequency, updateHPFEnabled]);

  // Connect to bridge WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
          console.log('🎛️ Channel processing WebSocket connected');
          setWsConnected(true);
          setWebsocket(ws);
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
          console.error('🎛️ WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log('🎛️ Channel processing WebSocket disconnected');
          setWsConnected(false);
          setWebsocket(null);
        };
      } catch (error) {
        console.error('🎛️ Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [handleMixerResponse]);

  // Send OSC command to mixer
  const sendOSC = (address: string, args: { type: string; value: number | string }[]) => {
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

  // HPF Controls
  const setHPF = (channel: number, enabled: boolean, frequency: number) => {
    const paddedChannel = String(channel).padStart(2, '0');

    // Set HPF on/off
    sendOSC(`/ch/${paddedChannel}/preamp/hpon`, [{ type: 'i', value: enabled ? 1 : 0 }]);

    // Set HPF frequency (normalized 0-1)
    const normalized = (frequency - 20) / (200 - 20);
    sendOSC(`/ch/${paddedChannel}/preamp/hpf`, [{ type: 'f', value: normalized }]);

    // Update local state
    setHpfSettings((prev) => {
      const updated = new Map(prev);
      updated.set(channel, { enabled, frequency });
      return updated;
    });

    console.log(`🎛️ Set HPF Ch${channel}: ${enabled ? `${frequency}Hz` : 'OFF'}`);
  };

  // Gate Controls
  const setGate = (channel: number, settings: GateSettings) => {
    const paddedChannel = String(channel).padStart(2, '0');
    const modeIndex = ['GATE', 'EXP2', 'EXP3', 'EXP4', 'DUCK'].indexOf(settings.mode);

    sendOSC(`/ch/${paddedChannel}/gate/on`, [{ type: 'i', value: settings.enabled ? 1 : 0 }]);
    sendOSC(`/ch/${paddedChannel}/gate/mode`, [{ type: 'i', value: modeIndex }]);
    sendOSC(`/ch/${paddedChannel}/gate/thr`, [
      { type: 'f', value: (settings.threshold + 80) / 80 },
    ]);
    sendOSC(`/ch/${paddedChannel}/gate/attack`, [
      { type: 'f', value: settings.attack / 120 },
    ]);
    sendOSC(`/ch/${paddedChannel}/gate/hold`, [
      { type: 'f', value: (settings.hold - 0.02) / (2000 - 0.02) },
    ]);
    sendOSC(`/ch/${paddedChannel}/gate/release`, [
      { type: 'f', value: (settings.release - 5) / (4000 - 5) },
    ]);
    sendOSC(`/ch/${paddedChannel}/gate/range`, [
      { type: 'f', value: (settings.range - 3) / (60 - 3) },
    ]);

    setGateSettings((prev) => {
      const updated = new Map(prev);
      updated.set(channel, settings);
      return updated;
    });

    console.log(`🎛️ Set Gate Ch${channel}:`, settings);
  };

  // Compressor Controls
  const setCompressor = (channel: number, settings: CompressorSettings) => {
    const paddedChannel = String(channel).padStart(2, '0');
    const modeIndex = settings.mode === 'COMP' ? 0 : 1;

    sendOSC(`/ch/${paddedChannel}/dyn/on`, [{ type: 'i', value: settings.enabled ? 1 : 0 }]);
    sendOSC(`/ch/${paddedChannel}/dyn/mode`, [{ type: 'i', value: modeIndex }]);
    sendOSC(`/ch/${paddedChannel}/dyn/thr`, [
      { type: 'f', value: (settings.threshold + 60) / 60 },
    ]);
    sendOSC(`/ch/${paddedChannel}/dyn/ratio`, [{ type: 'i', value: settings.ratio }]);
    sendOSC(`/ch/${paddedChannel}/dyn/attack`, [
      { type: 'f', value: settings.attack / 120 },
    ]);
    sendOSC(`/ch/${paddedChannel}/dyn/hold`, [
      { type: 'f', value: (settings.hold - 0.02) / (2000 - 0.02) },
    ]);
    sendOSC(`/ch/${paddedChannel}/dyn/release`, [
      { type: 'f', value: (settings.release - 5) / (4000 - 5) },
    ]);
    sendOSC(`/ch/${paddedChannel}/dyn/knee`, [{ type: 'f', value: settings.knee / 5 }]);
    sendOSC(`/ch/${paddedChannel}/dyn/mgain`, [
      { type: 'f', value: settings.makeupGain / 24 },
    ]);

    setCompressorSettings((prev) => {
      const updated = new Map(prev);
      updated.set(channel, settings);
      return updated;
    });

    console.log(`🎛️ Set Compressor Ch${channel}:`, settings);
  };

  // Apply preset to channel
  const applyPreset = (
    channel: number,
    preset: (typeof BROADCAST_PRESETS)[keyof typeof BROADCAST_PRESETS]
  ) => {
    setHPF(channel, preset.hpf.enabled, preset.hpf.frequency);
    setGate(channel, preset.gate);
    setCompressor(channel, preset.compressor);

    toast({
      title: 'Preset Applied',
      description: `"${preset.name}" applied to Channel ${channel}`,
    });
  };

  // Get current settings for selected channel
  const currentHPF = hpfSettings.get(selectedChannel) || { enabled: false, frequency: 80 };
  const currentGate = gateSettings.get(selectedChannel) || {
    enabled: false,
    threshold: -50,
    mode: 'GATE' as const,
    attack: 5,
    hold: 100,
    release: 200,
    range: 30,
  };
  const currentCompressor = compressorSettings.get(selectedChannel) || {
    enabled: false,
    threshold: -20,
    ratio: 3,
    attack: 10,
    hold: 0.02,
    release: 150,
    knee: 2,
    makeupGain: 4,
    mode: 'COMP' as const,
  };

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <Sliders className="mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your X-Air mixer to configure channel processing.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Channel Processing</h3>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={wsConnected ? 'default' : 'destructive'} className="gap-1">
            <div
              className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            {wsConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Channel Selector and Presets */}
      <Card className="p-4 bg-slate-800 border-slate-600">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-slate-300">Select Channel:</Label>
            <Select
              value={String(selectedChannel)}
              onValueChange={(val) => setSelectedChannel(parseInt(val))}
            >
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {Array.from({ length: maxChannels }, (_, i) => i + 1).map((ch) => (
                  <SelectItem key={ch} value={String(ch)} className="text-white">
                    Channel {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 mb-3 block">Quick Presets:</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(BROADCAST_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  size="sm"
                  onClick={() => applyPreset(selectedChannel, preset)}
                  variant="outline"
                  className="border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-600/70 hover:border-blue-500 h-auto py-2 px-3 flex flex-col items-start transition-all"
                  title={preset.description}
                >
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-xs text-slate-400 font-normal mt-0.5">
                    {preset.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="hpf" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="hpf" className="data-[state=active]:bg-slate-700">
            <Filter size={16} className="mr-2" />
            High-Pass Filter
          </TabsTrigger>
          <TabsTrigger value="gate" className="data-[state=active]:bg-slate-700">
            <Gauge size={16} className="mr-2" />
            Gate
          </TabsTrigger>
          <TabsTrigger value="compressor" className="data-[state=active]:bg-slate-700">
            <Sliders size={16} className="mr-2" />
            Compressor
          </TabsTrigger>
        </TabsList>

        {/* High-Pass Filter Tab */}
        <TabsContent value="hpf">
          <Card className="p-6 bg-slate-800 border-slate-600">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold mb-1">High-Pass Filter</h4>
                  <p className="text-sm text-slate-400">
                    Remove low-frequency rumble and noise
                  </p>
                </div>
                <Button
                  onClick={() => setHPF(selectedChannel, !currentHPF.enabled, currentHPF.frequency)}
                  variant={currentHPF.enabled ? 'default' : 'outline'}
                  className={
                    currentHPF.enabled
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'border-slate-600 text-slate-300'
                  }
                >
                  <Power size={16} className="mr-2" />
                  {currentHPF.enabled ? 'ON' : 'OFF'}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Frequency: {currentHPF.frequency} Hz</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setHPF(selectedChannel, currentHPF.enabled, 80)}
                    className="text-slate-400 hover:text-white"
                  >
                    <RotateCcw size={14} className="mr-1" />
                    Reset
                  </Button>
                </div>
                <Slider
                  value={[currentHPF.frequency]}
                  onValueChange={([val]) =>
                    setHpfSettings((prev) => {
                      const updated = new Map(prev);
                      updated.set(selectedChannel, { ...currentHPF, frequency: val });
                      return updated;
                    })
                  }
                  onValueCommit={([val]) =>
                    setHPF(selectedChannel, currentHPF.enabled, val)
                  }
                  min={20}
                  max={200}
                  step={1}
                  className="flex-1"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>20 Hz</span>
                  <span>200 Hz</span>
                </div>
              </div>

              <div className="bg-slate-700/50 p-4 rounded text-sm text-slate-300 border border-slate-600">
                <p className="font-medium mb-2 flex items-center gap-2">
                  💡 High-Pass Filter Guide
                </p>
                <div className="space-y-2 text-slate-400">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">60-75 Hz:</span> Warm, natural tone
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">80-90 Hz:</span> Broadcast standard
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">100-120 Hz:</span> Extra clarity
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">120+ Hz:</span> Thin/telephone effect
                    </div>
                  </div>
                  <p className="text-xs mt-2">
                    ℹ️ Purpose: Removes subsonic noise, AC hum (50/60 Hz), handling noise, and proximity effect from close-mic techniques.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Gate Tab */}
        <TabsContent value="gate">
          <Card className="p-6 bg-slate-800 border-slate-600">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold mb-1">Noise Gate</h4>
                  <p className="text-sm text-slate-400">
                    Automatically mute when signal is below threshold
                  </p>
                </div>
                <Button
                  onClick={() => setGate(selectedChannel, { ...currentGate, enabled: !currentGate.enabled })}
                  variant={currentGate.enabled ? 'default' : 'outline'}
                  className={
                    currentGate.enabled
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'border-slate-600 text-slate-300'
                  }
                >
                  <Power size={16} className="mr-2" />
                  {currentGate.enabled ? 'ON' : 'OFF'}
                </Button>
              </div>

              <div className="space-y-4">
                {/* Mode */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Mode</Label>
                  <Select
                    value={currentGate.mode}
                    onValueChange={(val) =>
                      setGate(selectedChannel, { ...currentGate, mode: val as GateSettings['mode'] })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="GATE" className="text-white">Gate</SelectItem>
                      <SelectItem value="EXP2" className="text-white">Expander 2</SelectItem>
                      <SelectItem value="EXP3" className="text-white">Expander 3</SelectItem>
                      <SelectItem value="EXP4" className="text-white">Expander 4</SelectItem>
                      <SelectItem value="DUCK" className="text-white">Ducker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Threshold */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Threshold: {currentGate.threshold} dB
                  </Label>
                  <Slider
                    value={[currentGate.threshold]}
                    onValueChange={([val]) =>
                      setGateSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentGate, threshold: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setGate(selectedChannel, { ...currentGate, threshold: val })
                    }
                    min={-80}
                    max={0}
                    step={1}
                  />
                </div>

                {/* Attack */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Attack: {currentGate.attack.toFixed(1)} ms
                  </Label>
                  <Slider
                    value={[currentGate.attack]}
                    onValueChange={([val]) =>
                      setGateSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentGate, attack: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setGate(selectedChannel, { ...currentGate, attack: val })
                    }
                    min={0}
                    max={120}
                    step={0.1}
                  />
                </div>

                {/* Release */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Release: {currentGate.release.toFixed(0)} ms
                  </Label>
                  <Slider
                    value={[currentGate.release]}
                    onValueChange={([val]) =>
                      setGateSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentGate, release: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setGate(selectedChannel, { ...currentGate, release: val })
                    }
                    min={5}
                    max={4000}
                    step={5}
                  />
                </div>

                {/* Range */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Range: {currentGate.range} dB
                  </Label>
                  <Slider
                    value={[currentGate.range]}
                    onValueChange={([val]) =>
                      setGateSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentGate, range: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setGate(selectedChannel, { ...currentGate, range: val })
                    }
                    min={3}
                    max={60}
                    step={1}
                  />
                </div>
              </div>

              <div className="bg-slate-700/50 p-4 rounded text-sm text-slate-300 border border-slate-600">
                <p className="font-medium mb-2 flex items-center gap-2">
                  💡 Noise Gate Guide
                </p>
                <div className="space-y-2 text-slate-400">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Threshold:</span> Set 3-6 dB above room noise floor. Use headphones to find the sweet spot.
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Attack:</span> Fast (0.5-2ms) for speech, slower (2-5ms) for singing to avoid clicks.
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Hold:</span> 80-150ms bridges syllables in speech, 200-300ms for natural conversation.
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Release:</span> 100-250ms for tight control, 300-500ms for transparent gating.
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Mode:</span> GATE for hard cutoff, EXP2/3 for gradual, natural reduction.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Compressor Tab */}
        <TabsContent value="compressor">
          <Card className="p-6 bg-slate-800 border-slate-600">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold mb-1">Compressor</h4>
                  <p className="text-sm text-slate-400">Even out levels and add punch</p>
                </div>
                <Button
                  onClick={() =>
                    setCompressor(selectedChannel, {
                      ...currentCompressor,
                      enabled: !currentCompressor.enabled,
                    })
                  }
                  variant={currentCompressor.enabled ? 'default' : 'outline'}
                  className={
                    currentCompressor.enabled
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'border-slate-600 text-slate-300'
                  }
                >
                  <Power size={16} className="mr-2" />
                  {currentCompressor.enabled ? 'ON' : 'OFF'}
                </Button>
              </div>

              <div className="space-y-4">
                {/* Threshold */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Threshold: {currentCompressor.threshold} dB
                  </Label>
                  <Slider
                    value={[currentCompressor.threshold]}
                    onValueChange={([val]) =>
                      setCompressorSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentCompressor, threshold: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setCompressor(selectedChannel, { ...currentCompressor, threshold: val })
                    }
                    min={-60}
                    max={0}
                    step={1}
                  />
                </div>

                {/* Ratio */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Ratio: {RATIO_VALUES[currentCompressor.ratio].label}
                  </Label>
                  <Select
                    value={String(currentCompressor.ratio)}
                    onValueChange={(val) =>
                      setCompressor(selectedChannel, {
                        ...currentCompressor,
                        ratio: parseInt(val),
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {RATIO_VALUES.map((ratio) => (
                        <SelectItem key={ratio.index} value={String(ratio.index)} className="text-white">
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attack */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Attack: {currentCompressor.attack.toFixed(1)} ms
                  </Label>
                  <Slider
                    value={[currentCompressor.attack]}
                    onValueChange={([val]) =>
                      setCompressorSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentCompressor, attack: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setCompressor(selectedChannel, { ...currentCompressor, attack: val })
                    }
                    min={0}
                    max={120}
                    step={0.1}
                  />
                </div>

                {/* Release */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Release: {currentCompressor.release.toFixed(0)} ms
                  </Label>
                  <Slider
                    value={[currentCompressor.release]}
                    onValueChange={([val]) =>
                      setCompressorSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentCompressor, release: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setCompressor(selectedChannel, { ...currentCompressor, release: val })
                    }
                    min={5}
                    max={4000}
                    step={5}
                  />
                </div>

                {/* Knee */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Knee: {currentCompressor.knee.toFixed(1)}
                  </Label>
                  <Slider
                    value={[currentCompressor.knee]}
                    onValueChange={([val]) =>
                      setCompressorSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentCompressor, knee: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setCompressor(selectedChannel, { ...currentCompressor, knee: val })
                    }
                    min={0}
                    max={5}
                    step={0.1}
                  />
                </div>

                {/* Makeup Gain */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Makeup Gain: {currentCompressor.makeupGain.toFixed(1)} dB
                  </Label>
                  <Slider
                    value={[currentCompressor.makeupGain]}
                    onValueChange={([val]) =>
                      setCompressorSettings((prev) => {
                        const updated = new Map(prev);
                        updated.set(selectedChannel, { ...currentCompressor, makeupGain: val });
                        return updated;
                      })
                    }
                    onValueCommit={([val]) =>
                      setCompressor(selectedChannel, { ...currentCompressor, makeupGain: val })
                    }
                    min={0}
                    max={24}
                    step={0.1}
                  />
                </div>
              </div>

              <div className="bg-slate-700/50 p-4 rounded text-sm text-slate-300 border border-slate-600">
                <p className="font-medium mb-2 flex items-center gap-2">
                  💡 Compression Guide
                </p>
                <div className="space-y-2 text-slate-400">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Ratio:</span> 1.5-2.5:1 subtle, 3-5:1 broadcast standard, 7-12:1 heavy, 20:1+ limiting
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Threshold:</span> -24 to -20dB light, -18 to -14dB medium, -12 to -8dB aggressive
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Attack:</span> 2-5ms catches peaks, 10-20ms preserves punch, 25+ms transparent
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Release:</span> 50-80ms fast/dense, 100-150ms balanced, 200-300ms slow/musical
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Knee:</span> 0-1 hard/aggressive, 2-3 balanced, 4-5 soft/transparent
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <span className="text-slate-300 font-medium">Makeup Gain:</span> Set to match perceived loudness. Typical: 50-80% of threshold value.
                    </div>
                  </div>
                  <p className="text-xs mt-2 bg-blue-900/20 border border-blue-600/30 p-2 rounded">
                    ⚡ Pro Tip: Aim for 3-6dB gain reduction on average speech. More than 10dB sounds over-processed.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-600">
        <p className="font-medium mb-1 text-slate-300">Channel Processing:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>HPF removes low-frequency noise and rumble</li>
          <li>Gate automatically mutes when signal is too quiet</li>
          <li>Compressor evens out volume levels for consistent broadcast quality</li>
          <li>Use presets for quick setup, then fine-tune to taste</li>
        </ul>
      </div>
    </div>
  );
};
