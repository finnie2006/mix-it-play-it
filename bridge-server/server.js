const osc = require('osc');
const WebSocket = require('ws');

// Configuration
const MIXER_IP = process.env.MIXER_IP || '192.168.1.10';
const MIXER_PORT = parseInt(process.env.MIXER_PORT) || 10024;
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT) || 8080;
const LOCAL_OSC_PORT = 10023;

console.log(`🎛️ X-Air OSC-WebSocket Bridge`);
console.log(`📡 Mixer: ${MIXER_IP}:${MIXER_PORT}`);
console.log(`🌐 WebSocket: localhost:${BRIDGE_PORT}`);
console.log(`🔌 Local OSC: localhost:${LOCAL_OSC_PORT}`);

// Create OSC UDP port
const oscPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: LOCAL_OSC_PORT,
    remoteAddress: MIXER_IP,
    remotePort: MIXER_PORT,
    metadata: true
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
    port: BRIDGE_PORT,
    perMessageDeflate: false
});

// Track connected clients
const clients = new Set();

// Open OSC port
oscPort.open();

oscPort.on('ready', () => {
    console.log('✅ OSC UDP port ready');
    
    // Send periodic /xremote command to keep connection alive
    setInterval(() => {
        oscPort.send({
            address: '/xremote',
            args: []
        });
    }, 9000); // Every 9 seconds
});

oscPort.on('error', (error) => {
    console.error('❌ OSC Error:', error);
});

// Handle incoming OSC messages from mixer
oscPort.on('message', (oscMessage) => {
    console.log('📨 OSC from mixer:', oscMessage.address, oscMessage.args);
    
    // Broadcast to all WebSocket clients
    const message = JSON.stringify({
        type: 'osc',
        address: oscMessage.address,
        args: oscMessage.args || [],
        timestamp: Date.now()
    });
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                console.error('Error sending to client:', error);
            }
        }
    });
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('🔗 WebSocket client connected');
    clients.add(ws);
    
    // Send connection status
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        mixerIP: MIXER_IP,
        mixerPort: MIXER_PORT
    }));
    
    // Handle messages from WebSocket client
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📤 WebSocket to OSC:', message);
            
            if (message.type === 'osc' && message.address) {
                // Send OSC message to mixer
                oscPort.send({
                    address: message.address,
                    args: message.args || []
                });
            } else if (message.type === 'subscribe') {
                // Handle subscription requests
                console.log('🔔 Subscription request:', message.address);
                
                // Send subscription request to mixer
                oscPort.send({
                    address: message.address,
                    args: []
                });
            }
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('❌ WebSocket client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clients.delete(ws);
    });
});

console.log('🚀 Bridge server ready!');
console.log('📋 Setup instructions:');
console.log('1. Make sure your X-Air mixer is on the same network');
console.log('2. Set mixer IP in environment or update MIXER_IP constant');
console.log('3. Your web app should connect to ws://localhost:8080');
