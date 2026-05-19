# Star Commander 🚀

Discord voice relay system for Star Citizen fleet operations.

## Overview

**Star Commander** lets fleet commanders broadcast voice to multiple specialized Discord channels simultaneously, and team leaders ("Chiefs") whisper back to the command channel — across different machines, networks, and time zones.

Perfect for coordinating complex ops with artillery, engineers, pilots and specialized teams without forcing everyone into a single voice channel.

## Version 4.5

The Electron desktop application lives in [`electron-app/`](./electron-app/).

### Features

- 👑 **Commandant mode** — Configure 4 Discord bots, broadcast to channels, manage chiefs, briefing mode
- 🎖️ **Chef mode** — Import shared config, whisper to commandant via webhook
- 🎤 **Global keybinds** — Numpad-driven channel switching, even when Star Citizen has focus (uIOhook kernel-level interception)
- 📡 **Cross-network whisper** — No server needed; uses Discord webhooks
- 🎯 **Tactical HUD overlay** — Always-on-top mini-window with mic indicator, listeners count, volume meter, scalable
- 📊 **Compact bot status bar** — Real-time health dots for Emitter + receivers under the header
- 🩺 **Persistent logs** — File logger with auto-rotation, secrets-redacted, downloadable from Options → Diagnostics
- 🌐 **8 languages** — English, French, Spanish, Portuguese, Russian, Chinese, Japanese, Arabic
- 🎨 **Customizable theme** — Default Star Citizen style, import/export, radio effect intensity
- 🔒 **Hardened** — Sandboxed renderer, no token leakage in shared exports, validated imports, allowlisted external URLs

### Quick Start

```bash
cd electron-app
npm install
npm start
```

### Build Windows Installer

```bash
cd electron-app
npm run build:win
```

See [`electron-app/README.md`](./electron-app/README.md) for full documentation, bot setup, and developer notes.

## Legacy Version

The original Node.js + AutoHotkey version is archived in [`legacy/`](./legacy/) for reference.

## License

MIT
