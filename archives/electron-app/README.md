# Star Commander V4.0

Desktop application for Discord voice relay in Star Citizen fleet operations.

## 🎯 Features

- **Dual Mode Architecture**
  - 👑 **Commandant** : Configure bots, manage fleet, broadcast to channels
  - 🎖️ **Chef** : Import config, whisper to commandant

- **Voice Relay**
  - 1 Emitter bot listens to Commandants channel
  - 3 Receiver bots broadcast to target channels
  - Switch channels via keybinds or UI

- **Whisper System**
  - Chiefs can whisper directly to Commandants channel
  - Uses Discord webhooks (no server needed)
  - Works across different PCs/networks

- **User-Friendly**
  - Setup wizard for first launch
  - Global keybinds (numpad)
  - Real-time logs
  - Export/Import config

## 🚀 Quick Start

### Commandant (First Setup)

1. Create 4 Discord bots on [Discord Developer Portal](https://discord.com/developers/applications)
2. Run Star Commander, choose "Commandant"
3. Follow the wizard to enter tokens and channel IDs
4. Export config for your chiefs

### Chef (Join Fleet)

1. Get `starcommander-config.json` from your Commandant
2. Run Star Commander, choose "Chef"
3. Import the config file
4. Select your profile
5. Use Whisper button to talk to Commandant

## 🛠️ Development

### Prerequisites

- Node.js 18+
- FFmpeg installed and in PATH

### Setup

```bash
cd electron-app
npm install
```

### Run in dev mode

```bash
npm start
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
│   ├── main/           # Electron main process
│   │   ├── main.js     # Entry point
│   │   └── preload.js  # Secure IPC bridge
│   ├── renderer/       # UI (HTML/CSS/JS)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── core/           # Discord relay logic
│       ├── relayManager.js
│       ├── emitter.js
│       └── receiver.js
├── assets/             # Icons
├── dist/               # Build output
├── package.json
└── README.md
```

## ⚙️ Configuration

Config stored in: `%APPDATA%/star-commander/config.json`

### Keybinds (Default)

| Key | Action |
|-----|--------|
| Num0 | All channels |
| Num1 | Mute |
| Num2 | Channel 1 |
| Num3 | Channel 2 |
| Num4 | Channel 3 |
| Num9 | Whisper (Chiefs) |

## 🔧 Discord Bot Setup

For each bot:
1. Create app on Developer Portal
2. Go to "Bot" tab → Reset Token → Copy
3. Enable **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. OAuth2 → URL Generator → Scopes: `bot`
5. Permissions: Connect, Speak
6. Invite bot to your server

## 📡 Whisper Relay Setup

For Chiefs to whisper to Commandant:
1. Create a private text channel for relay commands
2. Create a webhook in that channel
3. Add the channel ID and webhook URL in Bots tab

## 🤝 Credits

Built for Star Citizen fleet operations.

## 📜 License

MIT
