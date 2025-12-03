
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { FaderChannel } from '@/components/FaderChannel';
import { DynamicsMeterStrip } from '@/components/DynamicsMeterStrip';
import { ChannelNameMap } from '@/services/settingsService';

interface MixerDashboardProps {
  isConnected: boolean;
  faderValues?: Record<number, number>;
  muteStates?: Record<number, boolean>;
  faderStates?: Record<number, { isActive: boolean; commandExecuted: boolean }>;
  vuLevels?: Record<number, number>;
  mixerModel?: 'X-Air 16' | 'X-Air 18';
  onConfigureChannel?: (channel: number) => void;
  channelNames?: ChannelNameMap;
}

export const MixerDashboard: React.FC<MixerDashboardProps> = ({ 
  isConnected, 
  faderValues, 
  muteStates = {},
  faderStates = {},
  vuLevels = {},
  mixerModel,
  onConfigureChannel,
  channelNames
}) => {
  // Set channel count based on mixer model
  const maxChannels = mixerModel === 'X-Air 16' ? 12 : 16;
  
  // Dynamics meter state
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [dynamicsData, setDynamicsData] = useState<{ gate: number; comp: number }[]>(() =>
    Array(16)
      .fill(null)
      .map(() => ({ gate: 0, comp: 0 }))
  );

  // Connect to WebSocket for dynamics data
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
          setWebsocket(ws);
          // Request dynamics meters subscription
          if (ws) {
            ws.send(JSON.stringify({ type: 'subscribe_dynamics' }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'dynamics_meters') {
              setDynamicsData(
                data.channels ||
                  Array(16)
                    .fill(null)
                    .map(() => ({ gate: 0, comp: 0 }))
              );
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        };

        ws.onerror = () => {
          setWebsocket(null);
        };

        ws.onclose = () => {
          setWebsocket(null);
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  if (!isConnected) {
    return (
      <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
        <div className="text-slate-400">
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your {mixerModel} mixer to see live fader values.</p>
          <p className="text-sm mt-2">Make sure your mixer is connected to the same network and OSC is enabled.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          {mixerModel} Channels ({maxChannels} channels)
        </h3>
        <p className="text-sm text-slate-400">
          The percentage bars show the current fader positions.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: maxChannels }, (_, i) => {
          const channel = i + 1;
          const value = faderValues[channel] || 0;
          const isMuted = muteStates[channel] || false;
          const faderState = faderStates[channel];
          const isActive = faderState?.isActive || value > 5;
          const commandExecuted = faderState?.commandExecuted || false;
          const vuLevel = vuLevels[channel] || -90;

          return (
            <FaderChannel
              key={channel}
              channel={channel}
              value={value}
              isActive={isActive}
              isMuted={isMuted}
              commandExecuted={commandExecuted}
              vuLevel={vuLevel}
              onConfigureChannel={onConfigureChannel}
            />
          );
        })}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          Dynamics Meters
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Real-time gate and compressor reduction levels for each channel.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: maxChannels }, (_, i) => {
            const channel = i + 1;
            return (
              <DynamicsMeterStrip
                key={channel}
                channelNumber={channel}
                channelName={channelNames?.[channel]}
                gateReduction={dynamicsData[channel - 1]?.gate || 0}
                compReduction={dynamicsData[channel - 1]?.comp || 0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
