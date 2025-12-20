# Star Commander

🚀 Discord voice relay system for Star Citizen fleet operations.

## Overview

Star Commander allows fleet commanders to broadcast voice to multiple Discord channels simultaneously, and chiefs to whisper back to the command channel.

## Development usage

Use [Devbox](https://www.jetify.com/devbox) to enter the development environment:

```bash
devbox shell
```

Once inside the devbox shell, you can run commands like `npm install` and `npm run dev` as usual (without installing Node.js locally).

Note: if its the first time you are using Devbox, it may take a while to set up the environment.

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
