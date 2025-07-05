import dgram from 'node:dgram';
import oscPkg from 'osc';
import chalk from 'chalk';
const { writePacket, readPacket } = oscPkg;

// X AIR mixer details
const MIXER_IP = '192.168.1.67';
const MIXER_PORT = 10024;

// Create UDP socket
const socket = dgram.createSocket('udp4');

let displayInitialized = false;
let mainLR = { left: -90, right: -90 };

// Create /meters/1 subscribe OSC message (ALL CHANNELS)
function createMeterSubscribeMessage() {
    const packet = {
        address: '/meters',
        args: [
            { type: 's', value: '/meters/1' }  // ALL CHANNELS including main LR post
        ]
    };
    return writePacket(packet);
}

// Parse meter blob for /meters/1
function parseMeterBlob(blob) {
    const buffer = Buffer.from(blob);
    if (buffer.length < 4) return;

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

    // For /meters/1 (ALL CHANNELS): 16 mono + 5x2 fx/aux + 6 bus + 4 fx send (all pre) + 2 st (post) + 2 monitor
    // Main LR post-fader should be the "2 st (post)" near the end
    // Try positions 36 and 37 (after 16 mono + 10 fx/aux + 6 bus + 4 fx send)
    if (values.length >= 38) {
        mainLR.left = values[36] || -90;
        mainLR.right = values[37] || -90;
    }
}

function vuBar(db, width = 24) {
    if (db < -90) db = -90;
    const norm = Math.max(0, Math.min(1, (db + 60) / 60));
    const len = Math.round(norm * width);
    const bar = "█".repeat(len) + " ".repeat(width - len);
    if (db >= -6) return chalk.red(bar);
    if (db >= -20) return chalk.yellow(bar);
    return chalk.green(bar);
}

function updateDisplay() {
    if (!displayInitialized) {
        console.clear();
        console.log("🎚 Main LR Output Levels:\n");
        console.log("🔊 MAIN LR OUTPUT:");
        console.log("    L:        dB");
        console.log("    R:        dB");
        displayInitialized = true;
    }

    const leftLine = `    L: ${mainLR.left.toFixed(2).padStart(6)} dB ${vuBar(mainLR.left)}`;
    const rightLine = `    R: ${mainLR.right.toFixed(2).padStart(6)} dB ${vuBar(mainLR.right)}`;
    
    process.stdout.write(`\x1b[4;1H${leftLine}\x1b[K`);
    process.stdout.write(`\x1b[5;1H${rightLine}\x1b[K`);
}

// Handle incoming OSC messages
socket.on('message', (msg) => {
    try {
        const packet = readPacket(msg, { metadata: true });
        const packets = packet.packets || [packet];

        for (const p of packets) {
            if (p.address === '/meters/1') {
                const blob = p.args.find(arg => arg.type === 'b')?.value;
                if (blob) {
                    parseMeterBlob(blob);
                    updateDisplay();
                }
            }
        }
    } catch (err) {
        console.error('❌ Error parsing OSC message:', err.message);
    }
});

// Send meter subscription and keep alive
function subscribeMeters() {
    const msg = createMeterSubscribeMessage();
    socket.send(msg, 0, msg.length, MIXER_PORT, MIXER_IP, (err) => {
        if (err) console.error('❌ Send error:', err.message);
    });
}

// Start
subscribeMeters();
setInterval(subscribeMeters, 5000);

console.log(`📡 Subscribed to main LR meters from ${MIXER_IP}`);
