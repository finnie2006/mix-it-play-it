#!/bin/bash

################################################################################
# Mix-It-Play-It Embedded Linux Deployment Script
# 
# This script automates the deployment of Mix-It-Play-It on an embedded
# Linux system for production radio use.
#
# Usage: sudo bash deploy-embedded.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="radioapp"
APP_DIR="/home/$APP_USER/mix-it-play-it"
KIOSK_USER="kiosk"
NODE_VERSION="20"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run as root or with sudo"
        exit 1
    fi
}

confirm() {
    read -p "$1 [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    return 0
}

################################################################################
# Installation Functions
################################################################################

update_system() {
    print_header "Updating System"
    
    apt update
    apt upgrade -y
    apt autoremove -y
    
    print_success "System updated"
}

install_base_packages() {
    print_header "Installing Base Packages"
    
    apt install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        build-essential \
        net-tools \
        ufw \
        unattended-upgrades
    
    print_success "Base packages installed"
}

install_nodejs() {
    print_header "Installing Node.js $NODE_VERSION"
    
    # Remove old Node.js if exists
    apt remove -y nodejs npm 2>/dev/null || true
    
    # Install Node.js from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt install -y nodejs
    
    # Install PM2 globally
    npm install -g pm2
    
    # Verify installation
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    
    print_success "Node.js $NODE_VER installed"
    print_success "npm $NPM_VER installed"
    print_success "PM2 installed"
}

install_chromium() {
    print_header "Installing Chromium and X Server"
    
    apt install -y \
        chromium-browser \
        xorg \
        openbox \
        unclutter
    
    print_success "Chromium and X server installed"
}

create_app_user() {
    print_header "Creating Application User"
    
    if id "$APP_USER" &>/dev/null; then
        print_warning "User $APP_USER already exists"
    else
        useradd -m -s /bin/bash "$APP_USER"
        echo "$APP_USER:radioapp123" | chpasswd
        usermod -a -G audio,video "$APP_USER"
        print_success "User $APP_USER created"
        print_warning "Default password is 'radioapp123' - PLEASE CHANGE IT!"
    fi
}

create_kiosk_user() {
    print_header "Creating Kiosk User"
    
    if id "$KIOSK_USER" &>/dev/null; then
        print_warning "User $KIOSK_USER already exists"
    else
        useradd -m -s /bin/bash "$KIOSK_USER"
        echo "$KIOSK_USER:kiosk123" | chpasswd
        usermod -a -G audio,video "$KIOSK_USER"
        print_success "User $KIOSK_USER created"
        print_warning "Default password is 'kiosk123' - PLEASE CHANGE IT!"
    fi
}

clone_repository() {
    print_header "Deploying Application"
    
    if [ -d "$APP_DIR" ]; then
        print_warning "Application directory already exists"
        if confirm "Remove and re-clone?"; then
            rm -rf "$APP_DIR"
        else
            print_info "Skipping clone"
            return
        fi
    fi
    
    su - "$APP_USER" -c "git clone https://github.com/finnie2006/mix-it-play-it.git"
    
    print_success "Application cloned"
}

install_app_dependencies() {
    print_header "Installing Application Dependencies"
    
    print_info "Installing main app dependencies..."
    su - "$APP_USER" -c "cd $APP_DIR && npm install"
    
    print_info "Installing bridge server dependencies..."
    su - "$APP_USER" -c "cd $APP_DIR/bridge-server && npm install"
    
    print_success "Dependencies installed"
}

setup_pm2() {
    print_header "Configuring PM2 Process Manager"
    
    # Create PM2 startup script
    su - "$APP_USER" -c "cd $APP_DIR && pm2 start bridge-server/server.js --name xair-bridge"
    su - "$APP_USER" -c "cd $APP_DIR && pm2 start npm --name mix-it-play-it -- run dev"
    su - "$APP_USER" -c "pm2 save"
    
    # Generate startup script
    PM2_STARTUP=$(su - "$APP_USER" -c "pm2 startup systemd" | grep "sudo env")
    eval "$PM2_STARTUP"
    
    print_success "PM2 configured"
}

setup_kiosk_mode() {
    print_header "Configuring Kiosk Mode"
    
    # Create autologin configuration
    mkdir -p /etc/systemd/system/getty@tty1.service.d/
    cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $KIOSK_USER --noclear %I \$TERM
Type=simple
EOF
    
    # Create kiosk start script
    cat > /home/$KIOSK_USER/start-kiosk.sh <<'EOF'
#!/bin/bash

# Wait for services to start
sleep 10

# Start X server
startx -- -nocursor &

sleep 5

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
EOF
    
    chmod +x /home/$KIOSK_USER/start-kiosk.sh
    chown $KIOSK_USER:$KIOSK_USER /home/$KIOSK_USER/start-kiosk.sh
    
    # Create .bash_profile for auto-start
    cat > /home/$KIOSK_USER/.bash_profile <<'EOF'
#!/bin/bash

if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    /home/kiosk/start-kiosk.sh
fi
EOF
    
    chmod +x /home/$KIOSK_USER/.bash_profile
    chown $KIOSK_USER:$KIOSK_USER /home/$KIOSK_USER/.bash_profile
    
    # Create Openbox config
    mkdir -p /home/$KIOSK_USER/.config/openbox
    cat > /home/$KIOSK_USER/.config/openbox/autostart <<'EOF'
# Disable screen blanking
xset s off &
xset -dpms &
xset s noblank &
EOF
    
    chown -R $KIOSK_USER:$KIOSK_USER /home/$KIOSK_USER/.config
    
    print_success "Kiosk mode configured"
}

setup_firewall() {
    print_header "Configuring Firewall"
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow 22/tcp
    
    # Allow application ports (optional - only if accessed remotely)
    if confirm "Allow remote access to application (ports 5173, 8080)?"; then
        ufw allow 5173/tcp
        ufw allow 8080/tcp
    fi
    
    ufw --force enable
    
    print_success "Firewall configured"
}

setup_auto_updates() {
    print_header "Configuring Automatic Updates"
    
    dpkg-reconfigure -plow unattended-upgrades
    
    print_success "Automatic updates enabled"
}

setup_backup() {
    print_header "Setting Up Backup System"
    
    # Create backup script
    cat > /usr/local/bin/backup-radio-control.sh <<'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/radio-control"
APP_DIR="/home/radioapp/mix-it-play-it"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.tar.gz"

tar -czf "$BACKUP_FILE" \
    "$APP_DIR/bridge-settings.json" \
    "$APP_DIR/dist" \
    /home/radioapp/.pm2 2>/dev/null

find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
EOF
    
    chmod +x /usr/local/bin/backup-radio-control.sh
    
    # Create cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-radio-control.sh >> /var/log/radio-backup.log 2>&1") | crontab -
    
    print_success "Backup system configured (daily at 2 AM)"
}

disable_unnecessary_services() {
    print_header "Optimizing System Services"
    
    # Disable common unnecessary services
    systemctl disable bluetooth.service 2>/dev/null || true
    systemctl disable cups.service 2>/dev/null || true
    systemctl disable avahi-daemon.service 2>/dev/null || true
    
    print_success "Unnecessary services disabled"
}

create_info_file() {
    print_header "Creating System Information File"
    
    cat > /home/$APP_USER/SYSTEM_INFO.txt <<EOF
════════════════════════════════════════════════════════════════
  Mix-It-Play-It Embedded Linux System
════════════════════════════════════════════════════════════════

Installation Date: $(date)
Hostname: $(hostname)
IP Address: $(hostname -I | awk '{print $1}')

USERS:
  Application User: $APP_USER (password: radioapp123 - CHANGE THIS!)
  Kiosk User: $KIOSK_USER (password: kiosk123 - CHANGE THIS!)

SERVICES:
  Bridge Server: http://localhost:8080
  Web Application: http://localhost:5173
  
MANAGEMENT:
  Check PM2 status: pm2 status
  View logs: pm2 logs
  Restart services: pm2 restart all
  
  Systemd logs: sudo journalctl -f
  
KIOSK MODE:
  The system will auto-login to kiosk user on boot
  Application will display in fullscreen automatically
  
BACKUP:
  Location: /var/backups/radio-control/
  Schedule: Daily at 2:00 AM
  Retention: 30 days
  
FIREWALL:
  Status: sudo ufw status
  Logs: sudo tail -f /var/log/ufw.log

MAINTENANCE:
  Update system: sudo apt update && sudo apt upgrade
  Restart system: sudo reboot
  View system resources: htop

════════════════════════════════════════════════════════════════
EOF
    
    chown $APP_USER:$APP_USER /home/$APP_USER/SYSTEM_INFO.txt
    
    print_success "System info file created at $APP_DIR/SYSTEM_INFO.txt"
}

################################################################################
# Main Installation
################################################################################

main() {
    clear
    
    cat << "EOF"
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   Mix-It-Play-It Embedded Linux Deployment               ║
    ║   Automated Installation for Production Radio Systems    ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
EOF
    
    echo
    print_warning "This script will configure this system for production use"
    print_warning "It will install packages, create users, and modify system settings"
    echo
    
    if ! confirm "Continue with installation?"; then
        print_info "Installation cancelled"
        exit 0
    fi
    
    echo
    check_root
    
    # Installation steps
    update_system
    install_base_packages
    install_nodejs
    create_app_user
    clone_repository
    install_app_dependencies
    setup_pm2
    
    if confirm "Install kiosk mode (fullscreen display)?"; then
        install_chromium
        create_kiosk_user
        setup_kiosk_mode
    fi
    
    setup_firewall
    setup_auto_updates
    setup_backup
    disable_unnecessary_services
    create_info_file
    
    print_header "Installation Complete!"
    
    echo
    print_success "Mix-It-Play-It has been deployed successfully!"
    echo
    print_info "Next steps:"
    echo "  1. Change default passwords:"
    echo "     sudo passwd $APP_USER"
    echo "     sudo passwd $KIOSK_USER"
    echo
    echo "  2. Configure your mixer and settings:"
    echo "     sudo nano $APP_DIR/bridge-settings.json"
    echo
    echo "  3. Restart services or reboot:"
    echo "     pm2 restart all"
    echo "     sudo reboot"
    echo
    echo "  4. Access the application:"
    echo "     Local: http://localhost:5173"
    echo "     Remote: http://$(hostname -I | awk '{print $1}'):5173"
    echo
    print_info "System information saved to: $APP_DIR/SYSTEM_INFO.txt"
    echo
    
    if confirm "Reboot now to complete setup?"; then
        print_info "Rebooting in 5 seconds..."
        sleep 5
        reboot
    fi
}

# Run main installation
main
