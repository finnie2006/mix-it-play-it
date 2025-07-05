const osc = require('osc');
const WebSocket = require('ws');
const http = require('http');

// Add HTTP client for radio software requests
const https = require('https');
const { URL } = require('url');

// Configuration - Make MIXER_IP dynamic and allow runtime updates
let MIXER_IP = process.env.MIXER_IP || '192.168.1.67';
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

// Radio software configuration
let radioConfig = null;

// Function to send HTTP request to radio software
async function sendRadioCommand(command, config) {
    return new Promise((resolve, reject) => {
        let url, options, postData = null;

        if (config.type === 'radiodj') {
            // RadioDJ format: GET http://localhost:8090/opt?command=COMMANDFROMFADERMAPPING&auth=finn&arg=1
            const queryParams = new URLSearchParams({
                command: command,
                arg: '1'
            });

            // Add auth parameter if password is provided
            if (config.password) {
                queryParams.append('auth', config.password);
            }

            url = `http://${config.host}:${config.port}/opt?${queryParams.toString()}`;

            options = {
                method: 'GET',
                headers: {}
            };

            console.log(`📻 Sending RadioDJ command to ${url}`);
        } else {
            // mAirList format: POST with form data
            url = `http://${config.host}:${config.port}/execute`;
            postData = `command=${encodeURIComponent(command)}`;

            options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            // Add basic auth if credentials are provided for mAirList
            if (config.username && config.password) {
                const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
                options.headers['Authorization'] = `Basic ${auth}`;
                console.log(`🔐 Using basic auth for mAirList: ${config.username}`);
            }

            console.log(`📻 Sending mAirList command to ${url}: ${command}`);
        }

        const parsedUrl = new URL(url);
        options.hostname = parsedUrl.hostname;
        options.port = parsedUrl.port;
        options.path = parsedUrl.pathname + parsedUrl.search;

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`✅ ${config.type} command executed successfully. Status: ${res.statusCode}`);
                console.log(`📋 Response: ${data}`);
                resolve({
                    success: true,
                    statusCode: res.statusCode,
                    response: data
                });
            });
        });

        req.on('error', (error) => {
            console.error(`❌ ${config.type} command failed: ${error.message}`);
            reject({
                success: false,
                error: error.message
            });
        });

        // Only write post data for mAirList
        if (postData) {
            req.write(postData);
        }

        req.end();
    });
}

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
            } else if (message.type === 'radio_config' && message.config) {
                // Update radio software configuration
                radioConfig = message.config;
                console.log(`📻 Radio config updated: ${radioConfig.host}:${radioConfig.port} (${radioConfig.type})`);

                // Send confirmation back to client
                ws.send(JSON.stringify({
                    type: 'radio_config_updated',
                    success: true,
                    timestamp: Date.now()
                }));
            } else if (message.type === 'radio_command' && message.command) {
                // Execute radio software command
                if (!radioConfig) {
                    console.warn('⚠️ Radio command requested but no radio config available');
                    ws.send(JSON.stringify({
                        type: 'radio_command_result',
                        success: false,
                        error: 'No radio configuration available',
                        command: message.command,
                        timestamp: Date.now()
                    }));
                    return;
                }

                try {
                    const result = await sendRadioCommand(message.command, radioConfig);

                    // Send result back to client
                    ws.send(JSON.stringify({
                        type: 'radio_command_result',
                        success: true,
                        command: message.command,
                        statusCode: result.statusCode,
                        response: result.response,
                        timestamp: Date.now()
                    }));
                } catch (error) {
                    console.error(`❌ Radio command execution failed:`, error);

                    // Send error back to client
                    ws.send(JSON.stringify({
                        type: 'radio_command_result',
                        success: false,
                        error: error.error || error.message || 'Unknown error',
                        command: message.command,
                        timestamp: Date.now()
                    }));
                }
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
console.log('  • WebSocket API on localhost:8080');
