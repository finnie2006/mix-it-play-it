
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioSoftwareConfig as RadioConfig, SettingsService } from '@/services/settingsService';
import { Radio, Settings } from 'lucide-react';

export const RadioSoftwareConfig: React.FC = () => {
  const [config, setConfig] = useState<RadioConfig>(() => 
    SettingsService.loadSettings().radioSoftware
  );

  const handleSave = () => {
    SettingsService.updateRadioSoftware(config);
  };

  const handleConfigChange = (key: keyof RadioConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="text-blue-400" size={20} />
          Radio Software Configuration
        </CardTitle>
        <CardDescription>
          Configure connection to your radio automation software
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
          />
          <Label>Enable Radio Software Integration</Label>
        </div>

        {config.enabled && (
          <>
            <div className="space-y-2">
              <Label>Software Type</Label>
              <Select
                value={config.type}
                onValueChange={(value: 'mairlist' | 'radiodj') => handleConfigChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mairlist">mAirList</SelectItem>
                  <SelectItem value="radiodj">RadioDJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host</Label>
                <Input
                  value={config.host}
                  onChange={(e) => handleConfigChange('host', e.target.value)}
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={config.port}
                  onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                  placeholder="9300"
                />
              </div>
            </div>

            {config.type === 'radiodj' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username (Optional)</Label>
                  <Input
                    value={config.username || ''}
                    onChange={(e) => handleConfigChange('username', e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password (Optional)</Label>
                  <Input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => handleConfigChange('password', e.target.value)}
                    placeholder="password"
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full">
              <Settings size={16} className="mr-2" />
              Save Configuration
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
