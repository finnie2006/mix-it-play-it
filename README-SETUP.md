
# X-Air Mixer Control Setup

## Quick Start

### Option 1: Node.js Script (Recommended)
```bash
node start-dev.js
```

### Option 2: Platform-specific scripts

**Windows:**
```bash
start-dev.bat
```

**Linux/Mac:**
```bash
chmod +x start-dev.sh  # Run this once to make it executable
./start-dev.sh
```

## What happens when you run these scripts:

1. **OSC Bridge Server** starts on `localhost:8080` (WebSocket server)
2. **Web Development Server** starts on `localhost:5173` (Vite dev server)
3. The bridge server will automatically connect to your X-Air mixer
4. The web app will connect to the bridge server for OSC communication

## Stopping the services:

- Press `Ctrl+C` in the terminal to stop both services
- On Windows batch script, close both command windows that opened

## Troubleshooting:

- Make sure your X-Air mixer is connected to the same network
- Configure your mixer IP address in the web interface
- Check that ports 8080 and 5173 are available
