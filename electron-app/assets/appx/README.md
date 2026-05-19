# Microsoft Store tile assets

electron-builder picks up tile and logo images from this folder when building
the `.appx` / `.msixbundle`. **All files must be PNG, 32-bit RGBA**, exact
dimensions, no padding tricks.

Drop the following files here before running `npm run build:msix`:

| Filename | Required size | Used for |
| --- | --- | --- |
| `StoreLogo.png` | 50×50 | Store listing icon |
| `Square44x44Logo.png` | 44×44 | Taskbar, app list, Alt-Tab |
| `Square71x71Logo.png` | 71×71 | Small Start tile |
| `Square150x150Logo.png` | 150×150 | Medium Start tile (the default) |
| `Wide310x150Logo.png` | 310×150 | Wide Start tile |
| `Square310x310Logo.png` | 310×310 | Large Start tile |
| `SplashScreen.png` | 620×300 | App launch splash screen |

## Optional but recommended

The Store also accepts "target size" variants of Square44x44Logo for higher
DPI displays. If you provide these, name them with a `.targetsize-NN_altform-unplated.png`
suffix:

- `Square44x44Logo.targetsize-16.png` (16×16)
- `Square44x44Logo.targetsize-24.png` (24×24)
- `Square44x44Logo.targetsize-32.png` (32×32)
- `Square44x44Logo.targetsize-48.png` (48×48)
- `Square44x44Logo.targetsize-256.png` (256×256)

## Background

The current source artwork is [`../icon.png`](../icon.png) and [`../icon.ico`](../icon.ico).
You will need to either:
- Use a service like <https://www.appicon.co/#image-sets> or <https://realfavicongenerator.net/>
  to generate the full set from `icon.png`
- Or commission a designer for clean per-size renders (recommended for Start tiles —
  upscaled icons look terrible at 310×310)

## Verification

Once files are dropped here:

```bash
cd electron-app
npm run build:msix
```

electron-builder will complain about any missing or wrong-size asset and
print the exact path it expected.
