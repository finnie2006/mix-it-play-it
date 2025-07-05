import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌉 Starting X-Air OSC Bridge Server (headless mode)...');
console.log('📡 Bridge will continue running even if browser is closed');
console.log('🔗 WebSocket API: ws://localhost:8080');
console.log('🎛️ Connect your mixer dashboard at: http://localhost:5173 (when dev server is running)');
console.log('');

// Start only the bridge server
const bridgeProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'bridge-server'),
  stdio: 'inherit'
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
