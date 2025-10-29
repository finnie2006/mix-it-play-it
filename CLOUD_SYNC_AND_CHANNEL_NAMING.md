# Cloud Sync & Channel Naming Features

## Cloud Sync - Share Configs Between Studio Computers

### Overview
Cloud Sync allows you to share all your X-Air Radio Control configurations between multiple studio computers using a built-in server. This includes:
- Fader mappings
- Radio software settings
- Speaker mute configurations
- Scene configurations (64 slots)
- Silence detection settings
- Color scheme preferences
- Channel names

### How to Use

1. **Access Cloud Sync**
   - Click the **Cloud** button in the top-right corner of the main screen (next to Advanced Settings)

2. **Set Your Device Name**
   - Enter a unique name for this computer (e.g., "Studio A Main", "Production Room Backup")
   - This helps identify which computer owns each configuration

3. **Choose Mode**
   
   **SERVER MODE** (One computer hosts configs):
   - Select "Server - Host configs for other computers"
   - Set the port (default: 8081)
   - Click "Save Settings" to start the built-in server
   - Server runs inside the app - no separate installation needed
   - Other computers will connect to: `http://<this-computer-ip>:8081`
   - Server stores configs in memory (active computers only)

   **CLIENT MODE** (Connect to server computer):
   - Select "Client - Connect to another computer"
   - Enter server address (e.g., `http://192.168.1.100:8081`)
   - Optional: Enter API key if server has authentication
   - Enable "Auto-sync" to periodically upload your config
   - Upload/download configs to/from the server

4. **Upload Configuration (Client Mode)**
   - Click "Upload to Cloud" to save your current settings to the server
   - All settings are bundled into a single package with timestamp
   - Server stores your config and makes it available to other clients

5. **Download Configuration (Client Mode)**
   - View available configurations from other computers
   - Each config shows:
     - Device name that uploaded it
     - Timestamp of upload
     - Download button
   - Click "Download" to apply settings from another computer
   - Page will reload to apply all changes

6. **Auto-Sync (Client Mode)**
   - Enable "Auto-sync every N minutes"
   - Set interval (1-60 minutes)
   - Automatically uploads your config at set intervals
   - Keeps server synchronized with your current settings

### Setup Example: Multi-Studio Configuration

**Scenario**: Studio A (main) and Studio B (backup) need to share configs

**Option 1: Studio A as Server**
1. **Studio A Computer**:
   - Open Cloud Sync modal
   - Device Name: "Studio A Main"
   - Mode: Server
   - Port: 8081
   - Save Settings (server starts automatically)
   - Note Studio A's IP address (e.g., 192.168.1.100)

2. **Studio B Computer**:
   - Open Cloud Sync modal
   - Device Name: "Studio B Backup"
   - Mode: Client
   - Server Address: `http://192.168.1.100:8081`
   - Enable Auto-sync: Every 10 minutes
   - Click "Download Latest" to get Studio A's config

**Option 2: Dedicated Server Computer**
- Use a dedicated always-on computer as server
- All studio computers connect as clients
- Provides central config repository

### Network Requirements
- All computers must be on the same network (or have routing configured)
- Server port must be accessible (check firewall settings)
- Server computer must remain running for clients to sync

### Security Considerations
- Server runs on local network only (no internet exposure by default)
- API key field available for future authentication features
- Use firewall rules to restrict server access to trusted computers
- Server data stored in memory (cleared on app restart)

---

## Channel Naming - Visual Channel Organization

### Overview
Channel Naming provides visual labels for all 16 mixer channels that sync with the X-Air mixer's internal channel names. This makes it easy to identify channels at a glance.

### Features
- **Visual Labels**: Name each channel (e.g., "Host Mic", "Phone 1", "Music Deck A")
- **Color Coding**: Assign colors to channels for quick visual organization
- **Mixer Sync**: Channel names sync bidirectionally with the mixer
- **Import/Export**: Share channel naming setups as JSON files
- **Persistent Storage**: Names saved locally in browser

### How to Use

1. **Access Channel Naming**
   - Go to the **Configuration** tab
   - Click the **Channel Names** tab (icon: Tag)

2. **Edit Channel Names**
   - Click on any channel name field to edit
   - Type the new name (e.g., "Host Mic", "Guest 1")
   - Press Enter or click away to save

3. **Assign Colors**
   - Each channel has a color dropdown
   - Choose from 7 colors:
     - **Slate** (default gray)
     - **Blue** (general purpose)
     - **Green** (on-air/live)
     - **Amber** (music/playback)
     - **Red** (phones/remote)
     - **Purple** (effects/processing)
     - **Pink** (monitors/aux)
   - Colors appear as left border on channel cards

4. **Sync from Mixer**
   - Click **"Sync from Mixer"** button
   - Pulls channel names from the X-Air mixer
   - Overwrites local names with mixer values
   - Requires active mixer connection

5. **Export Channel Setup**
   - Click **"Export"** button
   - Downloads JSON file with all channel names and colors
   - Share file with other studio computers

6. **Import Channel Setup**
   - Click **"Import"** button
   - Select previously exported JSON file
   - Instantly applies all channel names and colors

### OSC Commands (Technical Reference)
The channel naming system uses these OSC commands:
- **Set Name**: `/ch/XX/config/name "Channel Name"`
- **Get Name**: `/ch/XX/config/name` (query)
- **Response**: Mixer sends back `/ch/XX/config/name` with string value

Channel numbers: 01-16

### Best Practices

1. **Color Coding System**
   - Use consistent colors across studios
   - Example scheme:
     - Blue: Staff microphones
     - Green: On-air phone lines
     - Amber: Music playback sources
     - Red: Emergency/priority
     - Purple: Guest microphones
     - Pink: Monitoring/talkback

2. **Naming Conventions**
   - Keep names short (15 characters or less)
   - Use clear identifiers
   - Include location/position for similar items
   - Examples:
     - "Host Mic"
     - "Phone 1", "Phone 2"
     - "Music Deck A", "Music Deck B"
     - "Guest 1", "Guest 2"

3. **Integration with Other Features**
   - Channel names appear in Fader Mapping config
   - Names show in Speaker Mute config
   - Export channel names as part of Cloud Sync

---

## Workflow Examples

### Setting Up a New Studio Computer
1. Open Cloud Sync modal
2. Name this device (e.g., "Studio B")
3. Switch to Custom API mode (if using production server)
4. Download latest config from main studio
5. All settings applied automatically
6. Enable auto-sync for continuous updates

### Organizing a Complex Broadcast Setup
1. Go to Configuration → Channel Names
2. Name all active channels:
   - Ch 1: "Host Mic"
   - Ch 2: "Co-Host Mic"
   - Ch 3-4: "Phone 1-2"
   - Ch 5-6: "Guest Mics"
   - Ch 7-8: "Music Decks"
3. Color code by function:
   - Hosts: Blue
   - Phones: Green
   - Guests: Purple
   - Music: Amber
4. Export setup
5. Upload to Cloud Sync for backup
6. Import on backup computer

### Syncing with X-Air Mixer Settings
1. Configure channel names on mixer display
2. In app, go to Channel Names tab
3. Click "Sync from Mixer"
4. Channel names pulled from mixer
5. Add color coding in app
6. Export and share with team

---

## Technical Notes

### localStorage Keys
- Cloud Sync: `cloudSyncConfig`, `cloudSyncData`
- Channel Names: `channelNames`

### Bridge Server Support
The bridge server (`bridge-server/server.js`) handles:
- `set-channel-name`: Sends name to mixer via OSC
- `get-channel-names`: Requests all 16 channel names
- OSC responses: Broadcasts `/ch/XX/config/name` updates to all clients

### Data Format
Channel names stored as:
```json
{
  "1": { "name": "Host Mic", "color": "blue" },
  "2": { "name": "Guest Mic", "color": "purple" }
}
```

Cloud sync package:
```json
{
  "deviceName": "Studio A",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "faderMappings": {...},
    "radioSoftware": {...},
    "speakerMute": {...},
    "channelNames": {...}
  }
}
```

---

## Troubleshooting

### Cloud Sync Not Working
- **Demo Mode**: Check browser console for localStorage errors
- **Custom API**: Verify API URL is correct and accessible
- **CORS Issues**: Ensure API server allows requests from Electron app
- **Upload Fails**: Check browser console for error messages

### Channel Names Not Syncing
- **Mixer Not Connected**: Verify connection in ConnectionStatus panel
- **Bridge Server Down**: Check if bridge server is running on port 8080
- **OSC Errors**: Check bridge-server console for OSC communication errors
- **Timeout**: Sync may take 5-10 seconds for all 16 channels

### Color Scheme Integration
- Channel naming respects active color scheme
- Color scheme changes update channel card styling
- Accent colors automatically adapt to theme

