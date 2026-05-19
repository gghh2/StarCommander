# Store Listing — copy-paste ready

This is the text content for the Microsoft Store submission. Edit before
submitting if anything reads wrong to you. Microsoft Partner Center accepts
plain text — no markdown, no HTML in these fields.

---

# Listing — English (US)

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

## Product features (max 20 bullets)

Pasted one per row in Partner Center → "Fonctionnalités du produit" → "Ajouter d'autres éléments".

```
Voice relay across multiple Discord channels simultaneously
Specialist channel broadcast — Artillery, Engineers, Pilots
Cross-network whisper from chiefs via Discord webhook
Briefing mode — rally all squads to HQ instantly
Tactical HUD overlay with live mic indicator
Real-time listener count per channel
Overlay scale slider (50%–150%) for any monitor
Walkie-talkie radio voice effect with adjustable intensity
Radio click sounds at transmission start and end
Global numpad keybinds — work in-game (kernel-level capture)
8 UI languages: English, French, Spanish, Portuguese, Russian, Chinese, Japanese, Arabic
Customizable Star Citizen color theme
Theme import/export for sharing with your fleet
System tray with one-click channel quick-actions
Persistent logs with auto-rotation, downloadable from Options
Bot tokens and webhook URLs auto-redacted from logs
Always-visible bot connection status bar
Discord member and channel autocomplete in setup wizard
Setup wizard for first-launch configuration
Free, open source, MIT-licensed
```

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

---

# Listing — Français (France)

## Nom d'affichage

```
StarCommander
```

(Doit matcher exactement le `DisplayName` du manifest MSIX — sans espace
puisque "Star Commander" avec espace est déjà réservé par quelqu'un d'autre.)

## Description courte (max 200 caractères)

```
Relais vocal Discord pour Star Citizen. Diffusez à plusieurs canaux, recevez les whispers des chefs d'escouade par webhook, le tout depuis un HUD tactique sur le bureau.
```

(178 caractères — sous la limite.)

## Description longue (max 10 000 caractères)

```
Star Commander est un relais vocal pour les commandants de flotte Star Citizen qui doivent coordonner des escouades dispersées sur plusieurs canaux vocaux Discord — artillerie, ingénieurs, pilotes, chefs d'escadrille — sans imposer à tout le monde un seul canal commun.

✦ Comment ça marche

Star Commander pilote quatre bots Discord que vous créez : un « Émetteur » qui écoute votre canal de commandement, et trois « Récepteurs » qui diffusent dans vos canaux spécialisés. Une pression sur le pavé numérique (Num2, Num3, Num4) et votre voix est instantanément diffusée vers ce canal — Star Citizen ne perd jamais le focus. Num0 pour diffuser à TOUS les canaux spécialisés en simultané. Num1 pour couper le relais sans quitter Discord.

✦ Whisper depuis le terrain

Les chefs d'escouade (« Chiefs ») importent un fichier de configuration partagé et peuvent chuchoter directement dans votre canal de commandement via un webhook Discord. Aucun serveur à héberger, aucun port à ouvrir — fonctionne entre différents PC, FAI et continents.

✦ HUD tactique en superposition

Une petite fenêtre toujours visible affiche votre canal actif, le nombre d'auditeurs en direct, un vu-mètre d'activité vocale et un voyant de connexion. Échelle réglable de 50 % à 150 % pour s'adapter à votre écran. Cliquez pour la déployer et voir les infos étendues.

✦ Conçu pour les opérations

— 8 langues d'interface : Anglais, Français, Espagnol, Portugais, Russe, Chinois, Japonais, Arabe
— Touches numpad configurables, capturées au niveau noyau (fonctionne en jeu sans astuce de focus)
— Mode briefing : ramène toute l'escouade au canal de commandement pour un débrief rapide
— Effet radio walkie-talkie réglable et sons de clic radio appliqués aux voix relayées pour l'ambiance
— Thème Star Citizen personnalisable, entièrement modifiable, import/export
— Intégration system tray avec actions rapides en un clic

✦ Conçu pour la confidentialité et la sécurité

— Tokens de bots, IDs de canaux, configuration : tout reste sur votre machine
— Pas de télémétrie, pas d'analytics, pas d'authentification distante
— L'audio est relayé en direct, jamais enregistré
— Les logs sont stockés localement uniquement ; les valeurs sensibles (tokens, URLs de webhook, clés SRTP) sont automatiquement masquées avant écriture sur disque
— Les fichiers de configuration partagés excluent automatiquement les tokens de bots pour éviter les fuites accidentelles vers vos chefs
— Renderer en sandbox avec isolation de contexte stricte ; URLs externes restreintes à Discord, GitHub et la cagnotte du développeur

✦ Gratuit, MIT, open source

Code source, suivi de bugs et roadmap : https://github.com/gghh2/StarCommander

✦ Pré-requis

— Un serveur Discord que vous administrez
— Quatre bots Discord (Discord Developer Portal — gratuit ; environ 10 min de configuration par bot)
— Windows 10 19H2 ou supérieur, ou Windows 11
— FFmpeg dans le PATH (utilisé par le filtre radio ; l'application vous prévient s'il manque)
```

## Fonctionnalités du produit (max 20)

```
Relais vocal entre plusieurs canaux Discord simultanément
Diffusion vers canaux spécialisés — Artillerie, Ingénieurs, Pilotes
Whisper inter-réseau depuis les chefs via webhook Discord
Mode briefing — rappel instantané de toute l'escouade au QG
HUD tactique avec indicateur micro en direct
Comptage d'auditeurs en temps réel par canal
Slider d'échelle d'overlay (50 %–150 %) pour tout écran
Effet radio walkie-talkie avec intensité réglable
Sons de clic radio au début et à la fin de transmission
Keybinds numpad globaux — fonctionnent en jeu (capture niveau noyau)
8 langues d'interface : Anglais, Français, Espagnol, Portugais, Russe, Chinois, Japonais, Arabe
Thème Star Citizen personnalisable
Import/export de thèmes pour partager avec votre flotte
System tray avec changement de canal en un clic
Logs persistants avec rotation automatique, téléchargeables depuis les Options
Tokens et URLs de webhook automatiquement masqués dans les logs
Barre de statut des bots toujours visible sous l'entête
Autocomplétion des membres et canaux Discord dans l'assistant
Assistant de configuration au premier lancement
Gratuit, open source, sous licence MIT
```

## Mots-clés (max 7, max 30 caractères chacun)

```
Star Citizen
Discord
relais vocal
flotte
talkie walkie
overlay
bot
```

## Notes de version

```
Version 4.5

— HUD tactique avec indicateur micro en direct, comptage d'auditeurs, vu-mètre et slider d'échelle
— Barre compacte de statut des bots sous l'entête principale
— Logger persistant avec rotation automatique ; logs téléchargeables depuis Options → Diagnostics
— Effet radio walkie-talkie réglable
— 8 langues d'interface
— Sécurité : tokens automatiquement strippés des exports de config ; renderer sandboxé ; URLs externes restreintes ; valeurs sensibles masquées dans les logs
— Performance : optimisation des ticks d'overlay ; processus ffmpeg évité en mode MUTE
— Correctifs : passage au gateway voice Discord v8 (Electron 33)
```

## Déclarations de données (en français)

Pour chaque catégorie de données collectées, traduction des explications :

- *Données de diagnostic* : « À l'initiative de l'utilisateur uniquement. L'application écrit un fichier journal sur le disque local de l'utilisateur ; celui-ci peut choisir de le télécharger et de le partager. L'application ne transmet aucun journal d'elle-même. »
- *Données audio* : « L'audio provenant d'un canal vocal Discord est décodé, éventuellement filtré, puis ré-encodé pour transmission vers d'autres canaux vocaux Discord en temps réel. L'audio n'est jamais écrit sur disque. »

---

# Champs communs aux deux listings

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
