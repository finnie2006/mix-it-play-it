
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wifi, WifiOff, Settings, AlertTriangle, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OSCBridgeInfo } from '@/components/OSCBridgeInfo';

interface ConnectionStatusProps {
  isConnected: boolean;
  mixerValidated?: boolean;
  mixerStatusMessage?: string;
  mixerIP: string;
  mixerModel: 'X-Air 16' | 'X-Air 18';
  onConnect: (connected: boolean) => void;
  onIPChange: (ip: string) => void;
  onModelChange: (model: 'X-Air 16' | 'X-Air 18') => void;
  onConnectMixer: () => Promise<boolean>;
  onDisconnectMixer: () => void;
  onValidateMixer?: () => void;
  onBridgeConfigured?: (config: { bridgeHost: string; bridgePort: number }) => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  mixerValidated = false,
  mixerStatusMessage = '',
  mixerIP,
  mixerModel,
  onConnect,
  onIPChange,
  onModelChange,
  onConnectMixer,
  onDisconnectMixer,
  onValidateMixer,
  onBridgeConfigured
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBridgeInfo, setShowBridgeInfo] = useState(false);
  const { toast } = useToast();

  const getConnectionStatus = () => {
    if (!isConnected) return { status: 'Disconnected', color: 'red' };
    if (!mixerValidated) return { status: 'Bridge Connected (Mixer Unvalidated)', color: 'yellow' };
    return { status: 'Connected & Validated', color: 'green' };
  };

  const connectionInfo = getConnectionStatus();

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      toast({
        title: "Starting Connection",
        description: "Starting integrated OSC bridge and connecting to mixer...",
      });

      const success = await onConnectMixer();
      if (success) {
        onConnect(true);
        toast({
          title: `Connected to ${mixerModel}`,
          description: `Bridge connected to ${mixerIP}. Validating mixer...`,
        });
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to start integrated bridge. Check mixer network connection.",
        variant: "destructive"
      });
      setShowBridgeInfo(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleValidateMixer = () => {
    if (onValidateMixer) {
      onValidateMixer();
      toast({
        title: "Validating Mixer",
        description: "Sending validation request to mixer...",
      });
    }
  };

  const handleDisconnect = () => {
    onDisconnectMixer();
    onConnect(false);
    toast({
      title: "Disconnected",
      description: `Disconnected from ${mixerModel} mixer and stopped OSC bridge`,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              connectionInfo.color === 'green' ? 'bg-green-600/20 text-green-400' :
              connectionInfo.color === 'yellow' ? 'bg-yellow-600/20 text-yellow-400' :
              'bg-red-600/20 text-red-400'
            }`}>
              {isConnected ? <Server size={24} /> : <WifiOff size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {connectionInfo.status}
              </h3>
              <p className="text-slate-400">
                {isConnected 
                  ? `${mixerModel} at ${mixerIP} - ${mixerStatusMessage || 'Checking mixer status...'}`
                  : `Not connected to ${mixerModel} mixer`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isConnected && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="mixer-model" className="text-slate-300">Model:</Label>
                  <Select value={mixerModel} onValueChange={onModelChange}>
                    <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="X-Air 16" className="text-white hover:bg-slate-600">X-Air 16</SelectItem>
                      <SelectItem value="X-Air 18" className="text-white hover:bg-slate-600">X-Air 18</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </>
            )}
            
            {isConnected && !mixerValidated && onValidateMixer && (
              <Button
                onClick={handleValidateMixer}
                variant="outline"
                className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
              >
                <Settings size={16} className="mr-2" />
                Validate Mixer
              </Button>
            )}
            
            <Button
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={isConnecting}
              className={isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isConnecting ? 'Connecting...' : (isConnected ? 'Disconnect' : 'Connect')}
            </Button>

            {!isConnected && (
              <Button
                onClick={() => setShowBridgeInfo(!showBridgeInfo)}
                variant="outline"
                className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
              >
                <AlertTriangle size={16} className="mr-2" />
                Help
              </Button>
            )}
          </div>
        </div>
      </Card>

      {showBridgeInfo && (
        <OSCBridgeInfo 
          mixerIP={mixerIP} 
          onBridgeConfigured={onBridgeConfigured}
        />
      )}
    </div>
  );
};
