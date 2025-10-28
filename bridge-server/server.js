const osc = require('osc');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Add HTTP client for radio software requests
const https = require('https');
const { URL } = require('url');

// Settings file path
const SETTINGS_FILE = path.join(__dirname, '..', 'bridge-settings.json');

// Load settings from file or use environment variables
function loadSettings() {
  let settings = {};

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      settings = JSON.parse(data);
      console.log('📋 Loaded settings from bridge-settings.json');
    }
  } catch (error) {
    console.warn('⚠️ Could not load bridge-settings.json:', error.message);
  }

  return {
    mixer: {
      ip: process.env.MIXER_IP || settings.mixer?.ip || '192.168.1.67',
      port: parseInt(process.env.MIXER_PORT) || settings.mixer?.port || 10024
    },
    radioSoftware: settings.radioSoftware || {
      type: 'mairlist',
      host: 'localhost',
      port: 9300,
      enabled: false
    },
    faderMappings: settings.faderMappings || [],
    speakerMute: settings.speakerMute || {
      enabled: false,
      triggerChannels: [],
      muteType: 'bus',
      busNumber: 1,
      muteGroupNumber: 1,
      threshold: 10,
      description: 'Mute main speakers when mics are open'
    }
  };
}

// Load initial settings
const config = loadSettings();

// Configuration - Make MIXER_IP dynamic and allow runtime updates
let MIXER_IP = config.mixer.ip;
const MIXER_PORT = config.mixer.port;
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT) || 8080;
const LOCAL_OSC_PORT = 10023;

console.log(`🎛️ X-Air OSC-WebSocket Bridge`);
console.log(`📡 Mixer: ${MIXER_IP}:${MIXER_PORT}`);
console.log(`🌐 WebSocket: localhost:${BRIDGE_PORT}`);
console.log(`🔌 Local OSC: localhost:${LOCAL_OSC_PORT}`);

// Radio software configuration - Load from settings
let radioConfig = config.radioSoftware.enabled ? config.radioSoftware : null;

// Fader mapping state
let faderStates = new Map();
let activeMappings = config.faderMappings.filter(m => m.enabled);

// Speaker mute configuration and state
let speakerMuteConfig = config.speakerMute.enabled ? config.speakerMute : null;
let isSpeakerMuted = false;

// VU meter state - IMPLEMENT BACKEND FUNCTIONALITY
let metersSubscribed = false;
let lastMeterData = {
    channels: Array(40).fill(-90), // Initialize with -90dB (silence)
    buses: Array(6).fill(-90), // Initialize 6 bus meters with -90dB (silence)
    timestamp: Date.now()
};

// Store firmware version
let firmwareVersion = null;

// Mixer validation state
let mixerConnected = false;
let lastMixerResponse = null;
let validationTimer = null;

// Parse meter blob for /meters/1 based on debug findings
function parseMeterBlob(blob) {
    const buffer = Buffer.from(blob);
    if (buffer.length < 4) return null;

    // First 4 bytes = count of meter values (big-endian)
    const count = buffer.readInt32BE(0);
    
    const values = [];
    for (let i = 0; i < count; i++) {
        const offset = 4 + i * 2; // Each meter value is 2 bytes
        if (offset + 2 > buffer.length) break;
        
        // Read 16-bit value as little-endian and treat as signed
        const val = buffer.readInt16LE(offset);
        values.push(val / 256.0); // Convert to dB (adjusted for 16-bit values)
    }

    return values;
}

// Broadcast speaker mute status to all clients
function broadcastSpeakerMuteStatus(muted) {
  const statusMessage = JSON.stringify({
    type: 'speaker_mute_status',
    muted: muted,
    config: speakerMuteConfig,
    timestamp: Date.now()
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(statusMessage);
      } catch (error) {
        console.error('Error sending speaker mute status to client:', error);
      }
    }
  });
}

// Get effective trigger channels for speaker mute (supporting name-based mapping)
function getEffectiveSpeakerMuteTriggerChannels() {
  if (!speakerMuteConfig) return [];

  // If following channel names, look up current positions of those names
  if (speakerMuteConfig.followChannelNames && speakerMuteConfig.triggerChannelNames) {
    const effectiveChannels = [];
    
    for (const channelName of speakerMuteConfig.triggerChannelNames) {
      const foundChannel = findChannelByName(channelName);
      if (foundChannel !== null) {
        effectiveChannels.push(foundChannel);
      } else {
        console.warn(`⚠️ Speaker mute trigger channel with name "${channelName}" not found`);
      }
    }
    
    return effectiveChannels;
  }

  // Fall back to traditional channel positions
  return speakerMuteConfig.triggerChannels || [];
}

// Find channel by name
function findChannelByName(channelName) {
  const channelNames = config.channelNames || {};
  for (const [channel, name] of Object.entries(channelNames)) {
    if (name && name.toLowerCase().trim() === channelName.toLowerCase().trim()) {
      return parseInt(channel);
    }
  }
  return null;
}

// Process speaker mute logic
function processSpeakerMute() {
  if (!speakerMuteConfig) return;

  // Get effective trigger channels (supporting name-based mapping)
  const effectiveTriggerChannels = getEffectiveSpeakerMuteTriggerChannels();

  // Check if any trigger channels are above threshold
  const shouldMute = effectiveTriggerChannels.some(channel => {
    const state = faderStates.get(channel);
    return state && state.value >= speakerMuteConfig.threshold;
  });

  // Only send command if mute state has changed
  if (shouldMute !== isSpeakerMuted) {
    isSpeakerMuted = shouldMute;
    
    if (shouldMute) {
      console.log(`🔇 Muting speakers - mic channels active (channels: ${effectiveTriggerChannels.join(', ')})`);
      sendSpeakerMuteCommand(true);
    } else {
      console.log(`🔊 Unmuting speakers - no mic channels active`);
      sendSpeakerMuteCommand(false);
    }
  }
}

function sendSpeakerMuteCommand(mute) {
  if (!speakerMuteConfig || !oscPort || !oscPort.socket) {
    return;
  }

  let oscCommand;

  if (speakerMuteConfig.muteType === 'bus') {
    // Bus mute: /bus/1/mix/on with 0 (mute) or 1 (unmute)
    oscCommand = {
      address: `/bus/${speakerMuteConfig.busNumber || 1}/mix/on`,
      args: [{ type: 'i', value: mute ? 0 : 1 }]
    };
  } else {
    // Mute group: /config/mute/1 with 1 (activate) or 0 (deactivate)
    oscCommand = {
      address: `/config/mute/${speakerMuteConfig.muteGroupNumber || 1}`,
      args: [{ type: 'i', value: mute ? 1 : 0 }]
    };
  }

  oscPort.send(oscCommand);
  console.log(`🔇 Sent speaker ${mute ? 'mute' : 'unmute'} command: ${oscCommand.address}`);

  // Broadcast speaker mute status to clients
  broadcastSpeakerMuteStatus(mute);
}

// Fader mapping processing function
function processFaderUpdate(channel, value) {
  const currentState = faderStates.get(channel) || {
    channel,
    value: 0,
    isActive: false,
    commandExecuted: false
  };

  const previousValue = currentState.value;
  currentState.value = value;

  // Process speaker mute logic
  processSpeakerMute();

  // Find mappings for this channel
  const relevantMappings = activeMappings.filter(mapping => {
    if (mapping.isStereo) {
      return channel === mapping.channel; // Only consider the primary channel for stereo mappings
    }
    return channel === mapping.channel;
  });

  let isActive = false;
  let commandExecuted = false;

  for (const mapping of relevantMappings) {
    // Check for fade up trigger
    const shouldFadeUp = shouldTriggerFadeUp(mapping, channel, value, previousValue);

    // Check for fade down trigger
    const shouldFadeDown = shouldTriggerFadeDown(mapping, channel, value, previousValue);

    // --- Listen to mute logic ---
    let isMuted = false;
    if (mapping.listenToMute) {
      // Try to get mute state for this channel
      if (typeof currentState.muted === 'boolean') {
        isMuted = currentState.muted;
      }
    }

    if (shouldFadeUp) {
      // If listenToMute is enabled and currently muted, do NOT run the start command
      if (!(mapping.listenToMute && isMuted)) {
        console.log(`🎚️ Triggering fade UP mapping for channel ${channel}: ${mapping.command}`);
        executeRadioCommand(mapping.command);
        commandExecuted = true;
        currentState.lastTriggered = Date.now();
      } else {
        console.log(`⏸️ Fade UP ignored for channel ${channel} (muted, listenToMute enabled)`);
      }
    }

    if (shouldFadeDown && mapping.fadeDownCommand) {
      console.log(`🎚️ Triggering fade DOWN mapping for channel ${channel}: ${mapping.fadeDownCommand}`);
      executeRadioCommand(mapping.fadeDownCommand);
      commandExecuted = true;
      currentState.lastTriggered = Date.now();
    }

    // Check if fader is above threshold (active state)
    if (value >= mapping.threshold) {
      isActive = true;
    }
  }

  currentState.isActive = isActive;
  currentState.commandExecuted = commandExecuted;
  faderStates.set(channel, currentState);

  // Broadcast fader state to clients
  if (relevantMappings.length > 0) {
    broadcastFaderUpdate(channel, isActive, commandExecuted);
  }
}

function shouldTriggerFadeUp(mapping, channel, currentValue, previousValue) {
  // Only trigger when crossing the threshold upwards
  const wasAboveThreshold = previousValue >= mapping.threshold;
  const isAboveThreshold = currentValue >= mapping.threshold;

  // Trigger when going from below threshold to above threshold
  return !wasAboveThreshold && isAboveThreshold;
}

function shouldTriggerFadeDown(mapping, channel, currentValue, previousValue) {
  if (!mapping.fadeDownThreshold || !mapping.fadeDownCommand) {
    return false;
  }

  // Only trigger when crossing the fade down threshold downwards
  const wasAboveFadeDownThreshold = previousValue >= mapping.fadeDownThreshold;
  const isBelowFadeDownThreshold = currentValue < mapping.fadeDownThreshold;

  // Trigger when going from above fade down threshold to below fade down threshold
  return wasAboveFadeDownThreshold && isBelowFadeDownThreshold;
}

async function executeRadioCommand(command) {
  if (!radioConfig) {
    console.warn('⚠️ Radio software not configured, cannot execute command');
    return;
  }

  try {
    console.log(`📻 Executing ${radioConfig.type} command: ${command}`);
    console.log(`📻 Target: ${radioConfig.host}:${radioConfig.port}`);

    const result = await sendRadioCommand(command, radioConfig);
    console.log(`✅ Radio command executed successfully: ${command}`);
    console.log(`📋 Response (${result.statusCode}): ${result.response}`);

  } catch (error) {
    console.error('❌ Failed to execute radio command:', error);
  }
}

// Broadcast fader update to all clients
function broadcastFaderUpdate(channel, isActive, commandExecuted) {
  const updateMessage = JSON.stringify({
    type: 'fader_update',
    channel: channel,
    isActive: isActive,
    commandExecuted: commandExecuted,
    timestamp: Date.now()
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(updateMessage);
      } catch (error) {
        console.error('Error sending fader update to client:', error);
      }
    }
  });
}

// Broadcast VU meter update to all clients - IMPLEMENT
function broadcastMeterUpdate(meterData) {
    const updateMessage = JSON.stringify({
        type: 'vu_meters',
        data: meterData,
        timestamp: Date.now()
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(updateMessage);
            } catch (error) {
                console.error('Error sending meter update to client:', error);
            }
        }
    });
}

// Subscribe to VU meters - IMPLEMENT
function subscribeToMeters() {
    if (!oscPort || !oscPort.socket) {
        console.log('📊 Cannot subscribe to meters - OSC port not ready');
        return;
    }

    console.log('📊 Subscribing to VU meters (/meters/1)');
    
    // Send meter subscription message
    oscPort.send({
        address: '/meters',
        args: [{ type: 's', value: '/meters/1' }]
    });

    metersSubscribed = true;

    // Re-subscribe every 5 seconds to maintain connection
    setInterval(() => {
        if (oscPort && oscPort.socket && mixerConnected) {
            oscPort.send({
                address: '/meters',
                args: [{ type: 's', value: '/meters/1' }]
            });
        }
    }, 5000);
}

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
    metersSubscribed = false;

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

        // Request firmware info on ready
        setTimeout(() => {
            if (oscPort && oscPort.socket) {
                oscPort.send({
                    address: '/xinfo',
                    args: []
                });
            }
        }, 1000);
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

            // Auto-subscribe to meters when connection is established
            setTimeout(() => subscribeToMeters(), 1000);
        }

        // VU METER HANDLING - IMPLEMENT BASED ON DEBUG FINDINGS
        if (oscMessage.address === '/meters/1') {
            try {
                const blob = oscMessage.args.find(arg => arg.type === 'b')?.value;
                if (blob) {
                    const values = parseMeterBlob(blob);
                    if (values && values.length >= 38) {
                        // Update meter data with parsed values
                        // /meters/1 structure: 16 mono + 5x2 fx/aux + 6 bus + 4 fx send (all pre) + 2 st (post) + 2 monitor
                        // Positions: 0-15 (16 mono), 16-25 (5x2 fx/aux), 26-31 (6 bus), 32-35 (4 fx send), 36-37 (2 st/main LR), 38-39 (2 monitor)
                        const channels = Array(40).fill(-90);
                        const buses = Array(6).fill(-90);
                        
                        // Copy channel data (first 16 are mono channels)
                        for (let i = 0; i < Math.min(16, values.length); i++) {
                            channels[i] = values[i] < -90 ? -90 : values[i];
                        }
                        
                        // Bus meters at positions 26-31 (6 buses)
                        for (let i = 0; i < 6 && (26 + i) < values.length; i++) {
                            buses[i] = values[26 + i] < -90 ? -90 : values[26 + i];
                        }
                        
                        // Main LR post-fader at positions 36, 37
                        if (values.length >= 38) {
                            channels[36] = values[36] < -90 ? -90 : values[36]; // Main L
                            channels[37] = values[37] < -90 ? -90 : values[37]; // Main R
                        }

                        lastMeterData = {
                            channels: channels,
                            buses: buses,
                            timestamp: Date.now()
                        };

                        // Broadcast to clients
                        broadcastMeterUpdate(lastMeterData);
                    }
                }
            } catch (error) {
                console.error('❌ Error parsing meter data:', error);
            }
        }

        // Handle /xinfo response for firmware version
        if (oscMessage.address === '/xinfo') {
            try {
                // Combine third and fourth string arguments if present, prefixing 'V' to the fourth
                let fw = null;
                if (
                    Array.isArray(oscMessage.args) &&
                    oscMessage.args.length >= 4 &&
                    oscMessage.args[2].type === 's' &&
                    oscMessage.args[3].type === 's'
                ) {
                    fw = `${oscMessage.args[2].value}-V${oscMessage.args[3].value}`;
                }

                if (fw) {
                    firmwareVersion = fw;
                    const fwMsg = JSON.stringify({
                        type: 'firmware_version',
                        version: firmwareVersion,
                        timestamp: Date.now()
                    });
                    clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            try {
                                client.send(fwMsg);
                            } catch (error) {
                                console.error('Error sending firmware version to client:', error);
                            }
                        }
                    });
                } else {
                    console.warn('⚠️ Firmware version not found in /xinfo response');
                }
            } catch (error) {
                console.error('❌ Error parsing /xinfo firmware version:', error);
            }
        }

        // Process fader updates for mappings (e.g., /ch/01/mix/fader)
        if (oscMessage.address && oscMessage.address.includes('/fader') && oscMessage.args && oscMessage.args.length > 0) {
            // Extract channel number from address like /ch/01/mix/fader
            const channelMatch = oscMessage.address.match(/\/ch\/(\d+)\//);
            if (channelMatch) {
                const channel = parseInt(channelMatch[1]);
                const faderValue = oscMessage.args[0]?.value || oscMessage.args[0];

                if (typeof faderValue === 'number') {
                    processFaderUpdate(channel, faderValue);
                }
            }
        }

        // Handle mute state updates for /ch/XX/mix/on
        if (oscMessage.address && oscMessage.address.match(/^\/ch\/\d+\/mix\/on$/) && oscMessage.args && oscMessage.args.length > 0) {
            const channelMatch = oscMessage.address.match(/\/ch\/(\d+)\/mix\/on/);
            if (channelMatch) {
                const channel = parseInt(channelMatch[1]);
                const muted = oscMessage.args[0]?.value === 0;
                
                // Store mute state in faderStates
                const state = faderStates.get(channel) || { channel, value: 0, isActive: false, commandExecuted: false };
                state.muted = muted;
                faderStates.set(channel, state);

                // Process mute change for mappings that listen to mute
                const relevantMappings = activeMappings.filter(
                    mapping => mapping.listenToMute && (
                        (mapping.isStereo && (channel === mapping.channel || channel === mapping.channel + 1)) ||
                        (!mapping.isStereo && channel === mapping.channel)
                    )
                );

                for (const mapping of relevantMappings) {
                    if (muted) {
                        // Mute = Stop command
                        if (mapping.fadeDownCommand) {
                            console.log(`🔇 Mute triggered stop command for channel ${channel}: ${mapping.fadeDownCommand}`);
                            executeRadioCommand(mapping.fadeDownCommand);
                        }
                    } else {
                        // Unmute = Play command, but only if fader is above 0
                        if (mapping.command && state.value > 0) {
                          console.log(`🎚️ Unmute triggered start command for channel ${channel} (fader: ${state.value.toFixed(1)}%): ${mapping.command}`);
                          executeRadioCommand(mapping.command);
                        } else if (mapping.command && state.value === 0) {
                          console.log(`⏸️ Unmute ignored for channel ${channel} (fader at 0%)`);
                        }
                    }
                }
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

  // Send speaker mute status if available
  if (speakerMuteConfig) {
    ws.send(JSON.stringify({
      type: 'speaker_mute_status',
      muted: isSpeakerMuted,
      config: speakerMuteConfig,
      timestamp: Date.now()
    }));
  }

  // Send last meter data if available
  if (lastMeterData.channels) {
    ws.send(JSON.stringify({
      type: 'vu_meters',
      data: lastMeterData,
      timestamp: Date.now()
    }));
  }

  // Send firmware version if available
  if (firmwareVersion) {
    ws.send(JSON.stringify({
      type: 'firmware_version',
      version: firmwareVersion,
      timestamp: Date.now()
    }));
  }

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
      } else if (message.type === 'subscribe_meters') {
        // Handle VU meter subscription
        subscribeToMeters();
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
      } else if (message.type === 'reload_settings') {
        // Reload settings from file
        try {
          const newConfig = loadSettings();
          radioConfig = newConfig.radioSoftware.enabled ? newConfig.radioSoftware : null;
          activeMappings = newConfig.faderMappings.filter(m => m.enabled);
          speakerMuteConfig = newConfig.speakerMute.enabled ? newConfig.speakerMute : null;

          console.log(`⚙️ Settings reloaded: ${activeMappings.length} active mappings, radio ${radioConfig ? 'enabled' : 'disabled'}, speaker mute ${speakerMuteConfig ? 'enabled' : 'disabled'}`);

          // Broadcast updated fader mappings to all clients
          const mappingUpdateMessage = JSON.stringify({
            type: 'fader_mappings',
            mappings: activeMappings,
            timestamp: Date.now()
          });

          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              try {
                client.send(mappingUpdateMessage);
              } catch (error) {
                console.error('Error sending mapping update to client:', error);
              }
            }
          });

          // Send confirmation back to client
          ws.send(JSON.stringify({
            type: 'settings_reloaded',
            success: true,
            activeMappings: activeMappings.length,
            radioEnabled: !!radioConfig,
            speakerMuteEnabled: !!speakerMuteConfig,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('❌ Error reloading settings:', error);
          ws.send(JSON.stringify({
            type: 'settings_reloaded',
            success: false,
            error: error.message,
            timestamp: Date.now()
          }));
        }
      } else if (message.type === 'get_fader_mappings') {
        // Send current fader mappings to client
        ws.send(JSON.stringify({
          type: 'fader_mappings',
          mappings: activeMappings,
          timestamp: Date.now()
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
console.log('  • WebSocket API on localhost:8080');
console.log('  • VU meter monitoring');
if (radioConfig) {
    console.log(`  • Radio software integration (${radioConfig.type})`);
}
if (activeMappings.length > 0) {
    console.log(`  • Fader mappings (${activeMappings.length} active)`);
}
if (speakerMuteConfig) {
    console.log(`  • Speaker mute protection`);
}
console.log('💡 Tips:');
console.log('  • Settings can be updated via the web interface');
console.log('  • Use /reload_settings WebSocket message to refresh configuration');
console.log('  • Use /reload_settings WebSocket message to refresh configuration');
