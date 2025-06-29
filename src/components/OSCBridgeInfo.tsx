
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Terminal, Info, Play, CheckCircle } from 'lucide-react';

interface OSCBridgeInfoProps {
  mixerIP: string;
  onBridgeConfigured?: (config: { bridgeHost: string; bridgePort: number }) => void;
}

export const OSCBridgeInfo: React.FC<OSCBridgeInfoProps> = ({ 
  mixerIP, 
  onBridgeConfigured 
}) => {
  const [showInstructions, setShowInstructions] = useState(true);

  const handleConfigureBridge = () => {
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
          <strong>X-Air Bridge Required:</strong> X-Air mixers use UDP OSC protocol. Web browsers need a bridge server to communicate with the mixer.
        </AlertDescription>
      </Alert>

      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Terminal className="text-blue-400" size={24} />
          <h3 className="text-xl font-semibold text-white">Setup OSC Bridge Server</h3>
        </div>

        {showInstructions && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Badge>Step 1</Badge>
                Install Dependencies
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-slate-300">Navigate to the bridge server directory:</p>
                <code className="block p-2 bg-slate-900 rounded text-green-400 font-mono text-sm">
                  cd bridge-server
                </code>
                <code className="block p-2 bg-slate-900 rounded text-green-400 font-mono text-sm">
                  npm install
                </code>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Badge>Step 2</Badge>
                Start Bridge Server
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-slate-300">Run with your mixer IP ({mixerIP}):</p>
                <code className="block p-2 bg-slate-900 rounded text-green-400 font-mono text-sm">
                  MIXER_IP={mixerIP} npm start
                </code>
                <p className="text-xs text-slate-400 mt-1">
                  The bridge will run on localhost:8080 and connect to your mixer at {mixerIP}:10024
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Badge>Step 3</Badge>
                Configure Web App
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-slate-300">Once the bridge is running, configure this app:</p>
                <Button 
                  onClick={handleConfigureBridge}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Use Bridge (localhost:8080)
                </Button>
              </div>
            </div>

            <Alert className="border-blue-500/20 bg-blue-500/10">
              <Terminal className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-100">
                <strong>Note:</strong> Make sure your X-Air mixer and computer are on the same network. 
                The mixer should be accessible at {mixerIP} and have OSC enabled (default).
              </AlertDescription>
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
};
