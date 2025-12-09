# Legacy Version (V1-V3)

⚠️ **This version is deprecated.** Use the Electron app in `../electron-app/` instead.

## What was this?

The original Star Commander used:
- Node.js scripts for Discord bots
- AutoHotkey (`.ahk`) for global keybinds
- Manual `.env` and `config.json` editing

## Why deprecated?

The Electron version (V4) includes:
- ✅ Built-in keybinds (no AutoHotkey)
- ✅ Visual configuration (no JSON editing)
- ✅ Setup wizard
- ✅ Commandant/Chef dual-mode architecture
- ✅ Whisper system

## Files

- `src/` - Original bot code
- `keybinds.ahk` - AutoHotkey keybind scripts
- `config.example.json` - Config template
- `.env.example` - Environment template
