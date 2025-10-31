# 🚀 LED Control - Quick Reference Card

## ⚡ Quick Setup (5 Minutes)

### 1. Upload Arduino Sketch
```
1. Edit WiFi credentials in esp32_led_strip.ino
2. Connect ESP32 via USB
3. Tools → Board → ESP32 Dev Module
4. Tools → Port → Select your COM port
5. Click Upload (→)
6. Note IP address from Serial Monitor
```

### 2. Configure in Mix-It-Play-It
```
1. Configuration → LED Control tab
2. Add Device (IP, name, port 80)
3. Test connection (should be online)
4. Enable "Speaker Mute LED Indicator"
5. Link device to speaker mute
6. Save configuration
```

### 3. Install Dependencies
```bash
cd bridge-server
npm install
# Restart bridge server
```

---

## 🔌 Wiring Quick Reference

```
ESP32 GPIO 5  →  LED Data (DIN)
ESP32 GND     →  LED GND + Power Supply GND (common ground!)
Power 5V      →  LED VCC
```

**CRITICAL**: All grounds must be connected together!

---

## 🌐 API Endpoints

```
http://YOUR_ESP32_IP/
                     /on            Turn LEDs ON
                     /off           Turn LEDs OFF
                     /toggle        Toggle state
                     /status        Get device status (JSON)
                     /color?r=255&g=0&b=0      Set color
                     /brightness?value=200     Set brightness
                     /animation?mode=solid     Set animation
```

---

## 🎨 Configuration Options

### Device Settings
- Name, IP Address, Port (80), Description
- Enable/Disable toggle

### Indicator Settings
- RGB Color (0-255 each)
- Animation: solid, pulse, blink, chase, rainbow
- Turn-off delay (0-10000ms)
- Device selection

---

## 🐛 Common Issues & Fixes

| Issue | Quick Fix |
|-------|-----------|
| Won't connect to WiFi | Check 2.4GHz network, verify credentials |
| LEDs don't light | Check power supply, verify grounds connected |
| Wrong colors | Change COLOR_ORDER in code (GRB/RGB/BRG) |
| Can't find IP | Check Serial Monitor at 115200 baud |
| Device offline | Verify same network, ping IP address |
| Speaker mute doesn't work | Restart bridge server, check logs |
| LEDs flicker | Add capacitor, check power supply |

---

## 📍 File Locations

```
esp32-led-controller/
  └── esp32_led_strip.ino          Arduino sketch

src/services/
  └── ledControlService.ts         LED control service

src/components/
  └── LedControlConfig.tsx         UI component

bridge-server/
  └── server.js                    Integration code
```

---

## ✅ Success Checklist

Quick validation that everything works:

- [ ] ESP32 shows IP in Serial Monitor
- [ ] Can access web interface in browser
- [ ] LED turns on/off via web interface
- [ ] Device shows "online" in Mix-It-Play-It
- [ ] Opening mic channel turns LED red
- [ ] Closing mic channel turns LED off
- [ ] Response time < 1 second

---

## 💡 Power Requirements

| LED Count | Minimum Power | Recommended Power |
|-----------|---------------|-------------------|
| 30 LEDs   | 2A @ 5V      | 3A @ 5V          |
| 60 LEDs   | 3A @ 5V      | 4A @ 5V          |
| 100 LEDs  | 5A @ 5V      | 6A @ 5V          |

**Formula**: ~60mA per LED at full white brightness

---

## 🔧 Arduino IDE Settings

```
Board: ESP32 Dev Module (or your specific board)
Upload Speed: 921600
Flash Frequency: 80MHz
Flash Mode: QIO
Flash Size: 4MB
Partition Scheme: Default
Core Debug Level: None
Port: [Your COM port]
```

---

## 📱 Testing Commands

### Test LED from Command Line
```bash
# Turn ON
curl -X POST http://192.168.1.100/on

# Turn OFF
curl -X POST http://192.168.1.100/off

# Set color (red)
curl -X POST "http://192.168.1.100/color?r=255&g=0&b=0"

# Get status
curl http://192.168.1.100/status
```

### Test from Browser Console
```javascript
// Turn ON
fetch('http://192.168.1.100/on', { method: 'POST' });

// Turn OFF
fetch('http://192.168.1.100/off', { method: 'POST' });
```

---

## 🎯 Default Configuration

```cpp
// Arduino Sketch Defaults
LED_PIN:      5
NUM_LEDS:     30
LED_TYPE:     WS2812B
COLOR_ORDER:  GRB
BRIGHTNESS:   200
PORT:         80

// Mix-It-Play-It Defaults
Color:        RGB(255, 0, 0) - Red
Animation:    solid
Off Delay:    0 ms
```

---

## 📞 Emergency Reset

### Reset ESP32
Press and hold **RST** button on ESP32 board

### Reset to Factory Settings (Arduino)
Upload blank sketch or reflash with updated code

### Clear Mix-It-Play-It Settings
Open browser console:
```javascript
localStorage.removeItem('xair-led-control-config');
location.reload();
```

---

## 🔗 Useful Links

- **ESP32 Setup**: https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/
- **FastLED**: http://fastled.io/
- **WS2812B Guide**: https://learn.adafruit.com/adafruit-neopixel-uberguide

---

## 📝 Notes Section

**My ESP32 IP**: `_________________`

**WiFi Network**: `_________________`

**LED Strip Length**: `_________________`

**Installation Location**: `_________________`

**Installation Date**: `_________________`

---

**Keep this card handy for quick troubleshooting! 📌**
