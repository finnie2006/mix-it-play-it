import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cloud, Upload, Download, RefreshCw, Server, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cloudSyncService, CloudSyncSettings, SyncConfig } from '@/services/cloudSyncService';

export const CloudSyncModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<CloudSyncSettings>(cloudSyncService.getSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [availableConfigs, setAvailableConfigs] = useState<SyncConfig[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAvailableConfigs();
      const storedName = localStorage.getItem('device-name') || '';
      setDeviceName(storedName);
    }
  }, [isOpen]);

  const loadAvailableConfigs = async () => {
    const configs = await cloudSyncService.listAvailableConfigs();
    setAvailableConfigs(configs);
  };

  const handleSaveSettings = () => {
    cloudSyncService.saveSettings(settings);
    
    if (deviceName) {
      cloudSyncService.setDeviceName(deviceName);
    }

    toast({
      title: 'Settings Saved',
      description: 'Cloud sync settings have been saved.',
    });

    setIsOpen(false);
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    const success = await cloudSyncService.syncToCloud();
    setIsSyncing(false);

    if (success) {
      toast({
        title: 'Synced to Cloud',
        description: 'Your configuration has been uploaded successfully.',
      });
      loadAvailableConfigs();
    } else {
      toast({
        title: 'Sync Failed',
        description: 'Failed to upload configuration. Check your settings.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncFromCloud = async (configId?: string) => {
    setIsSyncing(true);
    const success = await cloudSyncService.syncFromCloud(configId);
    setIsSyncing(false);

    if (success) {
      toast({
        title: 'Synced from Cloud',
        description: 'Configuration downloaded. Page will reload to apply changes.',
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      toast({
        title: 'Sync Failed',
        description: 'Failed to download configuration. Check your settings.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-slate-600 bg-slate-800 hover:bg-slate-700 text-white"
        >
          <Cloud size={16} />
          Cloud Sync
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl bg-slate-800 border-slate-600 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Cloud size={20} />
            Cloud Sync Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Device Name */}
          <div className="space-y-2">
            <Label htmlFor="deviceName" className="text-slate-200">
              Device Name
            </Label>
            <Input
              id="deviceName"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Studio Computer 1"
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400">
              Identify this computer in your studio setup
            </p>
          </div>

          {/* Enable Cloud Sync */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-200">Enable Cloud Sync</Label>
              <p className="text-xs text-slate-400">
                Share configurations between studio computers
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Sync Mode Selection */}
              <div className="space-y-2">
                <Label className="text-slate-200">Mode</Label>
                <Select
                  value={settings.mode}
                  onValueChange={(value: 'server' | 'client') => setSettings({ ...settings, mode: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="server" className="text-white hover:bg-slate-600">
                      <div className="flex items-center gap-2">
                        <Server size={14} />
                        <span>Server - Host configs for other computers</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="client" className="text-white hover:bg-slate-600">
                      <div className="flex items-center gap-2">
                        <Cloud size={14} />
                        <span>Client - Connect to another computer</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  {settings.mode === 'server' 
                    ? 'Run a sync server on this computer that others can connect to'
                    : 'Connect to a sync server running on another studio computer'}
                </p>
              </div>

              {/* Server Mode Settings */}
              {settings.mode === 'server' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="serverPort" className="text-slate-200">
                      Server Port
                    </Label>
                    <Input
                      id="serverPort"
                      type="number"
                      value={settings.serverPort}
                      onChange={(e) => setSettings({ ...settings, serverPort: parseInt(e.target.value) || 8081 })}
                      placeholder="8081"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400">
                      Other computers will connect to http://&lt;this-ip&gt;:{settings.serverPort}
                    </p>
                  </div>
                </>
              )}

              {/* Client Mode Settings */}
              {settings.mode === 'client' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="syncUrl" className="text-slate-200">
                      Server Address
                    </Label>
                    <Input
                      id="syncUrl"
                      value={settings.syncUrl}
                      onChange={(e) => setSettings({ ...settings, syncUrl: e.target.value })}
                      placeholder="http://192.168.1.100:8081"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400">
                      Enter the IP address and port of the server computer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="text-slate-200">
                      API Key (Optional)
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                      placeholder="Leave empty if server has no auth"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </>
              )}

              {/* Auto Sync (Client mode only) */}
              {settings.mode === 'client' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">Auto Sync</Label>
                      <p className="text-xs text-slate-400">
                        Automatically sync at regular intervals
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoSync}
                      onCheckedChange={(autoSync) => setSettings({ ...settings, autoSync })}
                    />
                  </div>

                  {settings.autoSync && (
                    <div className="space-y-2">
                      <Label htmlFor="syncInterval" className="text-slate-200">
                        Sync Interval (minutes)
                      </Label>
                      <Input
                        id="syncInterval"
                        type="number"
                        min={1}
                        max={60}
                        value={settings.syncInterval}
                        onChange={(e) => setSettings({ ...settings, syncInterval: parseInt(e.target.value) || 5 })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Sync Actions (Client mode only) */}
              {settings.mode === 'client' && (
                <div className="space-y-3 pt-4 border-t border-slate-600">
                  <Label className="text-slate-200">Sync Actions</Label>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSyncToCloud}
                      disabled={isSyncing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                    {isSyncing ? (
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Upload size={16} className="mr-2" />
                    )}
                    Upload Configuration
                  </Button>

                  <Button
                    onClick={() => handleSyncFromCloud()}
                    disabled={isSyncing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSyncing ? (
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Download size={16} className="mr-2" />
                    )}
                    Download Latest
                  </Button>
                </div>

                  {/* Available Configurations */}
                  {availableConfigs.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-600">
                    <Label className="text-slate-200">Available Configurations</Label>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableConfigs.map((config) => (
                        <div
                          key={config.id}
                          className="p-3 bg-slate-700 rounded-lg border border-slate-600"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Server size={16} className="text-blue-400" />
                              <span className="font-medium">{config.name}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSyncFromCloud(config.id)}
                              disabled={isSyncing}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Download size={14} className="mr-1" />
                            Download
                          </Button>
                        </div>
                        <div className="text-xs text-slate-400">
                          Last modified: {formatDate(config.lastModified)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            ID: {config.id.substring(0, 20)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-slate-600 bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check size={16} className="mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
