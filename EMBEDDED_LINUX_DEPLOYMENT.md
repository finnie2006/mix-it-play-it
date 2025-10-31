# 🖥️ Embedded Linux Deployment Guide
## Running Mix-It-Play-It on Dedicated Hardware

This guide shows you how to deploy Mix-It-Play-It on an embedded PC or small form factor computer running minimal Linux, perfect for production radio environments.

---

## 📋 Table of Contents

1. [Hardware Recommendations](#hardware-recommendations)
2. [Linux Distribution Options](#linux-distribution-options)
3. [Installation Steps](#installation-steps)
4. [Auto-Start Configuration](#auto-start-configuration)
5. [Kiosk Mode Setup](#kiosk-mode-setup)
6. [System Hardening](#system-hardening)
7. [Remote Management](#remote-management)
8. [Backup & Recovery](#backup--recovery)

---

## Hardware Recommendations

### Minimum Requirements
- **CPU**: Dual-core x86_64 (Intel/AMD)
- **RAM**: 2GB
- **Storage**: 16GB SSD/eMMC
- **Network**: Ethernet (recommended) or WiFi
- **Display**: HDMI output for local display

### Recommended Hardware Options

#### Budget Option ($100-150)
- **Raspberry Pi 4 (4GB)**
  - ARM-based, well-supported
  - Low power consumption
  - Great community support
  - Note: May need ARM-compatible builds

#### Mid-Range Option ($200-300)
- **Intel NUC or Similar Mini PC**
  - Intel Celeron/Pentium
  - 4GB RAM, 64GB storage
  - Fanless options available
  - Standard x86 compatibility

#### Professional Option ($400-600)
- **Industrial Mini PC**
  - Intel i3/i5 processor
  - 8GB RAM, 128GB SSD
  - Rugged construction
  - Better thermals and reliability
  - Examples: ASUS PN51, HP EliteDesk 800 Mini

#### High-End Option ($800+)
- **Purpose-Built Appliance PC**
  - Server-grade components
  - Redundant storage
  - ECC RAM
  - Hot-swappable components

### Storage Recommendations
- ✅ **SSD preferred** over HDD (faster, more reliable)
- ✅ **32GB minimum** for OS and application
- ✅ **64GB+ recommended** for logs and backups
- ✅ Consider **dual storage** for OS redundancy

---

## Linux Distribution Options

### Option 1: Ubuntu Server 22.04 LTS (Recommended)
**Best for**: General use, good hardware support, long-term stability

**Pros:**
- ✅ 5 years of support
- ✅ Excellent hardware compatibility
- ✅ Large community and documentation
- ✅ Easy Node.js installation

**Cons:**
- ❌ Larger footprint than minimal distros
- ❌ More services by default

### Option 2: Debian 12 (Stable)
**Best for**: Maximum stability, minimal bloat

**Pros:**
- ✅ Very stable and reliable
- ✅ Minimal base install
- ✅ Long support cycle
- ✅ Lower resource usage

**Cons:**
- ❌ Slightly older packages
- ❌ Manual configuration needed

### Option 3: Alpine Linux
**Best for**: Absolute minimum footprint, embedded systems

**Pros:**
- ✅ Tiny (~130MB installed)
- ✅ Very fast boot times
- ✅ Minimal attack surface
- ✅ Low RAM usage

**Cons:**
- ❌ Uses musl instead of glibc (compatibility issues)
- ❌ Smaller package repository
- ❌ Less documentation

### Option 4: Raspberry Pi OS Lite (for Pi hardware)
**Best for**: Raspberry Pi specifically

**Pros:**
- ✅ Optimized for Pi hardware
- ✅ Easy setup
- ✅ Good community support

**Cons:**
- ❌ ARM architecture (different builds needed)
- ❌ Pi-specific only

### Recommendation: **Ubuntu Server 22.04 LTS**
Best balance of compatibility, support, and ease of use.

---

## Installation Steps

### Step 1: Install Base Operating System

#### For Ubuntu Server 22.04 LTS:

1. **Download Ubuntu Server**
   - Get from: https://ubuntu.com/download/server
   - Choose 64-bit version

2. **Create Bootable USB**
   - Use Rufus (Windows), Etcher (cross-platform), or dd (Linux)
   ```bash
   # Example with dd (Linux)
   sudo dd if=ubuntu-22.04-server-amd64.iso of=/dev/sdX bs=4M status=progress
   ```

3. **Install Ubuntu**
   - Boot from USB
   - Choose "Install Ubuntu Server"
   - Select language and keyboard
   - Configure network (use DHCP or static IP)
   - Set hostname: `radio-control-01` (or your preference)
   - Create user: `radio` (or your preference)
   - Choose "Install OpenSSH server" (for remote access)
   - Don't install any additional packages yet
   - Complete installation and reboot

4. **Initial Setup**
   ```bash
   # Update system
   sudo apt update
   sudo apt upgrade -y
   
   # Install essential tools
   sudo apt install -y curl wget git vim htop
   ```

### Step 2: Install Node.js and Dependencies

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install build tools (needed for some npm packages)
sudo apt install -y build-essential

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 3: Install Chromium (for Kiosk Mode)

```bash
# Install Chromium browser
sudo apt install -y chromium-browser

# Install X server and minimal window manager
sudo apt install -y xorg openbox

# Install unclutter to hide mouse cursor
sudo apt install -y unclutter
```

### Step 4: Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash radioapp
sudo passwd radioapp  # Set a secure password

# Add to necessary groups
sudo usermod -a -G audio,video radioapp

# Switch to the new user
sudo su - radioapp
```

### Step 5: Deploy Your Application

```bash
# Clone your repository (or transfer files)
cd /home/radioapp
git clone https://github.com/finnie2006/mix-it-play-it.git
cd mix-it-play-it

# Install main application dependencies
npm install

# Build the production version
npm run build

# Navigate to bridge server
cd bridge-server
npm install
cd ..
```

### Step 6: Configure Application Settings

```bash
# Create settings file
nano bridge-settings.json
```

Paste your production settings:
```json
{
  "mixer": {
    "ip": "192.168.1.67",
    "port": 10024
  },
  "radioSoftware": {
    "type": "mairlist",
    "host": "192.168.1.100",
    "port": 9300,
    "enabled": true
  },
  "faderMappings": [
    // Your fader mappings
  ],
  "speakerMute": {
    "enabled": true,
    "triggerChannels": [1, 2, 3, 4],
    "muteType": "bus",
    "busNumber": 1,
    "threshold": 10,
    "description": "Mute main speakers when mics are open"
  },
  "ledControl": {
    "devices": [
      {
        "id": "led-001",
        "name": "Studio Red Light",
        "ipAddress": "192.168.1.100",
        "port": 80,
        "enabled": true,
        "type": "esp32"
      }
    ],
    "speakerMuteIndicator": {
      "enabled": true,
      "deviceIds": ["led-001"],
      "onColor": { "r": 255, "g": 0, "b": 0 },
      "offDelay": 0,
      "animation": "solid"
    }
  }
}
```

---

## Auto-Start Configuration

### Method 1: Using PM2 (Recommended)

PM2 is a production-ready process manager with auto-restart, logging, and monitoring.

```bash
# As radioapp user
cd /home/radioapp/mix-it-play-it

# Start bridge server with PM2
cd bridge-server
pm2 start server.js --name "xair-bridge"
cd ..

# Start main application with PM2
pm2 start npm --name "mix-it-play-it" -- start

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Copy and run the command that PM2 shows (as sudo)
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u radioapp --hp /home/radioapp
```

### Method 2: Using systemd Services

Create systemd service files for more control:

#### Bridge Server Service

```bash
sudo nano /etc/systemd/system/xair-bridge.service
```

```ini
[Unit]
Description=X-Air OSC Bridge Server
After=network.target

[Service]
Type=simple
User=radioapp
WorkingDirectory=/home/radioapp/mix-it-play-it/bridge-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Main Application Service (Vite Dev Server)

```bash
sudo nano /etc/systemd/system/mix-it-play-it.service
```

```ini
[Unit]
Description=Mix-It-Play-It Radio Control Application
After=network.target xair-bridge.service

[Service]
Type=simple
User=radioapp
WorkingDirectory=/home/radioapp/mix-it-play-it
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services to start at boot
sudo systemctl enable xair-bridge.service
sudo systemctl enable mix-it-play-it.service

# Start services now
sudo systemctl start xair-bridge.service
sudo systemctl start mix-it-play-it.service

# Check status
sudo systemctl status xair-bridge.service
sudo systemctl status mix-it-play-it.service

# View logs
sudo journalctl -u xair-bridge.service -f
sudo journalctl -u mix-it-play-it.service -f
```

---

## Kiosk Mode Setup

Create a full-screen kiosk that automatically displays your application.

### Step 1: Create Kiosk User

```bash
# Create kiosk user
sudo useradd -m -s /bin/bash kiosk
sudo passwd kiosk

# Add to necessary groups
sudo usermod -a -G audio,video kiosk
```

### Step 2: Configure Automatic Login

```bash
# Edit getty service for automatic login
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d/
sudo nano /etc/systemd/system/getty@tty1.service.d/autologin.conf
```

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin kiosk --noclear %I $TERM
Type=simple
```

### Step 3: Create Kiosk Start Script

```bash
sudo nano /home/kiosk/start-kiosk.sh
```

```bash
#!/bin/bash

# Wait for network
sleep 5

# Start X server
startx -- -nocursor &

sleep 3

# Set display
export DISPLAY=:0

# Hide cursor
unclutter -idle 0.1 &

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Start Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --app=http://localhost:5173 \
  --start-fullscreen \
  --disable-pinch \
  --overscroll-history-navigation=0
```

```bash
# Make executable
sudo chmod +x /home/kiosk/start-kiosk.sh

# Set ownership
sudo chown kiosk:kiosk /home/kiosk/start-kiosk.sh
```

### Step 4: Auto-Start Kiosk on Login

```bash
# Create .bash_profile for kiosk user
sudo nano /home/kiosk/.bash_profile
```

```bash
#!/bin/bash

# Start kiosk mode automatically
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    /home/kiosk/start-kiosk.sh
fi
```

```bash
# Make executable
sudo chmod +x /home/kiosk/.bash_profile
sudo chown kiosk:kiosk /home/kiosk/.bash_profile
```

### Step 5: Configure Openbox (Window Manager)

```bash
# Create Openbox config directory
sudo mkdir -p /home/kiosk/.config/openbox
sudo nano /home/kiosk/.config/openbox/autostart
```

```bash
# Disable screen blanking
xset s off &
xset -dpms &
xset s noblank &
```

```bash
# Set ownership
sudo chown -R kiosk:kiosk /home/kiosk/.config
```

---

## System Hardening

### Security Best Practices

#### 1. Firewall Configuration

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH (for remote access)
sudo ufw allow 22/tcp

# Allow application ports (if accessed remotely)
sudo ufw allow 5173/tcp  # Vite dev server
sudo ufw allow 8080/tcp  # Bridge WebSocket

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### 2. SSH Hardening

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Recommended changes:
```
# Disable root login
PermitRootLogin no

# Use key-based authentication only
PasswordAuthentication no
PubkeyAuthentication yes

# Limit users who can SSH
AllowUsers radio radioapp

# Change default port (optional)
Port 2222
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

#### 3. Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### 4. Disable Unnecessary Services

```bash
# List all services
systemctl list-unit-files --type=service

# Disable unwanted services (examples)
sudo systemctl disable bluetooth.service
sudo systemctl disable cups.service
sudo systemctl disable avahi-daemon.service
```

---

## Remote Management

### SSH Access

```bash
# From your workstation, copy SSH key
ssh-copy-id -i ~/.ssh/id_rsa.pub radio@192.168.1.50

# Connect
ssh radio@192.168.1.50
```

### Web-Based Management

#### Install Webmin (Optional)

```bash
# Add Webmin repository
wget -qO- http://www.webmin.com/jcameron-key.asc | sudo gpg --dearmor -o /usr/share/keyrings/webmin.gpg
echo "deb [signed-by=/usr/share/keyrings/webmin.gpg] http://download.webmin.com/download/repository sarge contrib" | sudo tee /etc/apt/sources.list.d/webmin.list

# Install Webmin
sudo apt update
sudo apt install -y webmin

# Access at: https://192.168.1.50:10000
```

### Monitoring with htop and PM2

```bash
# Monitor system resources
htop

# Monitor PM2 processes
pm2 monit

# View PM2 logs
pm2 logs

# PM2 status
pm2 status
```

---

## Backup & Recovery

### Automated Backup Script

```bash
sudo nano /usr/local/bin/backup-radio-control.sh
```

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/radio-control"
APP_DIR="/home/radioapp/mix-it-play-it"
BRIDGE_SETTINGS="/home/radioapp/mix-it-play-it/bridge-settings.json"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.tar.gz"

# Create backup
tar -czf "$BACKUP_FILE" \
    "$BRIDGE_SETTINGS" \
    "$APP_DIR/dist" \
    /home/radioapp/.pm2 \
    /etc/systemd/system/xair-bridge.service \
    /etc/systemd/system/mix-it-play-it.service

# Remove old backups
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-radio-control.sh

# Create cron job for daily backups
sudo crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/backup-radio-control.sh >> /var/log/radio-backup.log 2>&1
```

### System Image Backup

```bash
# Create full disk image (from another Linux system)
sudo dd if=/dev/sdX of=/backup/radio-control-system.img bs=4M status=progress

# Compress the image
gzip /backup/radio-control-system.img

# Restore if needed
gunzip /backup/radio-control-system.img.gz
sudo dd if=/backup/radio-control-system.img of=/dev/sdX bs=4M status=progress
```

---

## Performance Optimization

### Disable Swap (Optional for SSD longevity)

```bash
# Disable swap
sudo swapoff -a

# Remove swap entry from fstab
sudo nano /etc/fstab
# Comment out swap line
```

### Optimize for SSD

```bash
# Enable TRIM
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer
```

### Network Optimization

```bash
# Edit sysctl for better network performance
sudo nano /etc/sysctl.conf
```

Add:
```
# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Enable TCP fast open
net.ipv4.tcp_fastopen = 3
```

Apply:
```bash
sudo sysctl -p
```

---

## Troubleshooting

### View Application Logs

```bash
# PM2 logs
pm2 logs xair-bridge
pm2 logs mix-it-play-it

# Systemd logs
sudo journalctl -u xair-bridge.service -f
sudo journalctl -u mix-it-play-it.service -f

# System logs
sudo tail -f /var/log/syslog
```

### Common Issues

#### Application Won't Start
```bash
# Check if ports are already in use
sudo netstat -tulpn | grep :5173
sudo netstat -tulpn | grep :8080

# Kill processes if needed
sudo kill -9 <PID>

# Restart services
sudo systemctl restart xair-bridge
sudo systemctl restart mix-it-play-it
```

#### Network Issues
```bash
# Check network status
ip addr show
ping google.com
ping 192.168.1.67  # Your mixer IP

# Restart network
sudo systemctl restart NetworkManager
```

#### Display Issues in Kiosk Mode
```bash
# Check X server logs
cat /home/kiosk/.local/share/xorg/Xorg.0.log

# Restart kiosk
sudo systemctl restart getty@tty1
```

---

## Maintenance Checklist

### Daily
- [ ] Check application is running
- [ ] Verify mixer connectivity
- [ ] Check LED indicators working

### Weekly
- [ ] Review system logs
- [ ] Check disk space
- [ ] Verify backups completed

### Monthly
- [ ] Apply system updates
- [ ] Test backup restoration
- [ ] Review security logs
- [ ] Clean up old logs

### Quarterly
- [ ] Full system test
- [ ] Review and update configurations
- [ ] Test failover procedures
- [ ] Update documentation

---

## Quick Reference Commands

```bash
# Application Management
pm2 restart xair-bridge
pm2 restart mix-it-play-it
pm2 logs --lines 100

# System Status
sudo systemctl status xair-bridge
htop
df -h

# Network
ip addr show
sudo netstat -tulpn

# Logs
sudo journalctl -u xair-bridge -f
tail -f /var/log/syslog

# Reboot/Shutdown
sudo reboot
sudo shutdown -h now
```

---

## Production Deployment Checklist

- [ ] Hardware installed and tested
- [ ] Ubuntu Server installed and updated
- [ ] Static IP configured
- [ ] SSH access configured with key authentication
- [ ] Node.js and dependencies installed
- [ ] Application deployed and tested
- [ ] PM2 or systemd services configured
- [ ] Kiosk mode configured (if needed)
- [ ] Firewall configured
- [ ] Automatic updates enabled
- [ ] Backup system configured and tested
- [ ] Monitoring in place
- [ ] Documentation updated
- [ ] Team trained on system
- [ ] Emergency procedures documented
- [ ] Spare hardware available

---

**Your embedded Linux radio control system is now ready for production! 🚀**

For additional support, refer to the main documentation or open an issue on GitHub.
