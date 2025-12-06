# X-Air Radio Control v1.0

🎙️ Professional X-Air mixer control software designed specifically for radio broadcasting environments.

[![Build Status](https://github.com/finnie2006/mix-it-play-it/workflows/Build%20X-Air%20radio%20App/badge.svg)](https://github.com/finnie2006/mix-it-play-it/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/finnie2006/mix-it-play-it/releases)

<img width="1917" height="1080" alt="image" src="https://github.com/user-attachments/assets/976d5293-3ac5-4ad3-a7bc-c4c0f9a3d9b0" />



## 🎯 Overview

X-Air Radio Control is a professional desktop application that provides comprehensive control and monitoring of Behringer X-Air 16/18 digital mixers, tailored for radio broadcasting workflows. Built with modern web technologies and packaged as a cross-platform Electron application.

## ✨ Features

### Core Functionality
- 🎛️ **Real-time Mixer Control**: Direct OSC control of Behringer X-Air 16/18 mixers
- 📊 **Professional VU Meters**: High-precision audio level monitoring with peak detection
- 📈 **Dynamics Metering**: Real-time compressor and gate visualization
- 🎬 **Scene Management**: Save, load, and organize mixer scenes for different shows
- 🔊 **Silence Detection**: Configurable silence alarm for broadcast safety

### Radio Broadcasting Features
- 📻 **Fader Mapping**: Custom channel mappings optimized for radio workflows
- 🔄 **Radio Automation Integration**: Seamless integration with playout systems
- 🕐 **Broadcast Clock**: Professional analog clock display for on-air timing
- 🎨 **Color Schemes**: Customizable visual themes for different broadcast scenarios
- 🔐 **Password Protection**: Secure access control for production environments

### Professional Interface
- 🖥️ **Fullscreen Mode**: Distraction-free operation with F11 toggle
- 📱 **Responsive Design**: Adapts to different screen sizes and resolutions
- 🌙 **Dark Mode**: Easy on the eyes during long broadcast shifts
- ⚡ **Performance**: Optimized for low-latency real-time control

### Advanced Features
- 🌐 **Cloud Sync**: Optional cloud synchronization for settings and scenes
- 🔌 **OSC Bridge**: Built-in OSC-to-WebSocket bridge for network flexibility
- 🎚️ **Monitor Control**: Dedicated control for studio monitor speakers
- 📝 **Channel Naming**: Custom channel labels for easy identification

## 🚀 Quick Start

### For End Users

1. **Download** the latest release for your platform from the [Releases](https://github.com/finnie2006/mix-it-play-it/releases) page:
   - Windows: `X-Air-Radio-Control-1.0.0-setup.exe`
   - Linux: `X-Air-Radio-Control-1.0.0.AppImage`

2. **Install** and launch the application

3. **Configure** your mixer connection:
   - Enter your X-Air mixer's IP address
   - Default port is 10024
   - Click "Connect"

4. **Start broadcasting!**

### For Developers

```bash
# Clone the repository
git clone https://github.com/finnie2006/mix-it-play-it.git
cd mix-it-play-it

# Install dependencies
npm install
cd bridge-server && npm install && cd ..

# Start development environment
npm run electron:dev

# Build for production
npm run electron:build
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **F11** | Toggle fullscreen mode |
| **Esc** | Exit fullscreen mode |
| **Ctrl+M** | Maximize window |
| **Ctrl+H** | Minimize window |
| **Ctrl+Q** | Quit application |

## 🖥️ System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+, Fedora 36+, Debian 11+)
- **RAM**: 4GB
- **Network**: Stable network connection to X-Air mixer
- **Display**: 1280x720 or higher

### Recommended
- **RAM**: 8GB or more
- **Network**: Gigabit Ethernet for lowest latency
- **Display**: 1920x1080 or higher

### Compatible Mixers
- Behringer X-Air 16
- Behringer X-Air 18
- Other X-Air series mixers (untested but should work)

## 📖 Documentation

### Configuration Files
- `CLOUD_SYNC_AND_CHANNEL_NAMING.md` - Cloud synchronization setup
- `WORKFLOW_SETUP.md` - Development workflow guide

### Network Setup
Ensure your computer and mixer are on the same network. The mixer's IP address can be found in the X-Air Edit software or your router's DHCP client list.

### Bridge Server
The integrated OSC bridge server runs automatically when needed. For advanced setups, see the `bridge-server/README.md` documentation.

## 🏗️ Building from Source

### Build Scripts

```bash
# Build for current platform
npm run electron:build:current

# Build for specific platforms
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux
npm run electron:build:mac    # macOS

# Create portable version (Windows)
npm run electron:portable
```

### Assets

Logo files should be placed in the `assets/` directory:
- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon (512x512)  
- `icon.png` - Linux icon (512x512)

See `assets/logo-design.txt` for design specifications.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or request features via [GitHub Issues](https://github.com/finnie2006/mix-it-play-it/issues)
- Submit pull requests with improvements
- Fork the project for your own use (attribution required per MIT License)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 - 2025 Mix It Play It

## 🆘 Support

For support, please:
1. Check the documentation in this repository
2. Search existing [GitHub Issues](https://github.com/finnie2006/mix-it-play-it/issues)
3. Create a new issue with detailed information about your problem

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- OSC communication via [osc](https://www.npmjs.com/package/osc)

---

**Made with ❤️ for radio broadcasters by Mix It Play It**
