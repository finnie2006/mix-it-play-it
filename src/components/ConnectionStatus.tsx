
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wifi, WifiOff, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConnectionStatusProps {
  isConnected: boolean;
  mixerIP: string;
  onConnect: (connected: boolean) => void;
  onIPChange: (ip: string) => void;
  onConnectMixer: () => Promise<boolean>;
  onDisconnectMixer: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  mixerIP,
  onConnect,
  onIPChange,
  onConnectMixer,
  onDisconnectMixer
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const success = await onConnectMixer();
      if (success) {
        onConnect(true);
        toast({
          title: "Connected to X-Air 18",
          description: `Successfully connected to mixer at ${mixerIP}`,
        });
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to the mixer. Check IP address and ensure mixer is on same network.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnectMixer();
    onConnect(false);
    toast({
      title: "Disconnected",
      description: "Disconnected from X-Air 18 mixer",
    });
  };

  return (
    <Card className="p-6 bg-slate-800/50 border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${isConnected ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
            {isConnected ? <Wifi size={24} /> : <WifiOff size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isConnected ? 'Connected' : 'Disconnected'}
            </h3>
            <p className="text-slate-400">
              {isConnected ? `Mixer IP: ${mixerIP} (WebSocket OSC)` : 'Not connected to X-Air mixer'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isConnected && (
            <div className="flex items-center gap-2">
              <Label htmlFor="mixer-ip" className="text-slate-300">IP Address:</Label>
              <Input
                id="mixer-ip"
                value={mixerIP}
                onChange={(e) => onIPChange(e.target.value)}
                placeholder="192.168.1.100"
                className="w-40 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          )}
          
          <Button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isConnecting}
            className={isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isConnecting ? 'Connecting...' : (isConnected ? 'Disconnect' : 'Connect')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
