# Star Commander — Privacy Policy

**Last updated:** 2026-05-19

Star Commander is a desktop application that relays Discord voice between channels for Star Citizen fleet coordination. This page describes what data the app handles, where it goes, and what we do — and do not — collect.

## Summary

- **No telemetry.** Star Commander does not send any data about you, your usage, or your machine to its developer or to any third party server.
- **All configuration is stored locally** on your machine, in `%APPDATA%/star-commander/`.
- **Audio is relayed live**, never recorded, never stored.
- **The only external service Star Commander talks to is Discord**, on your behalf and using bot tokens you provide yourself.

## What data Star Commander handles

### Stored on your machine, locally only

- Discord bot tokens (Emitter + Receivers) you enter during setup
- Discord channel IDs, role IDs, user IDs, webhook URLs
- A list of "chiefs" (display names + Discord user IDs) you add via the UI
- Your preferred language, theme, keybinds, overlay scale, audio effect settings
- Application logs (`%APPDATA%/star-commander/logs/star-commander.log`) — used for debugging; capped at ~25 MB, rotated automatically; Discord tokens / SRTP keys / webhook URLs are redacted from these logs before they are written

These files are **never transmitted** anywhere. They are written by Electron's
local config store (electron-store) and a local file logger.

### Processed live, never stored

- Audio captured from the source Discord voice channel is decoded, optionally
  passed through a "walkie-talkie" radio filter, and re-encoded for the
  destination channel(s). Audio frames are not written to disk and not
  retained in memory beyond the few hundred milliseconds needed to relay them.

### Sent to Discord on your behalf

Star Commander acts as a Discord client using the bot tokens you provide:
- The Emitter bot joins a voice channel of your choice and receives audio
- The Receiver bots join other voice channels of your choice and play audio
- Webhook POSTs to a relay text channel are used to coordinate "whisper" mode

All Discord traffic is between your machine and Discord's servers. Discord's
own privacy policy applies to that traffic.

## What Star Commander does NOT collect

- No telemetry, analytics, crash reports, or "phone home" of any kind
- No account creation, no remote login
- No advertising, no third-party trackers
- No screen capture, no keystroke logging beyond the handful of keybinds you
  configure for channel switching (and those are processed locally — they
  are never transmitted)

## Sharing logs with support

The Options → Diagnostics → "Download logs" button lets you save the application
log to a file of your choice. If you share that file with the developer or a
fellow user, **only share it with people you trust**. The log is automatically
scrubbed of Discord bot tokens, webhook URLs, voice session tokens, and SRTP
keys before being written, but it may still contain Discord user IDs,
display names, channel names, and timestamps of activity in your fleet.

## Children's privacy

Star Commander is not directed at children under 13. It is a tool for
coordinating gameplay between consenting players using their own Discord
bots.

## Changes to this policy

If material changes are made to this policy, they will be reflected in the
"Last updated" date above and noted in the project's GitHub releases.

## Contact

For questions about this policy, open an issue at
<https://github.com/gghh2/StarCommander/issues>.
