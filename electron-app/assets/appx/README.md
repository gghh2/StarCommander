# Microsoft Store tile source

This folder holds the **single source of truth** for the Star Commander
Store tiles: `_source.png` (566×566 logo on dark background).

The actual tile PNGs that electron-builder reads at build time live in
[`../../build/appx/`](../../build/appx/) (electron-builder hard-codes
that location).

## Regenerate the tiles

If you change `_source.png`, regenerate the 7 size variants with this
PowerShell one-liner from the repo root:

```powershell
Add-Type -AssemblyName System.Drawing
$src = 'electron-app\assets\appx\_source.png'
$outDir = 'electron-app\build\appx'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bg = [System.Drawing.ColorTranslator]::FromHtml('#0c1621')
$tiles = @(
    @{ Name='StoreLogo.png';         W=50;  H=50;  IconPct=0.85 },
    @{ Name='Square44x44Logo.png';   W=44;  H=44;  IconPct=0.90 },
    @{ Name='Square71x71Logo.png';   W=71;  H=71;  IconPct=0.85 },
    @{ Name='Square150x150Logo.png'; W=150; H=150; IconPct=0.80 },
    @{ Name='Square310x310Logo.png'; W=310; H=310; IconPct=0.75 },
    @{ Name='Wide310x150Logo.png';   W=310; H=150; IconPct=0.85 },
    @{ Name='SplashScreen.png';      W=620; H=300; IconPct=0.80 }
)
$source = [System.Drawing.Image]::FromFile($src)
foreach ($t in $tiles) {
    $bmp = New-Object System.Drawing.Bitmap($t.W, $t.H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode  = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear($bg)
    $minDim = [Math]::Min($t.W, $t.H)
    $iconSize = [int]($minDim * $t.IconPct)
    $g.DrawImage($source, [int](($t.W - $iconSize) / 2), [int](($t.H - $iconSize) / 2), $iconSize, $iconSize)
    $g.Dispose()
    $bmp.Save((Join-Path $outDir $t.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}
$source.Dispose()
```
