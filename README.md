# X-Air OSC Bridge

A powerful bridge application that connects Behringer X-Air mixers to radio automation software (mAirList, RadioDJ) via OSC (Open Sound Control) protocol. The bridge provides both a web-based dashboard and a headless bridge-only mode for seamless integration.

## Features

### 🎛️ Mixer Integration
- **X-Air OSC Support**: Connect to any Behringer X-Air mixer via OSC
- **Real-time Fader Monitoring**: Track fader positions and trigger actions
- **Mixer Validation**: Automatic connection testing and status monitoring
- **Dynamic IP Configuration**: Change mixer IP on-the-fly

### 📻 Radio Software Integration
- **mAirList Support**: HTTP API integration with authentication
- **RadioDJ Support**: HTTP API integration with optional auth
- **Configurable Commands**: Map fader actions to custom radio commands
- **Bi-directional Communication**: Send commands and receive responses

### 🎚️ Fader Mapping System
- **Threshold-based Triggers**: Execute commands when faders cross thresholds
- **Fade Up/Down Actions**: Separate commands for fade up and fade down
- **Stereo Channel Support**: Handle stereo pairs as single units
- **Real-time Processing**: Instant command execution with visual feedback

### 🌐 Dual Operation Modes
- **Web Dashboard**: Full-featured React-based control interface
- **Bridge-Only Mode**: Headless operation for production environments
- **WebSocket API**: Real-time communication between components

## Quick Start

### Prerequisites
- Node.js 18+
- Bun package manager (recommended) or npm
- Behringer X-Air mixer on the same network

### Installation

1. **Clone or extract the project**
   ```bash
   cd sm-project
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

### Running the Application

#### Development Mode (Web Dashboard + Bridge)
```bash
bun run dev
# or
npm run dev
```
Access the web dashboard at: `http://localhost:5173`

#### Bridge-Only Mode (Headless)
```bash
node start-bridge-only.js
```

The bridge-only mode will:
1. Prompt for mixer IP configuration
2. Ask about radio software setup
3. Display current fader mappings
4. Start the headless bridge server

## Configuration

### Bridge-Only Mode Settings

When running in bridge-only mode, settings are stored in `bridge-settings.json`:

```json
{
  "mixer": {
    "ip": "192.168.1.67",
    "port": 10024
  },
  "radioSoftware": {
    "type": "mairlist",
    "host": "localhost",
    "port": 9300,
    "username": "",
    "password": "",
    "enabled": true
  },
  "faderMappings": [
    {
      "id": "fader-123456789",
      "channel": 1,
      "isStereo": false,
      "threshold": 0.1,
      "command": "PLAYER 1 PLAY",
      "enabled": true,
      "description": "Start Player 1",
      "fadeDownThreshold": 0.05,
      "fadeDownCommand": "PLAYER 1 STOP"
    }
  ]
}
```

### Web Dashboard Settings

In web mode, settings are stored in browser localStorage and automatically sync with the bridge server.

## Fader Mapping Configuration

### Threshold Settings
- **Threshold**: Fader level that triggers the fade up command (0.0 - 1.0)
- **Fade Down Threshold**: Optional lower threshold for fade down command

### Command Examples

#### mAirList Commands
```
PLAYER 1 PLAY
PLAYER 1 STOP
PLAYER 1 PAUSE
CART 1 PLAY
JINGLE PLAY
```

#### RadioDJ Commands
```
PLAYPAUSE
STOP
PLAYPLAYLIST
PLAYPROMO
PLAYJINGLE
```

### Stereo Channel Support
Enable "Stereo" mode to treat channel pairs (e.g., Ch1+Ch2) as a single control unit.

## API Reference

### WebSocket API

The bridge server provides a WebSocket API at `ws://localhost:8080`:

#### Message Types

**Send OSC Command**
```json
{
  "type": "osc",
  "address": "/ch/01/mix/fader",
  "args": [0.5]
}
```

**Update Mixer IP**
```json
{
  "type": "update_mixer_ip",
  "mixerIP": "192.168.1.100"
}
```

**Update Radio Configuration**
```json
{
  "type": "radio_config",
  "config": {
    "type": "mairlist",
    "host": "localhost",
    "port": 9300,
    "enabled": true
  }
}
```

**Execute Radio Command**
```json
{
  "type": "radio_command",
  "command": "PLAYER 1 PLAY"
}
```

**Reload Settings** (Bridge-only mode)
```json
{
  "type": "reload_settings"
}
```

#### Received Message Types

**OSC Messages**
```json
{
  "type": "osc",
  "address": "/ch/01/mix/fader",
  "args": [0.5],
  "timestamp": 1234567890
}
```

**Mixer Status**
```json
{
  "type": "mixer_status",
  "connected": true,
  "mixerIP": "192.168.1.67",
  "mixerPort": 10024,
  "message": "Mixer responding",
  "timestamp": 1234567890
}
```

**Fader Updates**
```json
{
  "type": "fader_update",
  "channel": 1,
  "isActive": true,
  "commandExecuted": true,
  "timestamp": 1234567890
}
```

## Project Structure

```
├── bridge-server/          # Headless OSC bridge server
│   ├── server.js           # Main bridge server
│   └── package.json        # Bridge dependencies
├── src/                    # React web dashboard
│   ├── components/         # UI components
│   ├── services/          # API services
│   ├── hooks/             # React hooks
│   └── pages/             # Application pages
├── start-bridge-only.js   # Bridge-only mode launcher
├── start-dev.js          # Development mode launcher
├── bridge-settings.json  # Bridge-only settings (created on first run)
└── README.md             # This file
```

## Troubleshooting

### Common Issues

**Mixer Not Connecting**
- Verify mixer IP address and network connectivity
- Ensure mixer has OSC enabled (usually port 10024)
- Check firewall settings

**Radio Commands Not Working**
- Verify radio software API settings
- Test radio software API manually
- Check authentication credentials
- Ensure radio software is running and accessible

**Fader Mappings Not Triggering**
- Check threshold values (0.0 = fader down, 1.0 = fader up)
- Verify channel numbers match mixer layout
- Ensure mappings are enabled
- Check bridge server console for logs

### Debug Mode

Enable verbose logging by setting environment variables:
```bash
DEBUG=true node start-bridge-only.js
```

### Network Configuration

**Default Ports:**
- Bridge WebSocket: `8080`
- Web Dashboard: `5173` (development)
- Bridge OSC: `10023` (local)
- Mixer OSC: `10024` (default X-Air)

## Advanced Usage

### Production Deployment

For production use, run the bridge in headless mode:

1. Configure settings via the initial setup
2. Start with `node start-bridge-only.js`
3. Optionally run as a system service

### Multiple Mixer Support

To run multiple bridge instances:
1. Copy the project to separate directories
2. Configure different ports via environment variables:
   ```bash
   BRIDGE_PORT=8081 node start-bridge-only.js
   ```

### Custom Radio Software Integration

The bridge can be extended to support additional radio software by:
1. Adding new radio types to the configuration
2. Implementing custom command handlers in `sendRadioCommand()`
3. Following the existing mAirList/RadioDJ patterns

## License

This project is open source. See license file for details.

## Support

For issues and questions:
1. Review console logs for error messages
2. Verify network connectivity and configurations
3. Test individual components (mixer, radio software) separately
4. Create a github issue, provide logs

## Contributing

Contributions are welcome! Please:
1. Follow the existing code style
2. Test thoroughly with real hardware
3. Update documentation for new features
4. Consider backward compatibility