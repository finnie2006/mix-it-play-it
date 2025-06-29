
@echo off
echo Starting X-Air Mixer Control with integrated OSC bridge...
start "OSC Bridge" cmd /k "cd bridge-server && node server.js"
start "Web App" cmd /k "npm run dev"
echo Both services are starting in separate windows
pause
