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

// Mixer validation state
let mixerConnected = false;
let lastMixerResponse = null;
let validationTimer = null;

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

// Broadcast status to all clients
function broadcastMixerStatus(connected, message = '') {
    const statusMessage = JSON.stringify({
        type: 'mixer_status',
        connected: connected,
        mixerIP: MIXER_IP,
        mixerPort: MIXER_PORT,
        message: message,
        timestamp: Date.now()
    });
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(statusMessage);
            } catch (error) {
                console.error('Error sending status to client:', error);
            }
        }
    });
}

// Validate mixer connectivity
function validateMixerConnection() {
    console.log('🔍 Validating mixer connection...');
    
    // Send /info command to test mixer response
    oscPort.send({
        address: '/info',
        args: []
    });
    
    // Set timeout for validation
    const validationTimeout = setTimeout(() => {
        if (!mixerConnected) {
            console.log('❌ Mixer validation timeout - no response from mixer');
            mixerConnected = false;
            broadcastMixerStatus(false, `No response from mixer at ${MIXER_IP}:${MIXER_PORT}`);
        }
    }, 3000); // 3 second timeout
    
    // Clear any existing validation timer
    if (validationTimer) {
        clearTimeout(validationTimer);
    }
    validationTimer = validationTimeout;
}

// Open OSC port
oscPort.open();

oscPort.on('ready', () => {
    console.log('✅ OSC UDP port ready');
    
    // Start mixer validation
    validateMixerConnection();
    
    // Send periodic /xremote command to keep connection alive
    setInterval(() => {
        oscPort.send({
            address: '/xremote',
            args: []
        });
        
        // Revalidate mixer connection every 30 seconds
        if (Date.now() - (lastMixerResponse || 0) > 30000) {
            validateMixerConnection();
        }
    }, 9000); // Every 9 seconds
});

oscPort.on('error', (error) => {
    console.error('❌ OSC Error:', error);
    mixerConnected = false;
    broadcastMixerStatus(false, `OSC Error: ${error.message}`);
});

// Handle incoming OSC messages from mixer
oscPort.on('message', (oscMessage) => {
    console.log('📨 OSC from mixer:', oscMessage.address, oscMessage.args);
    
    // Update mixer connection status
    lastMixerResponse = Date.now();
    if (!mixerConnected) {
        console.log('✅ Mixer connection validated');
        mixerConnected = true;
        broadcastMixerStatus(true, 'Mixer responding to OSC commands');
        
        // Clear validation timer since we got a response
        if (validationTimer) {
            clearTimeout(validationTimer);
            validationTimer = null;
        }
    }
    
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
    
    // Send current mixer validation status
    ws.send(JSON.stringify({
        type: 'mixer_status',
        connected: mixerConnected,
        mixerIP: MIXER_IP,
        mixerPort: MIXER_PORT,
        message: mixerConnected ? 'Mixer responding' : 'Validating mixer connection...',
        timestamp: Date.now()
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
            } else if (message.type === 'validate_mixer') {
                // Manual mixer validation request
                validateMixerConnection();
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
