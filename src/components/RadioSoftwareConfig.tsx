import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioSoftwareConfig as RadioConfig, SettingsService } from '@/services/settingsService';
import { Radio, Settings, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RadioSoftwareConfigProps {
  onSettingsUpdate?: () => void;
}

export const RadioSoftwareConfig: React.FC<RadioSoftwareConfigProps> = ({ onSettingsUpdate }) => {
  const [config, setConfig] = useState<RadioConfig>(() =>
    SettingsService.loadSettings().radioSoftware
  );
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    SettingsService.updateRadioSoftware(config);

    // Trigger settings reload in fader mapping service
    if (onSettingsUpdate) {
      onSettingsUpdate();
    }

    toast({
      title: "Settings Saved",
      description: `Radio software configuration for ${config.type} has been saved successfully.`,
    });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      const testUrl = config.type === 'radiodj' 
        ? `http://${config.host}:${config.port}/opt?auth=${config.password || ''}&var=version`
        : `http://${config.host}:${config.port}/execute?command=hello`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: config.type === 'mairlist' && (config.username || config.password) ? {
          'Authorization': `Basic ${btoa(`${config.username || ''}:${config.password || ''}`)}`
        } : {}
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseText = await response.text();
        toast({
          title: "Verbinding Gelukt! ✅",
          description: `Succesvol verbonden met ${config.type === 'radiodj' ? 'RadioDJ' : 'mAirList'} op ${config.host}:${config.port}`,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      let errorMessage = "Onbekende fout";
      
      if (error.name === 'AbortError') {
        errorMessage = "Verbinding time-out (5 seconden)";
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = "Kan de server niet bereiken. Controleer host en port.";
      } else if (error.message.includes('401')) {
        errorMessage = "Authenticatie gefaald. Controleer gebruikersnaam/wachtwoord.";
      } else if (error.message.includes('404')) {
        errorMessage = "Endpoint niet gevonden. Controleer de server configuratie.";
      } else {
        errorMessage = error.message;
      }

      toast({
        title: "Verbinding Mislukt ❌",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleConfigChange = (key: keyof RadioConfig, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };

      // Auto-update port when software type changes
      if (key === 'type') {
        if (value === 'radiodj' && prev.port === 9300) {
          newConfig.port = 8090;
        } else if (value === 'mairlist' && prev.port === 8090) {
          newConfig.port = 9300;
        }
      }

      return newConfig;
    });
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
                  placeholder={config.type === 'radiodj' ? '8090' : '9300'}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {config.type === 'radiodj' && (
              <div className="space-y-2">
                <Label className="text-slate-200">Password (auth parameter)</Label>
                <Input
                  type="password"
                  value={config.password || ''}
                  onChange={(e) => handleConfigChange('password', e.target.value)}
                  placeholder="Password for RadioDJ auth"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-400">
                  This will be used as the 'auth' parameter in RadioDJ requests
                </p>
              </div>
            )}

            {config.type === 'mairlist' && (
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

            <div className="flex gap-2">
              <Button 
                onClick={testConnection} 
                disabled={isTestingConnection || !config.host || !config.port}
                variant="outline"
                className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi size={16} className="mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Settings size={16} className="mr-2" />
                Save Configuration
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
