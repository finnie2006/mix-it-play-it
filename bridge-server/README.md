
# X-Air OSC-WebSocket Bridge

This bridge server enables web applications to communicate with Behringer X-Air mixers via OSC (Open Sound Control) protocol.

## Installation

```bash
cd bridge-server
npm install
```

## Usage

```bash
# Start with default settings (mixer at 192.168.1.10)
npm start

# Or with custom mixer IP
MIXER_IP=192.168.1.100 npm start

# Custom ports
MIXER_IP=192.168.1.100 MIXER_PORT=10024 BRIDGE_PORT=8080 npm start
```

## Environment Variables

- `MIXER_IP`: IP address of your X-Air mixer (default: 192.168.1.10)
- `MIXER_PORT`: OSC port of the mixer (default: 10024)
- `BRIDGE_PORT`: WebSocket port for web clients (default: 8080)

## Protocol

The bridge accepts WebSocket connections and converts messages between WebSocket JSON and UDP OSC:

### WebSocket to OSC
```json
{
  "type": "osc",
  "address": "/ch/01/mix/fader",
  "args": [0.75]
}
```

### OSC to WebSocket
```json
{
  "type": "osc",
  "address": "/ch/01/mix/fader",
  "args": [0.75],
  "timestamp": 1640995200000
}
```

### Status Messages
```json
{
  "type": "status",
  "connected": true,
  "mixerIP": "192.168.1.10",
  "mixerPort": 10024
}
```
