# 🚀 Embedded Linux Quick Start Guide

The absolute fastest way to get Mix-It-Play-It running on dedicated hardware.

---

## Option 1: Automated Installation (Recommended)

### Prerequisites
- Fresh Ubuntu Server 22.04 LTS installation
- Internet connection
- Root/sudo access

### Installation
```bash
# 1. Download the deployment script
wget https://raw.githubusercontent.com/finnie2006/mix-it-play-it/main/deploy-embedded.sh

# 2. Make it executable
chmod +x deploy-embedded.sh

# 3. Run the automated installer
sudo bash deploy-embedded.sh

# 4. Follow the prompts - the script will:
#    ✓ Install all dependencies
#    ✓ Set up users and permissions
#    ✓ Deploy the application
#    ✓ Configure auto-start
#    ✓ Set up kiosk mode (optional)
#    ✓ Configure firewall
#    ✓ Enable automatic backups

# 5. Reboot when prompted
```

**That's it!** Your system will boot directly into the application.

---

## Option 2: Manual Installation (15 minutes)

### Step 1: System Setup (5 minutes)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Install PM2
sudo npm install -g pm2
```

### Step 2: Deploy Application (5 minutes)
```bash
# Create application user
sudo useradd -m -s /bin/bash radioapp
sudo su - radioapp

# Clone and install
git clone https://github.com/finnie2006/mix-it-play-it.git
cd mix-it-play-it
npm install

# Install bridge dependencies
cd bridge-server
npm install
cd ..
```

### Step 3: Configure Auto-Start (5 minutes)
```bash
# Start with PM2
pm2 start bridge-server/server.js --name xair-bridge
pm2 start npm --name mix-it-play-it -- run dev
pm2 save

# Enable auto-start on boot
pm2 startup systemd
# Copy and run the command PM2 shows

# Exit back to your user
exit
```

### Step 4: Access Application
```bash
# Find your IP address
ip addr show

# Access from browser:
# http://YOUR_IP:5173
```

---

## Option 3: Docker Deployment (Advanced)

Coming soon! Docker support is planned for future releases.

---

## Hardware Recommendations by Use Case

### Home/Test Studio ($100-200)
- Raspberry Pi 4 (4GB) + case + power supply
- 32GB microSD card
- HDMI cable for display

### Small Station ($200-300)
- Intel NUC or Mini PC
- 4GB RAM, 64GB SSD
- Wired Ethernet connection

### Professional Station ($400-600)
- Industrial Mini PC or NUC i5
- 8GB RAM, 128GB SSD
- Redundant power supply
- UPS backup

### Critical/24-7 Operation ($800+)
- Server-grade hardware
- ECC RAM, RAID storage
- Hot-swappable components
- Dual network interfaces

---

## Network Configuration

### Static IP (Recommended for Production)

**Option 1: Using Netplan (Ubuntu Server)**
```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:  # or your interface name
      dhcp4: no
      addresses:
        - 192.168.1.50/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
sudo netplan apply
```

**Option 2: Using NetworkManager**
```bash
nmcli con mod "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8 8.8.4.4"

nmcli con up "Wired connection 1"
```

---

## Quick Troubleshooting

### Application Won't Start
```bash
# Check if ports are in use
sudo netstat -tulpn | grep :5173
sudo netstat -tulpn | grep :8080

# View PM2 status and logs
pm2 status
pm2 logs

# Restart everything
pm2 restart all
```

### Can't Access Web Interface
```bash
# Check if service is running
pm2 status

# Check firewall
sudo ufw status

# Verify network
ip addr show
ping 8.8.8.8
```

### Display/Kiosk Issues
```bash
# Restart getty service
sudo systemctl restart getty@tty1

# Check X server logs
cat ~/.local/share/xorg/Xorg.0.log
```

---

## Essential Commands

```bash
# View application status
pm2 status

# View live logs
pm2 logs

# Restart services
pm2 restart xair-bridge
pm2 restart mix-it-play-it

# System monitoring
htop

# Check disk space
df -h

# View system logs
sudo journalctl -f

# Reboot system
sudo reboot
```

---

## Default Credentials (CHANGE THESE!)

**Application User:**
- Username: `radioapp`
- Password: `radioapp123`

**Kiosk User:**
- Username: `kiosk`
- Password: `kiosk123`

**Change passwords immediately:**
```bash
sudo passwd radioapp
sudo passwd kiosk
```

---

## Accessing from Other Computers

### Find Your System's IP
```bash
hostname -I
# Example output: 192.168.1.50
```

### Access Web Interface
```
http://192.168.1.50:5173
```

### SSH Access
```bash
ssh radioapp@192.168.1.50
```

---

## Backup & Recovery

### Manual Backup
```bash
# Backup settings
cp ~/mix-it-play-it/bridge-settings.json ~/bridge-settings.backup.json

# Backup entire directory
tar -czf ~/mix-it-play-it-backup.tar.gz ~/mix-it-play-it
```

### Restore from Backup
```bash
# Restore settings
cp ~/bridge-settings.backup.json ~/mix-it-play-it/bridge-settings.json

# Restart services
pm2 restart all
```

### Automatic Backups
Backups run daily at 2 AM if you used the automated installer.

**View backups:**
```bash
ls -lh /var/backups/radio-control/
```

---

## Performance Tips

### Reduce Boot Time
```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon
```

### Optimize for SSD
```bash
# Enable TRIM
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer
```

### Monitor Resources
```bash
# Real-time system monitor
htop

# Disk usage
df -h

# Memory usage
free -h

# PM2 monitoring
pm2 monit
```

---

## Security Best Practices

```bash
# Enable firewall
sudo ufw enable

# Allow only necessary ports
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 5173/tcp  # Application (if remote access needed)

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Use SSH keys instead of passwords
ssh-copy-id radioapp@192.168.1.50
```

---

## Maintenance Schedule

### Weekly
- Check application logs
- Verify backups exist
- Check disk space

### Monthly
- Apply system updates
- Test backup restoration
- Review security logs

### Quarterly
- Full system test
- Update documentation
- Review performance

---

## Getting Help

### Check Logs
```bash
# Application logs
pm2 logs

# System logs
sudo journalctl -u xair-bridge -f

# Kernel logs
dmesg | tail

# All logs
sudo tail -f /var/log/syslog
```

### System Information
```bash
# OS version
lsb_release -a

# Kernel version
uname -r

# Hardware info
lscpu
free -h
df -h
```

### Test Network Connectivity
```bash
# Test internet
ping -c 4 google.com

# Test mixer connection
ping -c 4 192.168.1.67  # Your mixer IP

# Check open ports
sudo netstat -tulpn
```

---

## Next Steps After Installation

1. ✅ Change default passwords
2. ✅ Configure static IP address
3. ✅ Set up your mixer connection in `bridge-settings.json`
4. ✅ Configure speaker mute and fader mappings
5. ✅ Add LED control devices (if using)
6. ✅ Test all functionality
7. ✅ Document your setup
8. ✅ Train your team
9. ✅ Test backup/restore procedures
10. ✅ Monitor for a few days before going live

---

## Quick Reference

**System IP:** `_________________`

**Mixer IP:** `_________________`

**Application URL:** `http://___________:5173`

**SSH Access:** `ssh radioapp@___________`

**Installation Date:** `_________________`

---

**For detailed information, see `EMBEDDED_LINUX_DEPLOYMENT.md`**

**For LED setup, see `LED_STRIP_SETUP_GUIDE.md`**
