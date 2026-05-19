# Star Commander V4.5

Desktop application for Discord voice relay in Star Citizen fleet operations.

## 🎯 Features

- **Dual Mode Architecture**
  - 👑 **Commandant** : Configure bots, manage fleet, broadcast to channels
  - 🎖️ **Chef** : Import config, whisper to commandant

- **Voice Relay**
  - 1 Emitter bot listens to Commandants channel
  - 3 Receiver bots broadcast to target channels
  - Switch channels via global keybinds (uIOhook — works even when SC has focus) or UI
  - Briefing mode: move squad to HQ

- **Whisper System**
  - Chiefs can whisper directly to Commandants channel
  - Uses Discord webhooks (no server needed)
  - Works across different PCs / networks

- **Tactical HUD Overlay**
  - Always-on-top mini-window with channel, mic indicator, listeners count, volume meter
  - Scale slider (50–150 %) in Options for per-monitor sizing
  - Click to expand for extended info

- **Compact Bot Status Bar**
  - Dot per bot (Emitter + receivers) under the header — green = connected, red = error, gray = idle
  - Real-time, no tab switching needed

- **Diagnostics**
  - Persistent file logger (`%APPDATA%/star-commander/logs/star-commander.log`)
  - Auto-rotation at 25 MB; previous session kept as `.log.1`
  - Sensitive tokens / SRTP keys / webhook URLs auto-redacted before write
  - **Download logs** button in Options → Diagnostics for sharing with support

- **Customizable**
  - 8 UI languages (EN / FR / ES / PT / RU / ZH / JA / AR)
  - Custom Star Citizen theme + import/export
  - Radio walkie-talkie effect (intensity slider), click sounds
  - Configurable keybinds

- **Security**
  - Bot tokens are stored locally and never included in shared exports
  - BrowserWindows use `sandbox: true`, `contextIsolation: true`, navigation guards
  - `open-external` URLs allowlisted to Discord / GitHub / Buy Me a Coffee
  - DevTools gated to dev mode only

## 🚀 Quick Start

### Commandant (First Setup)

1. Create 4 Discord bots on [Discord Developer Portal](https://discord.com/developers/applications)
2. Run Star Commander, choose "Commandant"
3. Follow the wizard to enter tokens and channel IDs
4. Export config for your chiefs (tokens are stripped from the export automatically)

### Chef (Join Fleet)

1. Get `starcommander-config.json` from your Commandant
2. Run Star Commander, choose "Chef"
3. Import the config file
4. Select your profile
5. Use Whisper button to talk to Commandant

## 🛠️ Development

### Prerequisites

- Node.js 18+
- FFmpeg in PATH (used for the radio voice filter)

### Setup

```bash
cd electron-app
npm install
```

### Run in dev mode

```bash
npm start
```

### Run with verbose voice debug

Voice handshake debug emits the SRTP `secret_key` and voice session token,
so it is **off by default** — even the file logger redacts known secrets,
but it's cleaner not to write them at all. Enable when debugging Discord
voice gateway issues:

```bash
STAR_COMMANDER_VOICE_DEBUG=1 npm start
```

### Build installer

```bash
npm run build:win
```

The installer will be created in `dist/`.

## 📁 Project Structure

```
electron-app/
├── src/
│   ├── main/                # Electron main process
│   │   ├── main.js          # Entry point, IPC, tray, keybinds
│   │   ├── preload.js       # Secure IPC bridge (renderer)
│   │   ├── preload-overlay.js
│   │   └── logger.js        # File logger with rotation + redaction
│   ├── renderer/            # UI (vanilla HTML/CSS/JS)
│   │   ├── index.html       # Main window
│   │   ├── overlay.html     # HUD overlay window
│   │   ├── styles.css
│   │   ├── app.js
│   │   ├── i18n.js
│   │   └── locales/         # 8 language JSON files
│   └── core/                # Discord relay logic
│       ├── relayManager.js
│       ├── emitter.js       # createEmitter() factory
│       ├── receiver.js
│       └── tempConnection.js
├── assets/                  # Icons + sounds
├── dist/                    # Build output
├── package.json
└── README.md
```

## ⚙️ Configuration

Config stored in: `%APPDATA%/star-commander/config.json`
Logs stored in: `%APPDATA%/star-commander/logs/star-commander.log`

### Keybinds (Default)

| Key | Action |
|-----|--------|
| Num0 | All channels |
| Num1 | Mute |
| Num2 | Channel 1 |
| Num3 | Channel 2 |
| Num4 | Channel 3 |
| Num5 | Briefing |
| Num9 | Whisper (Chiefs) |

## 🔧 Discord Bot Setup

For each bot (1 Emitter + 3 Receivers):
1. Create app on Developer Portal
2. Bot tab → Reset Token → Copy
3. Enable **Privileged Gateway Intents** (Emitter only):
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. OAuth2 → URL Generator → Scopes: `bot`
5. Permissions: Connect, Speak
6. Invite bot to your server

> Receivers only need Connect/Speak; the Emitter needs the privileged intents
> for chief lookups and whisper command parsing.

## 📡 Whisper Relay Setup

For Chiefs to whisper to Commandant:
1. Create a private text channel for relay commands
2. Create a webhook in that channel
3. Add the channel ID and webhook URL in Bots tab

## 🤝 Credits

Built for Star Citizen fleet operations.

## 📜 License

MIT
