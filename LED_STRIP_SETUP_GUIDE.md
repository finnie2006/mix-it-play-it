# ESP32 LED Strip Control for Speaker Mute Indicator

This guide will walk you through setting up an ESP32-controlled LED strip that automatically turns on (red) when the speaker mute feature is triggered in your radio mixer setup.

## 📋 Table of Contents

- [Hardware Requirements](#hardware-requirements)
- [Wiring Diagram](#wiring-diagram)
- [Software Setup](#software-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

## 🔧 Hardware Requirements

### Required Components

1. **ESP32 Development Board**
   - ESP32-WROOM-32 or similar
   - Any ESP32 with WiFi capability will work
   - ~$5-10 USD

2. **WS2812B LED Strip** (NeoPixel)
   - 30-60 LEDs recommended for a visual indicator
   - 5V addressable LED strip
   - Alternative: WS2811, SK6812, or APA102
   - ~$10-20 USD

3. **5V Power Supply**
   - Capacity depends on LED strip length
   - Calculate: ~60mA per LED at full brightness
   - Example: 30 LEDs = 1.8A minimum (3A recommended)
   - ~$10-15 USD

4. **Optional but Recommended**
   - 470Ω resistor (for data line protection)
   - 1000μF capacitor (for power smoothing)
   - Breadboard and jumper wires
   - Enclosure/case

### Cost Estimate
Total project cost: **$30-50 USD** depending on components you already have.

## 🔌 Wiring Diagram

```
ESP32                    LED Strip
                         
GPIO 5 ----[470Ω]----->  DATA IN
GND ------------------>  GND
                         
5V Power Supply
                         
+ (5V) --------------->  LED Strip VCC
- (GND) -------------->  LED Strip GND + ESP32 GND (common ground!)
```

### Important Wiring Notes

1. **Common Ground**: ESP32 GND and LED strip GND MUST be connected together
2. **Power the LED strip from external 5V**, not from ESP32 3.3V pin (insufficient current)
3. **For long strips** (>30 LEDs), inject power at both ends of the strip
4. **Data line resistor** (470Ω) protects the first LED
5. **Capacitor** (1000μF) across LED strip power prevents voltage spikes

### Pin Configuration

You can change the data pin in the Arduino sketch:
```cpp
#define LED_PIN     5    // Change this to any available GPIO pin
```

**Available GPIO pins on ESP32**: 2, 4, 5, 12-19, 21-23, 25-27, 32-33

⚠️ **Avoid using**: GPIO 0, 1, 3, 6-11 (used for boot/flash)

## 💻 Software Setup

### Step 1: Install Arduino IDE

1. Download Arduino IDE from [arduino.cc](https://www.arduino.cc/en/software)
2. Install the ESP32 board support:
   - Go to **File > Preferences**
   - Add to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to **Tools > Board > Boards Manager**
   - Search for "ESP32" and install "esp32 by Espressif Systems"

### Step 2: Install FastLED Library

1. Go to **Sketch > Include Library > Manage Libraries**
2. Search for "FastLED"
3. Install the latest version (3.6.0 or higher)

### Step 3: Upload the Sketch

1. Open the file: `esp32-led-controller/esp32_led_strip.ino`
2. Edit the WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Adjust LED strip settings if needed:
   ```cpp
   #define LED_PIN     5      // GPIO pin
   #define NUM_LEDS    30     // Number of LEDs
   #define BRIGHTNESS  200    // Brightness (0-255)
   ```
4. Connect your ESP32 via USB
5. Select your board: **Tools > Board > ESP32 Dev Module**
6. Select the correct port: **Tools > Port > (your COM port)**
7. Click **Upload** button (→)

### Step 4: Find the ESP32 IP Address

1. Open **Tools > Serial Monitor** (set to 115200 baud)
2. Press the RESET button on your ESP32
3. You should see output like:
   ```
   === ESP32 LED Controller Starting ===
   ✓ LED strip initialized
   Connecting to WiFi....
   ✓ WiFi connected!
   IP Address: 192.168.1.100
   ✓ HTTP server started
   === Ready! ===
   ```
4. **Note down the IP address** - you'll need it for configuration!

### Step 5: Test the Web Interface

1. Open a web browser
2. Navigate to: `http://192.168.1.100` (use your ESP32's IP)
3. You should see a web interface with ON/OFF controls
4. Test the LED strip by clicking the buttons

## ⚙️ Configuration in Mix-It-Play-It

### Step 1: Add LED Device

1. Open the Mix-It-Play-It application
2. Go to **Settings > Advanced Settings**
3. Navigate to the **LED Control** tab
4. Click **"Add LED Device"**
5. Fill in the details:
   - **Device Name**: "Studio Speaker Mute LED" (or any name)
   - **IP Address**: Your ESP32 IP (e.g., `192.168.1.100`)
   - **Port**: `80` (default)
   - **Description**: "Red LED strip for speaker mute indicator"
6. Click **"Add Device"**
7. Click the **Test** button to verify connection

### Step 2: Enable Speaker Mute Indicator

1. In the **LED Control** section, find **"Speaker Mute LED Indicator"**
2. Toggle **"Enable LED Speaker Mute Indicator"** to ON
3. Configure the indicator:
   - **Color**: Set RGB values (default: 255, 0, 0 for red)
   - **Animation**: Choose from Solid, Pulse, Blink, Chase, or Rainbow
   - **Turn Off Delay**: Set delay in ms before LEDs turn off (0 = instant)
4. Check the box **"Use for speaker mute indicator"** for your device
5. Click **"Test LED Indicator"** to verify
6. Click **"Save LED Configuration"**

### Step 3: Configure Speaker Mute

1. Go to **Settings > Advanced Settings > Speaker Mute Configuration**
2. Enable **"Enable Speaker Mute"**
3. Configure your trigger channels (microphone channels)
4. Set threshold and mute method
5. Save settings

### Step 4: Test the Integration

1. Open a microphone channel above the threshold
2. The LED strip should turn on (red by default)
3. Close the microphone channel (below threshold)
4. The LED strip should turn off (with delay if configured)

## 🎯 Usage

### Automatic Operation

Once configured, the LED strip will automatically:
- **Turn ON** when speaker mute is activated (mic channels open)
- **Turn OFF** when speaker mute is deactivated (mic channels closed)

### Manual Control

You can manually control the LED via:
- **Web Interface**: `http://<ESP32_IP>`
- **API Endpoints**: See [API Reference](#api-reference)

### API Reference

```
GET  /status
     Returns: {"state":"on|off", "brightness":200, "color":{...}, ...}

POST /on
     Turns LEDs on (with configured color)

POST /off
     Turns LEDs off

POST /toggle
     Toggles LED state

POST /color?r=255&g=0&b=0
     Sets RGB color (0-255 for each channel)

POST /brightness?value=200
     Sets brightness (0-255)

POST /animation?mode=solid
     Sets animation mode: solid, pulse, blink, chase, rainbow
```

## 🔍 Troubleshooting

### ESP32 Won't Connect to WiFi

**Problem**: ESP32 shows "WiFi connection failed" in Serial Monitor

**Solutions**:
1. Double-check WiFi credentials (case-sensitive!)
2. Make sure your WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Check if MAC address filtering is enabled on your router
4. Try a different power supply (brown-out can cause issues)
5. Move closer to WiFi router

### LED Strip Doesn't Light Up

**Problem**: ESP32 works but LEDs don't respond

**Solutions**:
1. **Check power supply**: Is it 5V and sufficient amperage?
2. **Verify wiring**: 
   - Data line connected to correct GPIO pin?
   - Common ground connected?
3. **Test voltage**: Measure 5V at LED strip power pins
4. **Try different LED_PIN** in the code
5. **Check LED strip type**: Match COLOR_ORDER in code (GRB vs RGB)
6. **First LED might be dead**: Cut it off and reconnect to 2nd LED

### Can't Find ESP32 IP Address

**Problem**: Device not accessible on the network

**Solutions**:
1. Open Serial Monitor to see IP address on boot
2. Check your router's DHCP client list
3. Use a network scanner app (e.g., Fing, Advanced IP Scanner)
4. Assign a static IP in your router settings
5. Check if device is on the same network/VLAN

### Mix-It-Play-It Can't Connect to LED Device

**Problem**: Test button shows "Device Offline"

**Solutions**:
1. Verify IP address is correct
2. Check if ESP32 is powered and running
3. Test web interface directly in browser
4. Check firewall settings (allow port 80)
5. Make sure computer and ESP32 are on same network
6. Try pinging the device: `ping 192.168.1.100`

### LED Strip Flickers or Shows Wrong Colors

**Problem**: LEDs are unstable or incorrect colors

**Solutions**:
1. **Add capacitor** (1000μF) across LED power supply
2. **Add resistor** (470Ω) on data line
3. **Improve power supply**: Use thicker wires, shorter cables
4. **Check COLOR_ORDER**: Try changing GRB to RGB or BGR
5. **Reduce brightness**: Lower BRIGHTNESS value in code
6. **Inject power**: For long strips, add power at both ends

### LEDs Don't Turn Off

**Problem**: LEDs stay on even after speaker unmute

**Solutions**:
1. Check bridge server logs for errors
2. Verify LED device is checked in "Use for speaker mute indicator"
3. Test manually using "Test LED Indicator" button
4. Check network connectivity
5. Restart bridge server after configuration changes

## 🚀 Advanced Features

### Multiple LED Devices

You can add multiple LED strips in different locations:
1. Set up multiple ESP32 boards with different IPs
2. Add each device in LED Control settings
3. Enable all devices for speaker mute indicator
4. All devices will respond simultaneously

### Custom Colors for Different Events

Edit `ledControlService.ts` to support different colors:
```typescript
// Example: Orange for warnings, red for mute
onColor: { r: 255, g: 165, b: 0 }  // Orange
```

### Animation Modes

Available animation modes:
- **Solid**: Static color (most common)
- **Pulse**: Smooth breathing effect
- **Blink**: On/off flashing
- **Chase**: Running light effect
- **Rainbow**: Cycling rainbow colors

### Static IP Configuration

To assign a static IP to your ESP32, add this to the sketch:
```cpp
IPAddress local_IP(192, 168, 1, 100);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

void setup() {
  // Configure static IP
  if (!WiFi.config(local_IP, gateway, subnet)) {
    Serial.println("Static IP configuration failed");
  }
  
  WiFi.begin(ssid, password);
  // ... rest of setup
}
```

### Power Calculation

Calculate your power supply requirements:
```
Max Current = (Number of LEDs) × 60mA
Example: 30 LEDs × 60mA = 1800mA = 1.8A

Recommended PSU = Max Current × 1.5 (safety margin)
Example: 1.8A × 1.5 = 2.7A → Use 3A power supply
```

### Using Different LED Strip Types

For WS2811 (12V):
```cpp
#define LED_TYPE    WS2811
```

For APA102/DotStar (with clock line):
```cpp
#define LED_TYPE    APA102
#define COLOR_ORDER BGR
#define CLOCK_PIN   18  // Add clock pin
FastLED.addLeds<LED_TYPE, LED_PIN, CLOCK_PIN, COLOR_ORDER>(leds, NUM_LEDS);
```

## 📝 Configuration Files

### bridge-settings.json Structure

The LED configuration is stored in `bridge-settings.json`:
```json
{
  "ledControl": {
    "devices": [
      {
        "id": "led-1234567890",
        "name": "Studio Red LED",
        "ipAddress": "192.168.1.100",
        "port": 80,
        "enabled": true,
        "type": "esp32",
        "description": "Main studio speaker mute indicator"
      }
    ],
    "speakerMuteIndicator": {
      "enabled": true,
      "deviceIds": ["led-1234567890"],
      "onColor": { "r": 255, "g": 0, "b": 0 },
      "offDelay": 0,
      "animation": "solid"
    }
  }
}
```

## 🛠️ Hardware Tips

### Enclosure Ideas
- 3D print a custom case
- Use a project box from electronics store
- Mount in a wall-mounted light housing
- Use LED strip aluminum channels for professional look

### Mounting Options
- Adhesive backing (most LED strips have this)
- Aluminum channels with mounting clips
- 3M Command strips for temporary mounting
- Cable ties for studio equipment racks

### Cable Management
- Use cable raceways to hide wires
- Label power supply clearly
- Use colored cables (red=5V, black=GND, yellow=DATA)
- Keep power and data cables separate to reduce interference

## 📞 Support

If you encounter issues not covered in this guide:
1. Check Serial Monitor output for error messages
2. Test each component individually (ESP32, LEDs, network)
3. Review the code comments in `esp32_led_strip.ino`
4. Check GitHub issues for similar problems
5. Create a new issue with detailed information

## 🎓 Additional Resources

- [FastLED Documentation](http://fastled.io/)
- [ESP32 Arduino Documentation](https://docs.espressif.com/projects/arduino-esp32/)
- [WS2812B Datasheet](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- [Random Nerd Tutorials - ESP32](https://randomnerdtutorials.com/projects-esp32/)

---

**Enjoy your visual speaker mute indicator! 🎙️💡**
