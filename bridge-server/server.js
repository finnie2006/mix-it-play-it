const WebSocket = require('ws');
const osc = require('node-osc');
const axios = require('axios');

// WebSocket server for frontend communication
const wss = new WebSocket.Server({ port: 8080 });
console.log('🌐 Bridge server started on port 8080');

// Store connected clients and their subscriptions
const clients = new Set();
const radioConfigs = new Map();
let oscClient = null;
let meterSubscribers = new Set();

// OSC client for mixer communication
function createOSCClient(mixerIP = '192.168.1.67', mixerPort = 10024) {
  if (oscClient) {
    try {
      oscClient.close();
    } catch (e) {
      console.log('Previous OSC client cleanup');
    }
  }

  oscClient = new osc.Client(mixerIP, mixerPort);
  console.log(`🎚️ OSC client connected to ${mixerIP}:${mixerPort}`);
  
  // Set up OSC server to receive meter data
  setupOSCServer(mixerIP);
}

// OSC server to receive meter data from mixer
function setupOSCServer(mixerIP) {
  const dgram = require('dgram');
  const oscParser = require('osc');

  const udpPort = new oscParser.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 10025,
    remoteAddress: mixerIP,
    remotePort: 10024,
    metadata: true,
  });

  udpPort.open();

  udpPort.on("ready", () => {
    console.log("✅ OSC UDP port ready for meter data");
  });

  // Handle raw UDP messages for meter data
  udpPort.socket.on("message", (buffer) => {
    try {
      const addressEnd = buffer.indexOf(0);
      const address = buffer.toString("ascii", 0, addressEnd);

      if (!address.startsWith("/meters/1")) return;

      // Find binary blob type tag (",b")
      const tagStart = buffer.indexOf(",b");
      if (tagStart === -1) return;

      // OSC blobs must be 4-byte aligned
      const blobSizeOffset = (tagStart + 4 + 3) & ~0x03;
      const blobSize = buffer.readInt32BE(blobSizeOffset);
      const blobStart = blobSizeOffset + 4;

      if (blobStart + blobSize > buffer.length) {
        console.warn("⚠ Blob size exceeds packet length, skipping.");
        return;
      }

      const meters = [];
      const count = blobSize / 2;

      for (let i = 0; i < count; i++) {
        const val = buffer.readInt16BE(blobStart + i * 2);
        meters.push(val / 256); // Convert to dB
      }

      // Send meter data to all subscribers
      broadcastMeterData(meters);

    } catch (err) {
      console.error("❌ Error parsing meter data:", err.message);
    }
  });

  // Store UDP port for meter subscriptions
  global.meterUDPPort = udpPort;
}

// Broadcast meter data to WebSocket clients
function broadcastMeterData(meterLevels) {
  const message = {
    type: 'meters',
    data: meterLevels
  };

  meterSubscribers.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Subscribe to meter data from mixer
function subscribeToMeters() {
  if (global.meterUDPPort && global.meterUDPPort.isOpen) {
    const message = {
      address: "/meters",
      args: [
        {
          type: "s",
          value: "/meters/1",
        },
        {
          type: "i", 
          value: 1,
        },
      ],
    };

    global.meterUDPPort.send(message);
    console.log("📡 Subscribed to /meters/1");
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('📱 Frontend client connected');
  clients.add(ws);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received message:', data.type);

      switch (data.type) {
        case 'radio_config':
          radioConfigs.set(ws, data.config);
          ws.send(JSON.stringify({ type: 'radio_config_updated' }));
          console.log(`📻 Radio config updated for ${data.config.type}`);
          break;

        case 'radio_command':
          await handleRadioCommand(ws, data.command);
          break;

        case 'subscribe_meters':
          meterSubscribers.add(ws);
          console.log('📊 Client subscribed to meters');
          
          // Create OSC client if not exists (use default IP for now)
          if (!oscClient) {
            createOSCClient();
          }
          
          // Subscribe to meters
          setTimeout(subscribeToMeters, 500);
          break;

        case 'osc_connect':
          createOSCClient(data.ip, data.port);
          break;

        case 'update_mixer_ip':
          // Handle mixer IP updates from integrated bridge service
          if (data.mixerIP) {
            console.log(`🔄 Updating mixer IP to: ${data.mixerIP}`);
            createOSCClient(data.mixerIP, 10024);
          }
          break;

        case 'subscribe':
          // Handle OSC subscription requests from integrated bridge service
          if (data.address && oscClient) {
            console.log(`📡 OSC subscription request: ${data.address}`);
            // For now, we mainly handle meter subscriptions which are handled above
          }
          break;

        case 'validate_mixer':
          // Handle mixer validation requests
          console.log('🔍 Mixer validation requested');
          ws.send(JSON.stringify({
            type: 'mixer_status',
            connected: oscClient !== null,
            message: oscClient ? 'OSC client connected' : 'OSC client not connected'
          }));
          break;

        default:
          console.log('❓ Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('📱 Frontend client disconnected');
    clients.delete(ws);
    radioConfigs.delete(ws);
    meterSubscribers.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Handle radio command execution
async function handleRadioCommand(ws, command) {
  const config = radioConfigs.get(ws);
  
  if (!config) {
    ws.send(JSON.stringify({
      type: 'radio_command_result',
      success: false,
      command,
      error: 'No radio configuration found'
    }));
    return;
  }

  try {
    let response;
    let statusCode;

    if (config.type === 'mairlist') {
      // MairList REST API
      const url = `http://${config.host}:${config.port}/execute`;
      const authString = config.username && config.password ? 
        `${config.username}:${config.password}` : '';
      
      const requestConfig = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `command=${encodeURIComponent(command)}`
      };

      if (authString) {
        requestConfig.auth = {
          username: config.username,
          password: config.password
        };
      }

      const result = await axios(url, requestConfig);
      response = result.data;
      statusCode = result.status;

    } else if (config.type === 'radiodj') {
      // RadioDJ HTTP GET with password
      let url = `http://${config.host}:${config.port}/${command}`;
      if (config.password) {
        url += `?auth=${encodeURIComponent(config.password)}`;
      }

      const result = await axios.get(url);
      response = result.data;
      statusCode = result.status;
    }

    ws.send(JSON.stringify({
      type: 'radio_command_result',
      success: true,
      command,
      response: response?.toString() || 'Command executed',
      statusCode
    }));

    console.log(`✅ ${config.type} command executed: ${command}`);

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'radio_command_result',
      success: false,
      command,
      error: error.message
    }));

    console.error(`❌ ${config.type} command failed:`, error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridge server...');
  
  if (oscClient) {
    oscClient.close();
  }
  
  if (global.meterUDPPort) {
    global.meterUDPPort.close();
  }

  wss.close(() => {
    console.log('✅ Bridge server stopped');
    process.exit(0);
  });
});

console.log('🎚️ X-Air Radio Controller Bridge Server Ready');
console.log('📡 Supports: MairList REST API, RadioDJ HTTP API, OSC Meter Data');
