# Integration Guide: Adding LED Control to the UI

This guide shows how to integrate the LED Control configuration component into your existing Mix-It-Play-It interface.

## Quick Integration

### Option 1: Add to Advanced Settings Modal

If you already have an Advanced Settings modal or configuration page, add the LED Control Config component there:

```tsx
import { LedControlConfig } from '@/components/LedControlConfig';

// In your settings component:
<div className="settings-sections">
  {/* Your existing sections */}
  <SpeakerMuteConfig />
  <FaderMappingConfig />
  
  {/* Add LED Control section */}
  <LedControlConfig />
</div>
```

### Option 2: Add to Configuration Panel

If you have a tabbed configuration panel:

```tsx
import { LedControlConfig } from '@/components/LedControlConfig';

const ConfigurationPanel = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="faders">Fader Mapping</TabsTrigger>
        <TabsTrigger value="speaker-mute">Speaker Mute</TabsTrigger>
        <TabsTrigger value="led-control">LED Control</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        {/* General settings */}
      </TabsContent>

      <TabsContent value="faders">
        <FaderMappingConfig />
      </TabsContent>

      <TabsContent value="speaker-mute">
        <SpeakerMuteConfig />
      </TabsContent>

      <TabsContent value="led-control">
        <LedControlConfig />
      </TabsContent>
    </Tabs>
  );
};
```

### Option 3: Standalone LED Settings Page

Create a dedicated page for LED control:

```tsx
// src/pages/LedSettings.tsx
import { LedControlConfig } from '@/components/LedControlConfig';

export const LedSettings = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">LED Control Settings</h1>
      <LedControlConfig />
    </div>
  );
};
```

## Enabling LED Control in Settings Service

The LED control configuration is automatically saved to `localStorage` by the `LedControlService`. However, you may want to sync it with your bridge server settings.

### Add to Settings Service Export

Update `src/services/settingsService.ts` to include LED config in exports:

```typescript
import { LedControlService } from './ledControlService';

export class SettingsService {
  // ... existing methods

  static exportAllSettings() {
    const settings = this.loadSettings();
    const ledConfig = LedControlService.loadConfig();

    return {
      ...settings,
      ledControl: ledConfig
    };
  }

  static syncToBridgeServer() {
    const allSettings = this.exportAllSettings();
    
    // Send to bridge server
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({
        type: 'update_settings',
        settings: allSettings
      }));
    }
  }
}
```

## Bridge Server Setup

The bridge server has already been updated to support LED control. Make sure to:

1. **Install dependencies**:
   ```bash
   cd bridge-server
   npm install node-fetch@2.7.0
   ```

2. **Restart the bridge server** after making LED configuration changes

3. **Verify LED devices** are reachable from the bridge server's network

## Testing the Integration

1. **Start the application**
2. **Navigate to LED Control settings**
3. **Add your ESP32 device**:
   - Name: "Test LED"
   - IP: Your ESP32's IP address
   - Port: 80
4. **Click "Test"** to verify connectivity
5. **Enable "Speaker Mute LED Indicator"**
6. **Link the device** to speaker mute events
7. **Save configuration**
8. **Test speaker mute** by opening a mic channel

## Automatic Configuration Sync

To ensure LED settings are synchronized with the bridge server, call `reload_settings` after saving:

```tsx
const handleSave = () => {
  LedControlService.saveConfig(config);
  
  // Notify bridge server to reload settings
  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
    window.ws.send(JSON.stringify({
      type: 'reload_settings'
    }));
  }

  toast({
    title: "Settings Saved",
    description: "LED configuration has been saved and synced."
  });
};
```

## UI/UX Recommendations

### Visual Indicator for LED Status

Add a real-time status indicator showing if LEDs are currently on/off:

```tsx
const [ledActive, setLedActive] = useState(false);

// Listen for speaker mute status
useEffect(() => {
  if (!window.ws) return;

  const handleMessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'speaker_mute_status') {
      setLedActive(data.muted);
    }
  };

  window.ws.addEventListener('message', handleMessage);
  return () => window.ws.removeEventListener('message', handleMessage);
}, []);

return (
  <div className="led-status">
    <span className={ledActive ? 'led-on' : 'led-off'}>
      {ledActive ? '🔴 LED ON' : '⚪ LED OFF'}
    </span>
  </div>
);
```

### Quick Toggle Button

Add a quick test button in your main interface:

```tsx
<Button
  onClick={() => LedControlService.toggleSpeakerMuteIndicator()}
  size="sm"
  variant="outline"
>
  Test LED
</Button>
```

### Device Health Monitoring

Show connection status for each device:

```tsx
const [deviceHealth, setDeviceHealth] = useState<Map<string, boolean>>(new Map());

const checkHealth = async () => {
  const devices = LedControlService.getEnabledDevices();
  const statuses = new Map();
  
  for (const device of devices) {
    const isOnline = await LedControlService.testDevice(device);
    statuses.set(device.id, isOnline);
  }
  
  setDeviceHealth(statuses);
};

// Check health every 30 seconds
useEffect(() => {
  checkHealth();
  const interval = setInterval(checkHealth, 30000);
  return () => clearInterval(interval);
}, []);
```

## Troubleshooting Integration Issues

### LED Config Not Persisting

If LED configuration is not saving:
1. Check browser localStorage is enabled
2. Verify no errors in browser console
3. Check localStorage quota hasn't been exceeded

### Bridge Server Not Controlling LEDs

If bridge server can't reach LEDs:
1. Verify ESP32 and bridge server are on same network
2. Check firewall rules allow outbound HTTP on port 80
3. Review bridge server logs for connection errors
4. Test LED endpoints directly using curl/browser

### Settings Not Syncing

If frontend and bridge server are out of sync:
1. Ensure `reload_settings` message is sent after saving
2. Check WebSocket connection is active
3. Verify `bridge-settings.json` includes ledControl section
4. Restart bridge server to reload configuration

## Next Steps

After integration:
1. Test the complete workflow end-to-end
2. Configure multiple LED devices if needed
3. Experiment with different colors and animations
4. Document your setup for your team
5. Consider adding more event types (scene changes, etc.)

---

Happy coding! 🎨💡
