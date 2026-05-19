# Store Listing — copy-paste ready

This is the text content for the Microsoft Store submission. Edit before
submitting if anything reads wrong to you. Microsoft Partner Center accepts
plain text — no markdown, no HTML in these fields.

---

## Display name

```
Star Commander
```

## Short description (max 200 characters)

```
Discord voice relay for Star Citizen fleet ops. Broadcast to multiple voice channels, whisper back via webhook, all from one tactical desktop HUD.
```

(190 characters — under limit.)

## Long description (max 10 000 characters)

```
Star Commander is a desktop voice relay built for Star Citizen fleet commanders who need to coordinate squads spread across multiple Discord voice channels — artillery, engineers, pilots, squadron leads — without forcing everyone into a single channel.

✦ How it works

Star Commander runs four Discord bots you own: one "Emitter" sits in your command channel listening to your voice, and three "Receivers" sit in your specialist channels. Press a numpad key (NumPad 2, 3, 4) and your voice instantly broadcasts to that specialist channel — Star Citizen never loses focus. Press NumPad 0 to broadcast to ALL specialist channels at once. Press NumPad 1 to mute the relay without leaving Discord.

✦ Whisper back from the field

Specialist team leaders ("Chiefs") import a shared configuration file and can whisper directly to your command channel via a Discord webhook. No server to host, no port forwarding — works across different PCs, ISPs, and continents.

✦ Tactical HUD overlay

A small always-on-top overlay shows your active channel, the live listener count, a voice activity meter, and a connection indicator. Scale it from 50 % to 150 % to fit your monitor. Click to expand for extended info.

✦ Built for combat operations

— 8 UI languages: English, French, Spanish, Portuguese, Russian, Chinese, Japanese, Arabic
— Configurable numpad keybinds, captured at the kernel level (works in-game without focus tricks)
— Briefing mode: gather all squad members back to the command channel for a quick brief
— Walkie-talkie radio effect with adjustable intensity and click sounds, applied to relayed voices for authenticity
— Custom Star Citizen color theme, fully editable, import/export themes
— System tray integration with one-click channel quick-actions

✦ Built for privacy and security

— All bot tokens, channel IDs, and configuration stay on your machine
— No telemetry, no analytics, no remote login
— Audio is relayed live and never recorded
— Logs are stored locally only; sensitive values (tokens, webhook URLs, SRTP keys) are auto-redacted before they hit disk
— Shareable configuration files strip bot tokens automatically so you can't accidentally leak them to your chiefs
— Sandboxed renderer with strict context isolation; external URLs allowlisted to Discord, GitHub, and the developer's tip jar

✦ Free, MIT-licensed, open source

Source code, issue tracker, and roadmap: https://github.com/gghh2/StarCommander

✦ What you need

— A Discord server you administer
— Four Discord bot applications (Discord Developer Portal — free; takes about ten minutes to set up each bot)
— Windows 10 19H2 or later, or Windows 11
— FFmpeg in your PATH (used by the radio effect filter; the app will tell you if it's missing)
```

(2 230 characters.)

## Keywords (max 7, max 30 chars each)

```
Star Citizen
Discord
voice relay
fleet
walkie talkie
overlay
bot
```

## What's new in this version (release notes)

```
Version 4.5

— Tactical HUD overlay with live mic indicator, listeners count, volume meter, and scale slider
— Compact bot status bar under the main header for at-a-glance health
— Persistent file logger with auto-rotation; logs are downloadable from Options → Diagnostics
— Walkie-talkie radio voice effect with adjustable intensity
— 8 UI languages
— Security: bot tokens are now stripped from shared configuration exports; sandboxed renderer; allowlisted external URLs; sensitive values auto-redacted from logs
— Performance: overlay tick optimized; ffmpeg subprocess skipped in MUTE mode
— Fixes: Discord voice gateway v4 deprecation (upgraded to gateway v8 + Electron 33)
```

## Category and subcategory

- **Category:** Productivity
- **Subcategory:** (Star doesn't require one for Productivity; leave blank)

Alternative: **Utilities & tools** if the Store insists on a more "tool"-flavored fit.

## Pricing

Free.

## Markets

Available in all markets where Discord is available. (Effectively: every market except those where Discord is restricted — Microsoft's defaults handle this.)

## Age rating

**Run the IARC questionnaire in Partner Center.** Truthful answers for Star Commander:

- Q: Does the app contain violence, blood, gambling, mature content, etc.? → **No** to all
- Q: Does it enable users to communicate with each other? → **Yes (via Discord, externally)**
- Q: Does it share user-generated content? → **No (Star Commander itself does not; Discord does, but that's Discord's policy)**

Expected outcome: **PEGI 3 / ESRB Everyone**.

## Privacy policy URL

```
https://gghh2.github.io/StarCommander/privacy
```

(You will need to host [`docs/PRIVACY.md`](PRIVACY.md) on GitHub Pages or
equivalent before submitting. Three-step recipe:

1. Settings → Pages → Source: `main` branch, `/docs` folder
2. Wait ~1 minute, visit `https://<username>.github.io/StarCommander/PRIVACY`
3. Optional: add a tiny `docs/index.md` that links to the privacy policy
   if you want a friendlier landing page.)

## Support contact

```
https://github.com/gghh2/StarCommander/issues
```

## Website (optional)

```
https://github.com/gghh2/StarCommander
```

## Data declarations

Partner Center asks what the app collects. For Star Commander, declare:

| Category | Collected? | Why |
| --- | --- | --- |
| Personal info | **No** | Discord IDs stay local |
| Financial info | **No** | — |
| Health and fitness | **No** | — |
| Email | **No** | — |
| Phone | **No** | — |
| Contacts | **No** | — |
| Location | **No** | — |
| Web browsing history | **No** | — |
| User-generated content | **No** | We relay live audio, never store |
| Other | **No** | — |
| **Diagnostic data** | **Yes (optional)** | Only if the user clicks "Download logs" and shares it manually |
| **Audio data** | **Yes (processed in real time, not stored)** | Voice relay; never persisted to disk |

For each "Yes", explain in plain text:
- *Diagnostic data*: "User-initiated only. The app writes a log file to the user's local disk; the user can choose to download and share it. The app does not transmit logs anywhere itself."
- *Audio data*: "Audio from a Discord voice channel is decoded, optionally filtered, and re-encoded for transmission to other Discord voice channels in real time. Audio is never written to disk."
