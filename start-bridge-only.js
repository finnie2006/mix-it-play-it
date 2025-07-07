import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Settings file for bridge-only mode
const SETTINGS_FILE = path.join(__dirname, 'bridge-settings.json');

// Default settings structure
const DEFAULT_SETTINGS = {
  mixer: {
    ip: '192.168.1.67',
    port: 10024
  },
  radioSoftware: {
    type: 'mairlist',
    host: 'localhost',
    port: 9300,
    username: '',
    password: '',
    enabled: false
  },
  faderMappings: [],
  speakerMute: {
    enabled: false,
    triggerChannels: [],
    muteType: 'bus',
    busNumber: 1,
    muteGroupNumber: 1,
    threshold: 10,
    description: 'Mute main speakers when mics are open'
  },
  lastUpdated: new Date().toISOString()
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Load or create settings file
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('❌ Error loading settings:', error.message);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to file
function saveSettings(settings) {
  try {
    settings.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log('✅ Settings saved to bridge-settings.json');
  } catch (error) {
    console.error('❌ Error saving settings:', error.message);
  }
}

// Validate IP address format
function isValidIP(ip) {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

// Prompt for mixer configuration
async function configureMixer(settings) {
  console.log('\n🎛️ MIXER CONFIGURATION');
  console.log('=====================');

  const currentIP = await askQuestion(`Enter mixer IP address [${settings.mixer.ip}]: `);
  if (currentIP.trim()) {
    if (isValidIP(currentIP.trim())) {
      settings.mixer.ip = currentIP.trim();
    } else {
      console.log('❌ Invalid IP address format. Using previous value.');
    }
  }

  const currentPort = await askQuestion(`Enter mixer OSC port [${settings.mixer.port}]: `);
  if (currentPort.trim()) {
    const port = parseInt(currentPort.trim());
    if (port > 0 && port <= 65535) {
      settings.mixer.port = port;
    } else {
      console.log('❌ Invalid port number. Using previous value.');
    }
  }

  console.log(`✅ Mixer configured: ${settings.mixer.ip}:${settings.mixer.port}`);
  return settings;
}

// Prompt for radio software configuration
async function configureRadioSoftware(settings) {
  console.log('\n📻 RADIO SOFTWARE CONFIGURATION');
  console.log('===============================');

  const enableRadio = await askQuestion(`Enable radio software integration? [${settings.radioSoftware.enabled ? 'y' : 'n'}]: `);
  settings.radioSoftware.enabled = enableRadio.toLowerCase().startsWith('y');

  if (settings.radioSoftware.enabled) {
    const type = await askQuestion(`Radio software type (mairlist/radiodj) [${settings.radioSoftware.type}]: `);
    if (type.trim() && (type.trim() === 'mairlist' || type.trim() === 'radiodj')) {
      settings.radioSoftware.type = type.trim();
    }

    const host = await askQuestion(`Radio software host [${settings.radioSoftware.host}]: `);
    if (host.trim()) {
      settings.radioSoftware.host = host.trim();
    }

    const port = await askQuestion(`Radio software port [${settings.radioSoftware.port}]: `);
    if (port.trim()) {
      const portNum = parseInt(port.trim());
      if (portNum > 0 && portNum <= 65535) {
        settings.radioSoftware.port = portNum;
      }
    }

    if (settings.radioSoftware.type === 'mairlist') {
      const username = await askQuestion(`mAirList username [${settings.radioSoftware.username || ''}]: `);
      if (username.trim()) {
        settings.radioSoftware.username = username.trim();
      }

      const password = await askQuestion(`mAirList password [${settings.radioSoftware.password ? '***' : ''}]: `);
      if (password.trim()) {
        settings.radioSoftware.password = password.trim();
      }
    } else if (settings.radioSoftware.type === 'radiodj') {
      const password = await askQuestion(`RadioDJ auth password [${settings.radioSoftware.password ? '***' : ''}]: `);
      if (password.trim()) {
        settings.radioSoftware.password = password.trim();
      }
    }

    console.log(`✅ Radio software configured: ${settings.radioSoftware.type} at ${settings.radioSoftware.host}:${settings.radioSoftware.port}`);
  } else {
    console.log('⏭️ Radio software integration disabled');
  }

  return settings;
}

// Prompt for speaker mute configuration
async function configureSpeakerMute(settings) {
  console.log('\n🔇 SPEAKER MUTE CONFIGURATION');
  console.log('=============================');

  const enableSpeakerMute = await askQuestion(`Enable speaker mute when mics are open? [${settings.speakerMute.enabled ? 'y' : 'n'}]: `);
  settings.speakerMute.enabled = enableSpeakerMute.toLowerCase().startsWith('y');

  if (settings.speakerMute.enabled) {
    const muteType = await askQuestion(`Mute method (bus/muteGroup) [${settings.speakerMute.muteType}]: `);
    if (muteType.trim() && (muteType.trim() === 'bus' || muteType.trim() === 'muteGroup')) {
      settings.speakerMute.muteType = muteType.trim();
    }

    if (settings.speakerMute.muteType === 'bus') {
      const busNumber = await askQuestion(`Bus number to mute [${settings.speakerMute.busNumber || 1}]: `);
      if (busNumber.trim()) {
        const num = parseInt(busNumber.trim());
        if (num >= 1 && num <= 6) {
          settings.speakerMute.busNumber = num;
        }
      }
    } else {
      const muteGroupNumber = await askQuestion(`Mute group number [${settings.speakerMute.muteGroupNumber || 1}]: `);
      if (muteGroupNumber.trim()) {
        const num = parseInt(muteGroupNumber.trim());
        if (num >= 1 && num <= 6) {
          settings.speakerMute.muteGroupNumber = num;
        }
      }
    }

    const threshold = await askQuestion(`Trigger threshold (%) [${settings.speakerMute.threshold}]: `);
    if (threshold.trim()) {
      const thresholdNum = parseInt(threshold.trim());
      if (thresholdNum >= 1 && thresholdNum <= 100) {
        settings.speakerMute.threshold = thresholdNum;
      }
    }

    const channels = await askQuestion(`Trigger channels (comma-separated, e.g., 1,2,3,4) [${settings.speakerMute.triggerChannels.join(',')}]: `);
    if (channels.trim()) {
      const channelList = channels.split(',').map(c => parseInt(c.trim())).filter(c => c >= 1 && c <= 16);
      if (channelList.length > 0) {
        settings.speakerMute.triggerChannels = channelList;
      }
    }

    const description = await askQuestion(`Description [${settings.speakerMute.description}]: `);
    if (description.trim()) {
      settings.speakerMute.description = description.trim();
    }

    console.log(`✅ Speaker mute configured: ${settings.speakerMute.muteType} ${settings.speakerMute.muteType === 'bus' ? settings.speakerMute.busNumber : settings.speakerMute.muteGroupNumber}`);
    console.log(`   Trigger channels: ${settings.speakerMute.triggerChannels.join(', ')}`);
  } else {
    console.log('⏭️ Speaker mute disabled');
  }

  return settings;
}

// Display current fader mappings
function displayFaderMappings(settings) {
  console.log('\n🎚️ CURRENT FADER MAPPINGS');
  console.log('=========================');

  if (settings.faderMappings.length === 0) {
    console.log('📝 No fader mappings configured.');
    console.log('💡 You can add mappings through the web interface at http://localhost:5173');
    return;
  }

  settings.faderMappings.forEach((mapping, index) => {
    console.log(`${index + 1}. Channel ${mapping.channel}${mapping.isStereo ? '+' + (mapping.channel + 1) : ''} - ${mapping.description}`);
    console.log(`   Threshold: ${mapping.threshold} | Command: ${mapping.command}`);
    if (mapping.fadeDownCommand) {
      console.log(`   Fade Down: ${mapping.fadeDownThreshold} | Command: ${mapping.fadeDownCommand}`);
    }
    console.log(`   Status: ${mapping.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log('');
  });
}

// Main configuration function
async function runConfiguration() {
  console.log('🌉 X-Air OSC Bridge Configuration');
  console.log('==================================');
  console.log('');

  let settings = loadSettings();

  // Show current configuration
  console.log('📋 Current Configuration:');
  console.log(`   Mixer: ${settings.mixer.ip}:${settings.mixer.port}`);
  console.log(`   Radio Software: ${settings.radioSoftware.enabled ? `${settings.radioSoftware.type} at ${settings.radioSoftware.host}:${settings.radioSoftware.port}` : 'Disabled'}`);
  console.log(`   Fader Mappings: ${settings.faderMappings.length} configured`);
  console.log(`   Speaker Mute: ${settings.speakerMute.enabled ? `${settings.speakerMute.muteType} ${settings.speakerMute.muteType === 'bus' ? settings.speakerMute.busNumber : settings.speakerMute.muteGroupNumber} (${settings.speakerMute.triggerChannels.length} channels)` : 'Disabled'}`);
  console.log('');

  const needsConfig = await askQuestion('Do you want to configure settings? (y/n) [n]: ');

  if (needsConfig.toLowerCase().startsWith('y')) {
    settings = await configureMixer(settings);
    settings = await configureRadioSoftware(settings);
    settings = await configureSpeakerMute(settings);
    saveSettings(settings);
  }

  displayFaderMappings(settings);

  console.log('\n🚀 Starting bridge server with current configuration...');
  console.log('');

  // Set environment variables for the bridge server
  process.env.MIXER_IP = settings.mixer.ip;
  process.env.MIXER_PORT = settings.mixer.port.toString();

  return settings;
}

// Start bridge server with configuration
async function startBridge() {
  try {
    const settings = await runConfiguration();

    console.log('🌉 Starting X-Air OSC Bridge Server (headless mode)...');
    console.log('📡 Bridge will continue running even if browser is closed');
    console.log('🔗 WebSocket API: ws://localhost:8080');
    console.log('🎛️ Connect your mixer dashboard at: http://localhost:5173 (when dev server is running)');
    console.log('');

    // Close readline interface
    rl.close();

    // Start the bridge server
    const bridgeProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, 'bridge-server'),
      stdio: 'inherit',
      env: {
        ...process.env,
        MIXER_IP: settings.mixer.ip,
        MIXER_PORT: settings.mixer.port.toString()
      }
    });

    // Handle process cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bridge server...');
      bridgeProcess.kill();
      process.exit();
    });

    process.on('SIGTERM', () => {
      bridgeProcess.kill();
      process.exit();
    });

    bridgeProcess.on('exit', (code) => {
      console.log(`Bridge server exited with code ${code}`);
      process.exit(code);
    });

    bridgeProcess.on('error', (error) => {
      console.error('Failed to start bridge server:', error);
      process.exit(1);
    });

    console.log('✅ Bridge server started successfully');
    console.log('💡 To stop the bridge, press Ctrl+C');

  } catch (error) {
    console.error('❌ Failed to start bridge:', error);
    rl.close();
    process.exit(1);
  }
}

// Start the configuration and bridge
startBridge();
