# Publishing Star Commander to the Microsoft Store

This is the checklist to publish the existing Electron app to the Microsoft Store as an **MSIX bundle**. Most of this is account / asset work you have to do yourself; the bits I can automate are flagged with `[code]`.

Current state: [`electron-app/package.json`](electron-app/package.json) already has an `appx` build config skeleton, but the identity placeholders (`identityName: "StarCommander"`, `publisher: "CN=KiFouine"`) are not real Partner Center values and won't sign.

---

## 1. Microsoft Partner Center account

- Sign up at **<https://storedeveloper.microsoft.com>** (this is the only
  supported entry point for the new free flow; other URLs send you to a
  legacy flow that still charges)
- **Free** for both Individual and Company accounts since the 2025
  onboarding rework — no registration fee
- Individual account requires a personal Microsoft account (MSA) — Gmail
  and similar are not accepted; create or sign in with a Microsoft account
- Identity verification: government-issued ID + selfie, on a mobile device
  in good lighting. Mandatory.
- Account approval is typically immediate to a few minutes (was 1-7 days
  under the old flow)

## 2. Reserve the app identity

- Partner Center → **Apps and games** → **Create new product** → **MSIX or PWA app**
- Reserve the name **Star Commander** (or a variant if taken)
- Once reserved, Partner Center will give you these exact strings — **copy them verbatim**:
  - **Package/Identity/Name** (e.g. `12345KiFouine.StarCommander`)
  - **Package/Identity/Publisher** (e.g. `CN=12345A6B-CDEF-1234-5678-9ABCDEF01234`)
  - **Package/Identity/PublisherDisplayName** (your Partner Center display name)
  - **Package Family Name (PFN)** — for store URLs

## 3. Wire those values into the build [code]

Update [`electron-app/package.json`](electron-app/package.json) `build.appx` block once Partner Center gives you the real values:

```jsonc
"appx": {
    "applicationId": "StarCommander",        // can stay as-is
    "identityName":  "<from Partner Center>",     // e.g. "12345KiFouine.StarCommander"
    "publisher":     "<from Partner Center, full CN=...>",
    "publisherDisplayName": "<from Partner Center>",
    "displayName": "Star Commander",
    "backgroundColor": "#0c1621",
    "languages": ["en-US","fr-FR","es-ES","pt-PT","ru-RU","zh-CN","ja-JP","ar-SA"]
}
```

I can do this swap with one Edit call once you have the values — just paste them in chat.

## 4. Required Store assets

The store wants logos at specific sizes. Today the repo only has [`assets/icon.ico`](electron-app/assets/icon.ico) + [`assets/icon.png`](electron-app/assets/icon.png) at a single resolution. You need to produce (or commission):

| Asset | Size (px) | Where it shows |
| --- | --- | --- |
| Small tile / Square 44×44 logo | 44×44 (and 16/24/32/48/256 sub-sizes) | Taskbar, Start search |
| Square 71×71 logo | 71×71 | Small Start tile |
| Square 150×150 logo | 150×150 | Medium Start tile |
| Wide 310×150 logo | 310×150 | Wide Start tile |
| Square 310×310 logo | 310×310 | Large Start tile |
| Store logo | 50×50 | Store listing icon |
| Splash screen | 620×300 | App launch splash |

`electron-builder` will pick these up if placed at `electron-app/assets/appx/` with the standard names (`StoreLogo.png`, `Square44x44Logo.png`, etc.). I can scaffold the empty folder + naming convention `[code]` once you have the source artwork.

## 5. Store listing assets

- **Screenshots** (1–9, recommended 4–6) — at least one at 1366×768
- **Promotional images** (optional but boosts placement) — 720×1080, 414×180, 558×558, 414×468, 1920×1080
- **Description** — 200 char short + up to 10 000 char long
- **Keywords** — up to 7 (e.g. `Star Citizen`, `Discord`, `voice relay`, `fleet`, `radio`)
- **Privacy policy URL** — **required**. The app doesn't currently have one. Easiest: a single static page on GitHub Pages that says what the app does and does *not* collect (you'd say: tokens stay local, logs are local, no telemetry).
- **Support contact** — your email or a GitHub Issues URL
- **System requirements** — Windows 10 19H2+ / Windows 11

## 6. Age rating

Partner Center runs a short questionnaire. For a voice-relay tool with no user-generated content of its own, **3+ (PEGI) / E (ESRB)** is the typical result. Five minutes.

## 7. Privacy and data declarations

The store asks what data the app collects. Truthful answers for current Star Commander:
- **Personal info**: No (Discord IDs are stored locally only)
- **Audio**: Yes — *processed in real time, not stored*
- **Diagnostic data**: Optional — only if user clicks "Download logs" and shares

Declare both audio and diagnostic data; explain in the description that audio is relayed live and never saved.

## 8. Submission flow

```bash
cd electron-app
npm run build:msix
# → dist/Star Commander Setup 4.5.0.appx (or .msixbundle)
```

Upload that to Partner Center under your reserved app → submit for certification. **Microsoft handles signing for Store submissions** — you don't need a code-signing certificate for this path. Certification usually completes in 24–72 hours.

## 9. After approval

- Star Commander gets a Microsoft Store URL (`ms-windows-store://pdp/?productid=...`)
- Auto-updates are handled by the Store; you don't need an autoUpdater in the app
- Submit updates by uploading a new `.appx` with a bumped version in `package.json`

---

## Side-quest: signed NSIS installer (for non-Store distribution)

If you also want to ship the `.exe` installer (the current `npm run build:win` output) without SmartScreen warnings, you need a **code signing certificate**:
- DigiCert / SSL.com / Sectigo, ~150–500 USD/year
- After signing the .exe, SmartScreen still warns until enough installs build "reputation"
- An **EV certificate** (~300–700 USD/year) skips the reputation phase entirely
- Once you have a cert, update [`electron-app/package.json`](electron-app/package.json) `build.win`:
  ```json
  "win": {
      ...
      "verifyUpdateCodeSignature": true,
      "signtoolOptions": {
          "certificateFile": "./cert.pfx",
          "certificatePassword": "${env.SIGN_PASSWORD}"
      }
  }
  ```

For getting on the Microsoft Store specifically, you do **not** need this — Store-side signing is free.

---

## What I can do right now without your input

1. Scaffold `electron-app/assets/appx/` with empty placeholder files at the right names (you'd drop in real images later).
2. Add a `package.json` `build.appx.applicationId` and any other field that's safe to fix to a known value now.
3. Write a draft privacy policy in `docs/PRIVACY.md` you can host as-is on GitHub Pages.
4. Add a `build:msix` smoke test that catches missing-asset errors early.

Pick whichever of those is useful — the rest blocks on you having a Partner Center account and the identity strings.
