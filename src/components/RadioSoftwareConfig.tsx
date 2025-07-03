
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';

interface RadioSoftwareConfigProps {
  testRadioConnection: (software: 'mAirList' | 'RadioDJ', host?: string, port?: number, username?: string, password?: string) => Promise<boolean>;
}

const RADIO_CONFIG_STORAGE_KEY = 'xair-radio-software-config';

export const RadioSoftwareConfig: React.FC<RadioSoftwareConfigProps> = ({ testRadioConnection }) => {
  const [mairlistConfig, setMairlistConfig] = useState({
    enabled: true,
    host: '192.168.0.194',
    port: 9300,
    username: 'finn',
    password: '',
    apiEndpoint: '/execute'
  });

  const { toast } = useToast();

  // Load saved configurations on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(RADIO_CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.mairlist) {
          setMairlistConfig(prev => ({
            ...prev,
            ...parsed.mairlist
          }));
        }
        console.log('📻 Loaded mAirList configuration:', parsed.mairlist);
      } catch (error) {
        console.error('Failed to load radio software configurations:', error);
      }
    }
  }, []);

  const saveConfiguration = () => {
    const config = {
      mairlist: mairlistConfig
    };
    try {
      localStorage.setItem(RADIO_CONFIG_STORAGE_KEY, JSON.stringify(config));
      console.log('💾 mAirList configuration saved:', config);
    } catch (error) {
      console.error('Failed to save mAirList configuration:', error);
    }
  };

  const handleSaveMairList = () => {
    saveConfiguration();
    toast({
      title: "mAirList Configuration Saved",
      description: "Connection settings have been updated.",
    });
  };

  const testConnection = async () => {
    if (!mairlistConfig.username || !mairlistConfig.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Testing mAirList Connection",
      description: "Attempting to connect with credentials...",
    });
    
    try {
      const result = await testRadioConnection(
        'mAirList', 
        mairlistConfig.host, 
        mairlistConfig.port, 
        mairlistConfig.username, 
        mairlistConfig.password
      );
      
      toast({
        title: "mAirList Connection Test",
        description: result ? "Connection successful!" : "Connection failed. Check settings and credentials.",
        variant: result ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "mAirList Connection Test",
        description: "Connection failed. Check settings and credentials.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-500/20 bg-blue-500/10">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-100">
          <strong>Focus Mode:</strong> Currently configured for mAirList only. Make sure to enter your credentials from the mAirList REST Remote configuration.
        </AlertDescription>
      </Alert>

      {/* mAirList Configuration */}
      <Card className={`p-6 border-slate-600 transition-all duration-300 ${
        mairlistConfig.enabled 
          ? 'bg-slate-800/70 border-green-500/50 shadow-lg shadow-green-500/10' 
          : 'bg-slate-900/30 border-slate-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-white">mAirList Configuration</h3>
            <Badge variant={mairlistConfig.enabled ? 'default' : 'secondary'} className={
              mairlistConfig.enabled ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
            }>
              {mairlistConfig.enabled ? 'ENABLED' : 'DISABLED'}
            </Badge>
          </div>
          <Switch
            checked={mairlistConfig.enabled}
            onCheckedChange={(checked) => setMairlistConfig(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="mairlist-host" className="text-slate-300">Host</Label>
            <Input
              id="mairlist-host"
              value={mairlistConfig.host}
              onChange={(e) => setMairlistConfig(prev => ({ ...prev, host: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!mairlistConfig.enabled}
            />
          </div>
          <div>
            <Label htmlFor="mairlist-port" className="text-slate-300">Port</Label>
            <Input
              id="mairlist-port"
              type="number"
              value={mairlistConfig.port}
              onChange={(e) => setMairlistConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!mairlistConfig.enabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="mairlist-username" className="text-slate-300">Username <span className="text-red-400">*</span></Label>
            <Input
              id="mairlist-username"
              value={mairlistConfig.username}
              onChange={(e) => setMairlistConfig(prev => ({ ...prev, username: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!mairlistConfig.enabled}
              placeholder="Enter mAirList username"
            />
          </div>
          <div>
            <Label htmlFor="mairlist-password" className="text-slate-300">Password <span className="text-red-400">*</span></Label>
            <Input
              id="mairlist-password"
              type="password"
              value={mairlistConfig.password}
              onChange={(e) => setMairlistConfig(prev => ({ ...prev, password: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!mairlistConfig.enabled}
              placeholder="Enter mAirList password"
            />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="mairlist-endpoint" className="text-slate-300">API Endpoint</Label>
          <Input
            id="mairlist-endpoint"
            value={mairlistConfig.apiEndpoint}
            onChange={(e) => setMairlistConfig(prev => ({ ...prev, apiEndpoint: e.target.value }))}
            className="bg-slate-700 border-slate-600 text-white"
            disabled={!mairlistConfig.enabled}
          />
        </div>

        <div className="flex justify-between">
          <Button
            onClick={testConnection}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={!mairlistConfig.enabled || !mairlistConfig.username || !mairlistConfig.password}
          >
            Test Connection
          </Button>
          <Button
            onClick={handleSaveMairList}
            className="bg-green-600 hover:bg-green-700"
            disabled={!mairlistConfig.enabled}
          >
            Save Configuration
          </Button>
        </div>
      </Card>

      {/* Command Examples */}
      <Card className="p-6 bg-slate-900/50 border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-4">mAirList Command Examples</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-300 mb-2">Common Commands:</h4>
            <div className="space-y-1 text-sm font-mono bg-slate-800 p-3 rounded">
              <div className="text-green-400">PLAYER 1 PLAY</div>
              <div className="text-green-400">PLAYER 1 STOP</div>
              <div className="text-green-400">PLAYER 2 PLAY</div>
              <div className="text-green-400">PLAYER 2 STOP</div>
              <div className="text-green-400">PLAYLIST NEXT</div>
              <div className="text-green-400">STATUS</div>
            </div>
          </div>
          
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <Info className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-100">
              <strong>CORS Note:</strong> Your browser may show CORS errors, but commands should still reach mAirList if authentication is correct.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
};
