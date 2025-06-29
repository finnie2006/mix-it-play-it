
#!/bin/bash
echo "🚀 Starting X-Air Mixer Control with integrated OSC bridge..."

# Start bridge server in background
cd bridge-server
node server.js &
BRIDGE_PID=$!

# Go back to main directory and start web server
cd ..
npm run dev &
WEB_PID=$!

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BRIDGE_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "✅ Both services started. Press Ctrl+C to stop both."
wait
