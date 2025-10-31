/*
 * ESP32 LED Strip Controller for Mix-It-Play-It
 * 
 * This sketch creates a WiFi-enabled HTTP server that controls a red LED strip.
 * When the speaker mute is triggered in the radio mixer, the LED strip will turn on red.
 * 
 * Hardware Requirements:
 * - ESP32 board (ESP32-WROOM-32 or similar)
 * - WS2812B/NeoPixel LED strip (or any addressable LED strip)
 * - 5V power supply for LED strip (depending on length)
 * - 470Ω resistor (optional, between data pin and LED strip)
 * - 1000μF capacitor (optional, across LED strip power)
 * 
 * Wiring:
 * - LED Strip Data -> GPIO 5 (configurable)
 * - LED Strip VCC -> 5V external power supply
 * - LED Strip GND -> ESP32 GND + Power supply GND (common ground)
 * 
 * Installation:
 * 1. Install the Arduino IDE (or PlatformIO)
 * 2. Install ESP32 board support: https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/
 * 3. Install the FastLED library: Sketch -> Include Library -> Manage Libraries -> Search "FastLED"
 * 4. Update WiFi credentials below
 * 5. Upload to your ESP32
 */

#include <WiFi.h>
#include <WebServer.h>
#include <FastLED.h>

// ===== CONFIGURATION - EDIT THESE VALUES =====
const char* ssid = "YOUR_WIFI_SSID";        // Replace with your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password

#define LED_PIN     5           // GPIO pin connected to LED strip data line
#define NUM_LEDS    30          // Number of LEDs in your strip
#define LED_TYPE    WS2812B     // Type of LED strip (WS2812B, WS2811, APA102, etc.)
#define COLOR_ORDER GRB         // Color order (GRB for most WS2812B strips)
#define BRIGHTNESS  200         // Maximum brightness (0-255)
// ===========================================

CRGB leds[NUM_LEDS];
WebServer server(80);

// Current LED state
bool ledState = false;
CRGB currentColor = CRGB::Red;
uint8_t currentBrightness = BRIGHTNESS;

// Animation variables
enum AnimationMode { SOLID, PULSE, BLINK, CHASE, RAINBOW };
AnimationMode currentAnimation = SOLID;
unsigned long lastAnimationUpdate = 0;
int animationStep = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== ESP32 LED Controller Starting ===");

  // Initialize LED strip
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(BRIGHTNESS);
  
  // Start with all LEDs off
  fill_solid(leds, NUM_LEDS, CRGB::Black);
  FastLED.show();
  Serial.println("✓ LED strip initialized");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Access at: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Please check your WiFi credentials and try again.");
  }

  // Set up HTTP server endpoints
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/on", handleLedOn);
  server.on("/off", handleLedOff);
  server.on("/toggle", handleToggle);
  server.on("/color", handleSetColor);
  server.on("/brightness", handleSetBrightness);
  server.on("/animation", handleSetAnimation);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("✓ HTTP server started");
  Serial.println("\nAPI Endpoints:");
  Serial.println("  GET  /         - Web interface");
  Serial.println("  GET  /status   - Get current state (JSON)");
  Serial.println("  POST /on       - Turn LEDs on (red)");
  Serial.println("  POST /off      - Turn LEDs off");
  Serial.println("  POST /toggle   - Toggle LED state");
  Serial.println("  POST /color?r=255&g=0&b=0 - Set color (RGB 0-255)");
  Serial.println("  POST /brightness?value=200 - Set brightness (0-255)");
  Serial.println("  POST /animation?mode=solid - Set animation mode");
  Serial.println("\n=== Ready! ===\n");
}

void loop() {
  server.handleClient();
  
  // Run animations if LEDs are on
  if (ledState) {
    updateAnimation();
  }
}

// ===== HTTP HANDLERS =====

void handleRoot() {
  String html = generateWebInterface();
  server.send(200, "text/html", html);
}

void handleStatus() {
  String json = "{";
  json += "\"state\":\"" + String(ledState ? "on" : "off") + "\",";
  json += "\"brightness\":" + String(currentBrightness) + ",";
  json += "\"color\":{\"r\":" + String(currentColor.r) + ",\"g\":" + String(currentColor.g) + ",\"b\":" + String(currentColor.b) + "},";
  json += "\"animation\":\"" + getAnimationName() + "\",";
  json += "\"numLeds\":" + String(NUM_LEDS) + ",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleLedOn() {
  ledState = true;
  updateLEDs();
  Serial.println("LED ON command received");
  server.send(200, "application/json", "{\"status\":\"ok\",\"state\":\"on\"}");
}

void handleLedOff() {
  ledState = false;
  fill_solid(leds, NUM_LEDS, CRGB::Black);
  FastLED.show();
  Serial.println("LED OFF command received");
  server.send(200, "application/json", "{\"status\":\"ok\",\"state\":\"off\"}");
}

void handleToggle() {
  ledState = !ledState;
  if (ledState) {
    updateLEDs();
  } else {
    fill_solid(leds, NUM_LEDS, CRGB::Black);
    FastLED.show();
  }
  Serial.println("LED TOGGLE command received - State: " + String(ledState ? "ON" : "OFF"));
  server.send(200, "application/json", "{\"status\":\"ok\",\"state\":\"" + String(ledState ? "on" : "off") + "\"}");
}

void handleSetColor() {
  if (server.hasArg("r") && server.hasArg("g") && server.hasArg("b")) {
    int r = server.arg("r").toInt();
    int g = server.arg("g").toInt();
    int b = server.arg("b").toInt();
    
    currentColor = CRGB(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
    if (ledState) updateLEDs();
    
    Serial.printf("Color changed to RGB(%d, %d, %d)\n", r, g, b);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing parameters. Use ?r=255&g=0&b=0\"}");
  }
}

void handleSetBrightness() {
  if (server.hasArg("value")) {
    int brightness = server.arg("value").toInt();
    currentBrightness = constrain(brightness, 0, 255);
    FastLED.setBrightness(currentBrightness);
    if (ledState) updateLEDs();
    
    Serial.printf("Brightness changed to %d\n", currentBrightness);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing value parameter. Use ?value=200\"}");
  }
}

void handleSetAnimation() {
  if (server.hasArg("mode")) {
    String mode = server.arg("mode");
    mode.toLowerCase();
    
    if (mode == "solid") currentAnimation = SOLID;
    else if (mode == "pulse") currentAnimation = PULSE;
    else if (mode == "blink") currentAnimation = BLINK;
    else if (mode == "chase") currentAnimation = CHASE;
    else if (mode == "rainbow") currentAnimation = RAINBOW;
    else {
      server.send(400, "application/json", "{\"error\":\"Invalid mode. Use: solid, pulse, blink, chase, rainbow\"}");
      return;
    }
    
    animationStep = 0;
    Serial.println("Animation changed to: " + mode);
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing mode parameter\"}");
  }
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

// ===== LED FUNCTIONS =====

void updateLEDs() {
  if (currentAnimation == SOLID) {
    fill_solid(leds, NUM_LEDS, currentColor);
  }
  FastLED.show();
}

void updateAnimation() {
  unsigned long currentMillis = millis();
  
  switch (currentAnimation) {
    case SOLID:
      // No animation needed, already updated in updateLEDs()
      break;
      
    case PULSE:
      if (currentMillis - lastAnimationUpdate > 20) {
        lastAnimationUpdate = currentMillis;
        uint8_t brightness = beatsin8(20, 30, 255); // Pulse between 30-255
        FastLED.setBrightness(brightness);
        fill_solid(leds, NUM_LEDS, currentColor);
        FastLED.show();
      }
      break;
      
    case BLINK:
      if (currentMillis - lastAnimationUpdate > 500) {
        lastAnimationUpdate = currentMillis;
        animationStep = !animationStep;
        if (animationStep) {
          fill_solid(leds, NUM_LEDS, currentColor);
        } else {
          fill_solid(leds, NUM_LEDS, CRGB::Black);
        }
        FastLED.show();
      }
      break;
      
    case CHASE:
      if (currentMillis - lastAnimationUpdate > 50) {
        lastAnimationUpdate = currentMillis;
        fill_solid(leds, NUM_LEDS, CRGB::Black);
        leds[animationStep] = currentColor;
        animationStep = (animationStep + 1) % NUM_LEDS;
        FastLED.show();
      }
      break;
      
    case RAINBOW:
      if (currentMillis - lastAnimationUpdate > 20) {
        lastAnimationUpdate = currentMillis;
        fill_rainbow(leds, NUM_LEDS, animationStep, 7);
        animationStep = (animationStep + 1) % 256;
        FastLED.show();
      }
      break;
  }
}

String getAnimationName() {
  switch (currentAnimation) {
    case SOLID: return "solid";
    case PULSE: return "pulse";
    case BLINK: return "blink";
    case CHASE: return "chase";
    case RAINBOW: return "rainbow";
    default: return "unknown";
  }
}

// ===== WEB INTERFACE =====

String generateWebInterface() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP32 LED Controller</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 500px;
      width: 100%;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .status {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      text-align: center;
    }
    .status-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 10px;
    }
    .status-on { background: #4CAF50; }
    .status-off { background: #f44336; }
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 15px;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
    }
    button:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .btn-full {
      grid-column: 1 / -1;
    }
    .btn-on { background: #4CAF50; }
    .btn-on:hover { background: #45a049; }
    .btn-off { background: #f44336; }
    .btn-off:hover { background: #da190b; }
    .info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 10px;
      margin-top: 20px;
      font-size: 14px;
      color: #1565c0;
    }
    .info strong { display: block; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚥 LED Controller</h1>
    <p class="subtitle">ESP32 Speaker Mute Indicator</p>
    
    <div class="status" id="status">
      <span class="status-indicator status-off" id="indicator"></span>
      <span id="statusText">Loading...</span>
    </div>
    
    <div class="controls">
      <button class="btn-on" onclick="sendCommand('/on')">Turn ON</button>
      <button class="btn-off" onclick="sendCommand('/off')">Turn OFF</button>
      <button class="btn-full" onclick="sendCommand('/toggle')">Toggle</button>
    </div>
    
    <div class="info">
      <strong>API Endpoints:</strong>
      POST /on - Turn LEDs on (red)<br>
      POST /off - Turn LEDs off<br>
      POST /toggle - Toggle state<br>
      GET /status - Get current state
    </div>
  </div>

  <script>
    function updateStatus() {
      fetch('/status')
        .then(response => response.json())
        .then(data => {
          const indicator = document.getElementById('indicator');
          const statusText = document.getElementById('statusText');
          
          if (data.state === 'on') {
            indicator.className = 'status-indicator status-on';
            statusText.textContent = 'LEDs ON';
          } else {
            indicator.className = 'status-indicator status-off';
            statusText.textContent = 'LEDs OFF';
          }
        })
        .catch(error => {
          console.error('Error:', error);
          document.getElementById('statusText').textContent = 'Error loading status';
        });
    }
    
    function sendCommand(endpoint) {
      fetch(endpoint, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          console.log('Success:', data);
          updateStatus();
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Failed to send command');
        });
    }
    
    // Update status every 2 seconds
    updateStatus();
    setInterval(updateStatus, 2000);
  </script>
</body>
</html>
)rawliteral";
  
  return html;
}
