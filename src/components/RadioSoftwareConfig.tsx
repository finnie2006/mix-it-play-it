

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioSoftwareConfig as RadioConfig, SettingsService } from '@/services/settingsService';
import { Radio, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const RadioSoftwareConfig: React.FC = () => {
  const [config, setConfig] = useState<RadioConfig>(() => 
    SettingsService.loadSettings().radioSoftware
  );
  const { toast } = useToast();

  const handleSave = () => {
    SettingsService.updateRadioSoftware(config);
    toast({
      title: "Settings Saved",
      description: `Radio software configuration for ${config.type} has been saved successfully.`,
    });
  };

  const handleConfigChange = (key: keyof RadioConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Radio className="text-blue-400" size={20} />
          Radio Software Configuration
        </CardTitle>
        <CardDescription className="text-slate-300">
          Configure connection to your radio automation software
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
          />
          <Label className="text-slate-200">Enable Radio Software Integration</Label>
        </div>

        {config.enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-slate-200">Software Type</Label>
              <Select
                value={config.type}
                onValueChange={(value: 'mairlist' | 'radiodj') => handleConfigChange('type', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="mairlist" className="text-white hover:bg-slate-600">mAirList</SelectItem>
                  <SelectItem value="radiodj" className="text-white hover:bg-slate-600">RadioDJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Host</Label>
                <Input
                  value={config.host}
                  onChange={(e) => handleConfigChange('host', e.target.value)}
                  placeholder="localhost"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Port</Label>
                <Input
                  type="number"
                  value={config.port}
                  onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                  placeholder="9300"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {config.type === 'radiodj' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Username (Optional)</Label>
                  <Input
                    value={config.username || ''}
                    onChange={(e) => handleConfigChange('username', e.target.value)}
                    placeholder="username"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Password (Optional)</Label>
                  <Input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => handleConfigChange('password', e.target.value)}
                    placeholder="password"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
              <Settings size={16} className="mr-2" />
              Save Configuration
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
