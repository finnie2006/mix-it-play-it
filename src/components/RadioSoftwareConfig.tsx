
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface RadioSoftwareConfigProps {
  testRadioConnection: (software: 'mAirList' | 'RadioDJ', host?: string, port?: number) => Promise<boolean>;
}

const RADIO_CONFIG_STORAGE_KEY = 'xair-radio-software-config';

export const RadioSoftwareConfig: React.FC<RadioSoftwareConfigProps> = ({ testRadioConnection }) => {
  const [mairlistConfig, setMairlistConfig] = useState({
    enabled: true,
    host: 'localhost',
    port: 9300,
    username: '',
    password: '',
    apiEndpoint: '/remote'
  });

  const [radiodjConfig, setRadiodjConfig] = useState({
    enabled: false,
    host: 'localhost',
    port: 18123,
    username: '',
    password: '',
    apiEndpoint: '/api'
  });

  const { toast } = useToast();

  // Load saved configurations on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(RADIO_CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.mairlist) setMairlistConfig(parsed.mairlist);
        if (parsed.radiodj) setRadiodjConfig(parsed.radiodj);
        console.log('📻 Loaded radio software configurations:', parsed);
      } catch (error) {
        console.error('Failed to load radio software configurations:', error);
      }
    }
  }, []);

  const saveConfigurations = () => {
    const config = {
      mairlist: mairlistConfig,
      radiodj: radiodjConfig
    };
    try {
      localStorage.setItem(RADIO_CONFIG_STORAGE_KEY, JSON.stringify(config));
      console.log('💾 Radio software configurations saved:', config);
    } catch (error) {
      console.error('Failed to save radio software configurations:', error);
    }
  };

  const handleSaveMairList = () => {
    saveConfigurations();
    toast({
      title: "mAirList Configuration Saved",
      description: "Connection settings have been updated.",
    });
  };

  const handleSaveRadioDJ = () => {
    saveConfigurations();
    toast({
      title: "RadioDJ Configuration Saved",
      description: "Connection settings have been updated.",
    });
  };

  const testConnection = async (software: 'mAirList' | 'RadioDJ') => {
    toast({
      title: `Testing ${software} Connection`,
      description: "Attempting to connect...",
    });
    
    try {
      const config = software === 'mAirList' ? mairlistConfig : radiodjConfig;
      const result = await testRadioConnection(software, config.host, config.port);
      
      toast({
        title: `${software} Connection Test`,
        description: result ? "Connection successful!" : "Connection failed. Check settings.",
        variant: result ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: `${software} Connection Test`,
        description: "Connection failed. Check settings.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8">
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
            <Label htmlFor="mairlist-username" className="text-slate-300">Username (Optional)</Label>
            <Input
              id="mairlist-username"
              value={mairlistConfig.username}
              onChange={(e) => setMairlistConfig(prev => ({ ...prev, username: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!mairlistConfig.enabled}
            />
          </div>
          <div>
            <Label htmlFor="mairlist-password" className="text-slate-300">Password (Optional)</Label>
            <Input
              id="mairlist-password"
              type="password"
              value={mairlistConfig.password}
              onChange={(e) => setMairlistConfig(prev => ({ ...prev, password: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!mairlistConfig.enabled}
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
            onClick={() => testConnection('mAirList')}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={!mairlistConfig.enabled}
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

      {/* RadioDJ Configuration */}
      <Card className={`p-6 border-slate-600 transition-all duration-300 ${
        radiodjConfig.enabled 
          ? 'bg-slate-800/70 border-blue-500/50 shadow-lg shadow-blue-500/10' 
          : 'bg-slate-900/30 border-slate-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-white">RadioDJ Configuration</h3>
            <Badge variant={radiodjConfig.enabled ? 'default' : 'secondary'} className={
              radiodjConfig.enabled ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'
            }>
              {radiodjConfig.enabled ? 'ENABLED' : 'DISABLED'}
            </Badge>
          </div>
          <Switch
            checked={radiodjConfig.enabled}
            onCheckedChange={(checked) => setRadiodjConfig(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="radiodj-host" className="text-slate-300">Host</Label>
            <Input
              id="radiodj-host"
              value={radiodjConfig.host}
              onChange={(e) => setRadiodjConfig(prev => ({ ...prev, host: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!radiodjConfig.enabled}
            />
          </div>
          <div>
            <Label htmlFor="radiodj-port" className="text-slate-300">Port</Label>
            <Input
              id="radiodj-port"
              type="number"
              value={radiodjConfig.port}
              onChange={(e) => setRadiodjConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!radiodjConfig.enabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="radiodj-username" className="text-slate-300">Username (Optional)</Label>
            <Input
              id="radiodj-username"
              value={radiodjConfig.username}
              onChange={(e) => setRadiodjConfig(prev => ({ ...prev, username: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!radiodjConfig.enabled}
            />
          </div>
          <div>
            <Label htmlFor="radiodj-password" className="text-slate-300">Password (Optional)</Label>
            <Input
              id="radiodj-password"
              type="password"
              value={radiodjConfig.password}
              onChange={(e) => setRadiodjConfig(prev => ({ ...prev, password: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={!radiodjConfig.enabled}
            />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="radiodj-endpoint" className="text-slate-300">API Endpoint</Label>
          <Input
            id="radiodj-endpoint"
            value={radiodjConfig.apiEndpoint}
            onChange={(e) => setRadiodjConfig(prev => ({ ...prev, apiEndpoint: e.target.value }))}
            className="bg-slate-700 border-slate-600 text-white"
            disabled={!radiodjConfig.enabled}
          />
        </div>

        <div className="flex justify-between">
          <Button
            onClick={() => testConnection('RadioDJ')}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={!radiodjConfig.enabled}
          >
            Test Connection
          </Button>
          <Button
            onClick={handleSaveRadioDJ}
            className="bg-green-600 hover:bg-green-700"
            disabled={!radiodjConfig.enabled}
          >
            Save Configuration
          </Button>
        </div>
      </Card>

      {/* Command Examples */}
      <Card className="p-6 bg-slate-900/50 border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-4">Command Examples</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-300 mb-2">mAirList Commands:</h4>
            <div className="space-y-1 text-sm font-mono bg-slate-800 p-3 rounded">
              <div className="text-green-400">PLAYER 1 PLAY</div>
              <div className="text-green-400">PLAYER 2 STOP</div>
              <div className="text-green-400">PLAYLIST NEXT</div>
              <div className="text-green-400">JINGLE FIRE "jingle1.mp3"</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-slate-300 mb-2">RadioDJ API Examples:</h4>
            <div className="space-y-1 text-sm font-mono bg-slate-800 p-3 rounded">
              <div className="text-blue-400">http://localhost:18123/api/cmd?pass=password&c=PlayPause</div>
              <div className="text-blue-400">http://localhost:18123/api/cmd?pass=password&c=Stop</div>
              <div className="text-blue-400">http://localhost:18123/api/cmd?pass=password&c=NextTrack</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
