import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { DynamicsMeterStrip } from './DynamicsMeterStrip';
import { ChannelNameMap } from '@/services/settingsService';

interface DynamicsData {
  channels: { gate: number; comp: number }[]; // Gate and comp reduction for each channel
  timestamp: number;
}

interface DynamicsMeterDashboardProps {
  mixerModel: 'X-Air 16' | 'X-Air 18';
  isConnected: boolean;
  channelNames?: ChannelNameMap;
}

export const DynamicsMeterDashboard: React.FC<DynamicsMeterDashboardProps> = ({
  mixerModel,
  isConnected,
  channelNames,
}) => {
  const maxChannels = 16;
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [dynamicsData, setDynamicsData] = useState<DynamicsData>(() => ({
    channels: Array(maxChannels)
      .fill(null)
      .map(() => ({ gate: 0, comp: 0 })),
    timestamp: 0,
  }));

  // Connect to bridge WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
          console.log('📊 Dynamics meter WebSocket connected');
          setWsConnected(true);
          setWebsocket(ws);

          // Request dynamics meters subscription
          if (ws) {
            ws.send(
              JSON.stringify({
                type: 'subscribe_dynamics',
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'dynamics_meters') {
              setDynamicsData({
                channels: data.channels || Array(maxChannels)
                  .fill(null)
                  .map(() => ({ gate: 0, comp: 0 })),
                timestamp: data.timestamp || Date.now(),
              });
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        };

        ws.onerror = (error) => {
          console.error('📊 Dynamics meter WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log('📊 Dynamics meter WebSocket disconnected');
          setWsConnected(false);
          setWebsocket(null);

          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('📊 Failed to connect dynamics meter WebSocket:', error);
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
          <Activity className="mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Mixer Not Connected</h3>
          <p>Connect to your X-Air mixer to view dynamics meters.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Dynamics Meters</h3>
          <span className="text-xs text-slate-400">Gate & Compressor Gain Reduction</span>
        </div>

        <Badge variant={wsConnected ? 'default' : 'destructive'} className="gap-1">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {wsConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <Card className="p-4 bg-slate-800 border-slate-600">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-16 gap-2">
          {Array.from({ length: maxChannels }, (_, i) => i + 1).map((ch) => (
            <DynamicsMeterStrip
              key={ch}
              channelNumber={ch}
              channelName={channelNames?.[ch]}
              gateReduction={dynamicsData.channels[ch - 1]?.gate || 0}
              compReduction={dynamicsData.channels[ch - 1]?.comp || 0}
            />
          ))}
        </div>
      </Card>

      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-600">
        <p className="font-medium mb-1 text-slate-300">Reading Dynamics Meters:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>GATE:</strong> Shows how much the gate is reducing the signal (0dB = gate open, -60dB = fully closed)</li>
          <li><strong>COMP:</strong> Shows how much the compressor is reducing gain (0dB = no compression, more negative = more compression)</li>
          <li><strong>Green:</strong> Light processing (0-15dB reduction)</li>
          <li><strong>Yellow/Blue:</strong> Moderate processing (15-30dB reduction)</li>
          <li><strong>Amber:</strong> Heavy processing (30-45dB reduction)</li>
          <li><strong>Red:</strong> Very heavy processing (45-60dB reduction)</li>
        </ul>
      </div>
    </div>
  );
};
