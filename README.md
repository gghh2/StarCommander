# Star Commander

🚀 Discord voice relay system for Star Citizen fleet operations.

## Overview

Star Commander allows fleet commanders to broadcast voice to multiple Discord channels simultaneously, and chiefs to whisper back to the command channel.

## Version 4.0 (Current)

The main application is in [`electron-app/`](./electron-app/)

### Features
- 👑 **Commandant mode**: Configure bots, manage fleet, broadcast to channels
- 🎖️ **Chef mode**: Import config, whisper to commandant
- 🎤 Global keybinds (no AutoHotkey needed)
- 📡 Cross-network whisper via Discord webhooks
- 🖥️ Clean desktop UI with setup wizard

### Quick Start

```bash
cd electron-app
npm install
npm start
```

### Build Installer

```bash
cd electron-app
npm run build:win
```

See [`electron-app/README.md`](./electron-app/README.md) for full documentation.

## Legacy Version

The original Node.js + AutoHotkey version is archived in [`legacy/`](./legacy/) for reference.

## License

MIT

# Star Commander V4.0 🚀

**Star Commander** is a professional voice relay system for Discord, designed for fleet coordination in Star Citizen. It enables commanders to broadcast to multiple specialized channels simultaneously while allowing team leaders to communicate back via whisper.

**Key Features:**
- Multi-channel voice relay with role-based broadcasting
- Whisper system for bidirectional communication
- Briefing mode for fleet gatherings
- Radio effects (walkie-talkie filter, click sounds)
- Multilingual interface (8 languages)
- Customizable Star Citizen theme

Perfect for managing complex fleet operations with artillery, engineers, pilots, and specialized teams.
