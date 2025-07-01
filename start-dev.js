
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting X-Air Mixer Control with integrated OSC bridge...');

// Start the bridge server
const bridgeProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'bridge-server'),
  stdio: 'inherit'
});

// Start the web development server
const webProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit'
});

// Handle process cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  bridgeProcess.kill();
  webProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  bridgeProcess.kill();
  webProcess.kill();
  process.exit();
});

bridgeProcess.on('exit', (code) => {
  console.log(`Bridge server exited with code ${code}`);
});

webProcess.on('exit', (code) => {
  console.log(`Web server exited with code ${code}`);
});
