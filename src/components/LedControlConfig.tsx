import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  LedControlService, 
  LedDevice, 
  LedControlConfig as LedConfig 
} from '@/services/ledControlService';
import { 
  Lightbulb, 
  Plus, 
  Trash2, 
  TestTube, 
  Wifi, 
  WifiOff,
  Info,
  Settings,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const LedControlConfig: React.FC = () => {
  const [config, setConfig] = useState<LedConfig>(() => 
    LedControlService.loadConfig()
  );
  const [newDevice, setNewDevice] = useState({
    name: '',
    ipAddress: '',
    port: 80,
    enabled: true,
    type: 'esp32' as const,
    description: ''
  });
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, boolean>>(new Map());

  const { toast } = useToast();

  useEffect(() => {
    // Test all devices on mount
    testAllDevices();
  }, []);

  const testAllDevices = async () => {
    const statuses = new Map<string, boolean>();
    for (const device of config.devices) {
      const isOnline = await LedControlService.testDevice(device);
      statuses.set(device.id, isOnline);
    }
    setDeviceStatuses(statuses);
  };

  const handleAddDevice = () => {
    if (!newDevice.name || !newDevice.ipAddress) {
      toast({
        title: "Missing Information",
        description: "Please provide device name and IP address.",
        variant: "destructive"
      });
      return;
    }

    const device = LedControlService.addDevice(newDevice);
    setConfig(LedControlService.loadConfig());
    
    setNewDevice({
      name: '',
      ipAddress: '',
      port: 80,
      enabled: true,
      type: 'esp32',
      description: ''
    });
    setShowAddDevice(false);

    toast({
      title: "Device Added",
      description: `${device.name} has been added successfully.`
    });

    // Test the new device
    testDevice(device.id);
  };

  const handleRemoveDevice = (id: string) => {
    const device = config.devices.find(d => d.id === id);
    LedControlService.removeDevice(id);
    setConfig(LedControlService.loadConfig());
    
    toast({
      title: "Device Removed",
      description: `${device?.name} has been removed.`
    });
  };

  const handleToggleDevice = (id: string, enabled: boolean) => {
    LedControlService.updateDevice(id, { enabled });
    setConfig(LedControlService.loadConfig());
  };

  const testDevice = async (deviceId: string) => {
    const device = config.devices.find(d => d.id === deviceId);
    if (!device) return;

    setTestingDevice(deviceId);
    const isOnline = await LedControlService.testDevice(device);
    
    setDeviceStatuses(prev => new Map(prev).set(deviceId, isOnline));
    setTestingDevice(null);

    toast({
      title: isOnline ? "Device Online" : "Device Offline",
      description: isOnline 
        ? `${device.name} is responding correctly.`
        : `Could not reach ${device.name}. Check IP address and network.`,
      variant: isOnline ? "default" : "destructive"
    });
  };

  const testLedIndicator = async () => {
    await LedControlService.toggleSpeakerMuteIndicator();
    toast({
      title: "Test Command Sent",
      description: "LED indicator should toggle now."
    });
  };

  const handleSpeakerMuteToggle = (deviceId: string, enabled: boolean) => {
    const currentDeviceIds = config.speakerMuteIndicator.deviceIds;
    const newDeviceIds = enabled
      ? [...currentDeviceIds, deviceId]
      : currentDeviceIds.filter(id => id !== deviceId);

    LedControlService.updateSpeakerMuteIndicator({ deviceIds: newDeviceIds });
    setConfig(LedControlService.loadConfig());
  };

  const handleColorChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newColor = { ...config.speakerMuteIndicator.onColor, [channel]: value };
    LedControlService.updateSpeakerMuteIndicator({ onColor: newColor });
    setConfig(LedControlService.loadConfig());
  };

  const handleSaveGlobal = () => {
    LedControlService.saveConfig(config);
    
    // Sync with bridge server if connected
    syncLedSettingsToBridge();
    
    toast({
      title: "Settings Saved",
      description: "LED control configuration has been saved and synced with bridge server."
    });
  };

  const syncLedSettingsToBridge = () => {
    // Check if we have access to the bridge WebSocket through window
    const bridgeWs = (window as any).bridgeWebSocket;
    if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
      bridgeWs.send(JSON.stringify({
        type: 'reload_settings'
      }));
      console.log('💡 LED settings synced with bridge server');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Panel */}
      <Card className="bg-blue-900/20 border-blue-600/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 mt-1 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-400">LED Visual Indicators</h4>
              <p className="text-sm text-slate-300">
                Control LED strips via ESP32 devices to provide visual feedback for mixer events.
                Configure devices and link them to speaker mute events for instant visual cues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speaker Mute Indicator Configuration */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="text-yellow-400" size={20} />
            Speaker Mute LED Indicator
          </CardTitle>
          <CardDescription className="text-slate-300">
            Configure LED behavior when speaker mute is triggered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.speakerMuteIndicator.enabled}
              onCheckedChange={(enabled) => {
                LedControlService.updateSpeakerMuteIndicator({ enabled });
                setConfig(LedControlService.loadConfig());
              }}
            />
            <Label className="text-slate-200">Enable LED Speaker Mute Indicator</Label>
          </div>

          {config.speakerMuteIndicator.enabled && (
            <>
              {/* Color Configuration */}
              <div className="space-y-3">
                <Label className="text-slate-200">Indicator Color</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-400 text-xs">Red</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={config.speakerMuteIndicator.onColor.r}
                      onChange={(e) => handleColorChange('r', parseInt(e.target.value) || 0)}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Green</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={config.speakerMuteIndicator.onColor.g}
                      onChange={(e) => handleColorChange('g', parseInt(e.target.value) || 0)}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Blue</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={config.speakerMuteIndicator.onColor.b}
                      onChange={(e) => handleColorChange('b', parseInt(e.target.value) || 0)}
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                    />
                  </div>
                </div>
                <div 
                  className="h-12 rounded border border-slate-600"
                  style={{
                    backgroundColor: `rgb(${config.speakerMuteIndicator.onColor.r}, ${config.speakerMuteIndicator.onColor.g}, ${config.speakerMuteIndicator.onColor.b})`
                  }}
                />
              </div>

              {/* Animation Mode */}
              <div className="space-y-2">
                <Label className="text-slate-200">Animation Mode</Label>
                <Select
                  value={config.speakerMuteIndicator.animation}
                  onValueChange={(value: any) => {
                    LedControlService.updateSpeakerMuteIndicator({ animation: value });
                    setConfig(LedControlService.loadConfig());
                  }}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="solid" className="text-white">Solid</SelectItem>
                    <SelectItem value="pulse" className="text-white">Pulse</SelectItem>
                    <SelectItem value="blink" className="text-white">Blink</SelectItem>
                    <SelectItem value="chase" className="text-white">Chase</SelectItem>
                    <SelectItem value="rainbow" className="text-white">Rainbow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Off Delay */}
              <div className="space-y-2">
                <Label className="text-slate-200">Turn Off Delay (ms)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  step="100"
                  value={config.speakerMuteIndicator.offDelay}
                  onChange={(e) => {
                    LedControlService.updateSpeakerMuteIndicator({ 
                      offDelay: parseInt(e.target.value) || 0 
                    });
                    setConfig(LedControlService.loadConfig());
                  }}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-400">
                  Delay before turning off LEDs after speaker unmute (0 = instant)
                </p>
              </div>

              {/* Test Button */}
              <Button 
                onClick={testLedIndicator}
                variant="outline"
                className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <TestTube size={16} className="mr-2" />
                Test LED Indicator
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Device Management */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Lightbulb className="text-yellow-400" size={20} />
            LED Devices
          </CardTitle>
          <CardDescription className="text-slate-300">
            Manage your ESP32 LED controllers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device List */}
          {config.devices.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Lightbulb size={48} className="mx-auto mb-4 opacity-50" />
              <p>No LED devices configured yet.</p>
              <p className="text-sm">Add your first ESP32 device below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {config.devices.map(device => {
                const isOnline = deviceStatuses.get(device.id);
                const isTesting = testingDevice === device.id;
                const isLinkedToSpeakerMute = config.speakerMuteIndicator.deviceIds.includes(device.id);

                return (
                  <Card key={device.id} className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">{device.name}</h4>
                            {isOnline === true && (
                              <Wifi size={14} className="text-green-400" />
                            )}
                            {isOnline === false && (
                              <WifiOff size={14} className="text-red-400" />
                            )}
                          </div>
                          <div className="text-sm text-slate-300 space-y-1">
                            <div>
                              <span className="text-slate-400">Address:</span> {device.ipAddress}:{device.port}
                            </div>
                            {device.description && (
                              <div className="text-slate-400">{device.description}</div>
                            )}
                          </div>

                          {/* Speaker Mute Link */}
                          <div className="flex items-center space-x-2 mt-3">
                            <Switch
                              checked={isLinkedToSpeakerMute}
                              onCheckedChange={(enabled) => handleSpeakerMuteToggle(device.id, enabled)}
                              disabled={!config.speakerMuteIndicator.enabled || !device.enabled}
                            />
                            <Label className="text-slate-300 text-xs">
                              Use for speaker mute indicator
                            </Label>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Switch
                            checked={device.enabled}
                            onCheckedChange={(enabled) => handleToggleDevice(device.id, enabled)}
                          />
                          <Button
                            onClick={() => testDevice(device.id)}
                            size="sm"
                            variant="outline"
                            disabled={isTesting}
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                          >
                            {isTesting ? (
                              <span className="animate-spin">⟳</span>
                            ) : (
                              <TestTube size={14} />
                            )}
                          </Button>
                          <Button
                            onClick={() => handleRemoveDevice(device.id)}
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add Device Form */}
          {showAddDevice ? (
            <Card className="bg-slate-900/50 border-slate-600">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Device Name</Label>
                  <Input
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="e.g., Studio Red LED"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">IP Address</Label>
                  <Input
                    value={newDevice.ipAddress}
                    onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                    placeholder="e.g., 192.168.1.100"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Port</Label>
                  <Input
                    type="number"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: parseInt(e.target.value) || 80 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Description (optional)</Label>
                  <Textarea
                    value={newDevice.description}
                    onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
                    placeholder="e.g., Main studio speaker mute indicator"
                    rows={2}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddDevice} className="flex-1 bg-green-600 hover:bg-green-700">
                    Add Device
                  </Button>
                  <Button 
                    onClick={() => setShowAddDevice(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setShowAddDevice(true)}
              variant="outline"
              className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
            >
              <Plus size={16} className="mr-2" />
              Add LED Device
            </Button>
          )}

          {/* Save Button */}
          <Button onClick={handleSaveGlobal} className="w-full bg-blue-600 hover:bg-blue-700">
            <Settings size={16} className="mr-2" />
            Save LED Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
