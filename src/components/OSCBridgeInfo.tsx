
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Info, Terminal, Globe, Wifi } from 'lucide-react';

interface OSCBridgeInfoProps {
  mixerIP: string;
  onBridgeConfigured?: (config: { bridgeHost: string; bridgePort: number }) => void;
}

export const OSCBridgeInfo: React.FC<OSCBridgeInfoProps> = ({ 
  mixerIP, 
  onBridgeConfigured 
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleOpenMixerWeb = () => {
    window.open(`http://${mixerIP}`, '_blank');
  };

  const handleConfigureBridge = () => {
    // For demo purposes, assume bridge runs on localhost:8080
    if (onBridgeConfigured) {
      onBridgeConfigured({
        bridgeHost: 'localhost',
        bridgePort: 8080
      });
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="border-yellow-500/20 bg-yellow-500/10">
        <Info className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-yellow-100">
          <strong>Important:</strong> X-Air mixers use UDP for OSC communication, which web browsers cannot access directly.
        </AlertDescription>
      </Alert>

      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Terminal className="text-blue-400" size={24} />
          <h3 className="text-xl font-semibold text-white">Connection Options</h3>
        </div>

        <div className="grid gap-4">
          {/* Option 1: Web Interface */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="text-green-400" size={20} />
              <div>
                <h4 className="font-semibold text-white">Built-in Web Interface</h4>
                <p className="text-sm text-slate-400">Use the mixer's native web control</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Recommended</Badge>
              <Button 
                size="sm" 
                onClick={handleOpenMixerWeb}
                className="bg-green-600 hover:bg-green-700"
              >
                <ExternalLink size={14} className="mr-1" />
                Open
              </Button>
            </div>
          </div>

          {/* Option 2: OSC Bridge */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Wifi className="text-blue-400" size={20} />
              <div>
                <h4 className="font-semibold text-white">OSC-WebSocket Bridge</h4>
                <p className="text-sm text-slate-400">For custom web applications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Advanced</Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowInstructions(!showInstructions)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Instructions
              </Button>
            </div>
          </div>
        </div>

        {showInstructions && (
          <div className="mt-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <h4 className="font-semibold text-white mb-3">OSC Bridge Setup Instructions</h4>
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <p className="font-medium text-white">1. Install Node.js OSC Bridge:</p>
                <code className="block mt-1 p-2 bg-slate-900 rounded text-green-400 font-mono">
                  npm install -g osc-websocket-bridge
                </code>
              </div>
              <div>
                <p className="font-medium text-white">2. Start the bridge:</p>
                <code className="block mt-1 p-2 bg-slate-900 rounded text-green-400 font-mono">
                  osc-websocket-bridge --mixer-ip {mixerIP} --port 8080
                </code>
              </div>
              <div>
                <p className="font-medium text-white">3. Configure this app:</p>
                <Button 
                  size="sm" 
                  onClick={handleConfigureBridge}
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Use Bridge (localhost:8080)
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
