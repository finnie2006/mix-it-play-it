
const osc = require('osc');
const WebSocket = require('ws');
const http = require('http');

// Configuration - Make MIXER_IP dynamic and allow runtime updates
let MIXER_IP = process.env.MIXER_IP || '192.168.5.72';
const MIXER_PORT = parseInt(process.env.MIXER_PORT) || 10024;
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT) || 8080;
const LOCAL_OSC_PORT = 10023;

console.log(`🎛️ X-Air OSC-WebSocket Bridge`);
console.log(`📡 Initial Mixer: ${MIXER_IP}:${MIXER_PORT}`);
console.log(`🌐 WebSocket: localhost:${BRIDGE_PORT}`);
console.log(`🔌 Local OSC: localhost:${LOCAL_OSC_PORT}`);

// Mixer validation state
let mixerConnected = false;
let lastMixerResponse = null;
let validationTimer = null;

// mAirList configuration
let mairlistConfig = {
  host: 'localhost',
  port: 9300,
  username: '',
  password: ''
};

// Create OSC UDP port with initial configuration
let oscPort = new osc.UDPPort({
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

// Function to send mAirList HTTP request (bypassing CORS)
async function sendMairListCommand(command) {
    if (!mairlistConfig.username || !mairlistConfig.password) {
        console.error('❌ mAirList credentials not configured');
        return { success: false, error: 'Missing credentials' };
    }

    const credentials = `${mairlistConfig.username}:${mairlistConfig.password}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    return new Promise((resolve) => {
        const postData = `command=${encodeURIComponent(command)}`;
        
        const options = {
            hostname: mairlistConfig.host,
            port: mairlistConfig.port,
            path: '/execute',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`📻 mAirList response: ${res.statusCode} - ${command}`);
                resolve({ 
                    success: res.statusCode === 200, 
                    status: res.statusCode,
                    data: data 
                });
            });
        });

        req.on('error', (error) => {
            console.error('❌ mAirList request failed:', error.message);
            resolve({ success: false, error: error.message });
        });

        req.write(postData);
        req.end();
    });
}

// Function to update mixer IP and restart OSC connection
function updateMixerIP(newIP) {
    if (newIP === MIXER_IP) return;
    
    console.log(`🔄 Updating mixer IP from ${MIXER_IP} to ${newIP}`);
    MIXER_IP = newIP;
    
    // Close existing OSC port
    if (oscPort && oscPort.socket) {
        oscPort.close();
    }
    
    // Create new OSC port with updated IP
    oscPort = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: LOCAL_OSC_PORT,
        remoteAddress: MIXER_IP,
        remotePort: MIXER_PORT,
        metadata: true
    });
    
    // Reset connection state
    mixerConnected = false;
    lastMixerResponse = null;
    
    // Set up OSC port handlers
    setupOSCHandlers();
    
    // Open the new OSC port
    oscPort.open();
    
    // Broadcast IP change to all clients
    broadcastMixerStatus(false, `Mixer IP updated to ${MIXER_IP}, reconnecting...`);
}

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
    // Send /info command to test mixer response
    if (oscPort && oscPort.socket) {
        oscPort.send({
            address: '/info',
            args: []
        });
    }
    
    // Set timeout for validation
    const validationTimeout = setTimeout(() => {
        if (!mixerConnected) {
            mixerConnected = false;
            broadcastMixerStatus(false, `No response from mixer at ${MIXER_IP}:${MIXER_PORT}`);
        }
    }, 3000);
    
    // Clear any existing validation timer
    if (validationTimer) {
        clearTimeout(validationTimer);
    }
    validationTimer = validationTimeout;
}

// Set up OSC port event handlers
function setupOSCHandlers() {
    oscPort.on('ready', () => {
        console.log(`✅ OSC UDP port ready, connected to ${MIXER_IP}:${MIXER_PORT}`);
        
        // Start mixer validation
        validateMixerConnection();
        
        // Send periodic /xremote command to keep connection alive
        setInterval(() => {
            if (oscPort && oscPort.socket) {
                oscPort.send({
                    address: '/xremote',
                    args: []
                });
                
                // Revalidate mixer connection every 30 seconds
                if (Date.now() - (lastMixerResponse || 0) > 30000) {
                    validateMixerConnection();
                }
            }
        }, 9000);
    });

    oscPort.on('error', (error) => {
        console.error('❌ OSC Error:', error);
        mixerConnected = false;
        broadcastMixerStatus(false, `OSC Error: ${error.message}`);
    });

    // Handle incoming OSC messages from mixer
    oscPort.on('message', (oscMessage) => {
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
}

// Open initial OSC port
setupOSCHandlers();
oscPort.open();

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
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'osc' && message.address) {
                // Send OSC message to mixer
                if (oscPort && oscPort.socket) {
                    oscPort.send({
                        address: message.address,
                        args: message.args || []
                    });
                }
            } else if (message.type === 'subscribe') {
                // Handle subscription requests
                if (oscPort && oscPort.socket) {
                    oscPort.send({
                        address: message.address,
                        args: []
                    });
                }
            } else if (message.type === 'validate_mixer') {
                // Manual mixer validation request
                validateMixerConnection();
            } else if (message.type === 'update_mixer_ip' && message.mixerIP) {
                // Handle mixer IP update from client
                updateMixerIP(message.mixerIP);
            } else if (message.type === 'mairlist_config') {
                // Update mAirList configuration
                mairlistConfig = {
                    host: message.host || 'localhost',
                    port: message.port || 9300,
                    username: message.username || '',
                    password: message.password || ''
                };
                console.log('🔧 mAirList config updated:', { 
                    host: mairlistConfig.host, 
                    port: mairlistConfig.port,
                    username: mairlistConfig.username ? '***' : '(empty)'
                });
                
                // Acknowledge configuration update
                ws.send(JSON.stringify({
                    type: 'mairlist_config_ack',
                    success: true
                }));
            } else if (message.type === 'mairlist_command') {
                // Execute mAirList command via proxy
                const result = await sendMairListCommand(message.command);
                
                // Send result back to client
                ws.send(JSON.stringify({
                    type: 'mairlist_response',
                    command: message.command,
                    success: result.success,
                    status: result.status,
                    error: result.error,
                    requestId: message.requestId
                }));
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
console.log('📋 Features:');
console.log('  • X-Air OSC bridge');
console.log('  • mAirList HTTP proxy (bypasses CORS)'); 
console.log('  • WebSocket API on localhost:8080');

