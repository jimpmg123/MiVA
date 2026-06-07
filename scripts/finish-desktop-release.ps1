# Run in external PowerShell (outside Cursor) from repo root:
#   Set-Location "e:\CSE 416\MiVA"
#   .\scripts\finish-desktop-release.ps1

$ErrorActionPreference = "Stop"
Set-Location "e:\CSE 416\MiVA"

Write-Host "C: free GB:" ([math]::Round((Get-PSDrive C).Free / 1GB, 2))

$buildProcs = Get-Process rustc, cargo, node -ErrorAction SilentlyContinue
if ($buildProcs) {
    Write-Host "Stopping stale build processes (rustc/cargo/node)..."
    $buildProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

$env:CARGO_BUILD_JOBS = "1"
$env:VITE_MIVA_API_URL = "https://miva-production.up.railway.app"
$env:VITE_WEB_CONSOLE_URL = "https://mi-va.vercel.app"
$env:MIVA_WEB_ORIGINS = "https://mi-va.vercel.app"

Write-Host "Building NSIS installer..."
npm run tauri --prefix apps/desktop -- build --bundles nsis
if ($LASTEXITCODE -ne 0) { throw "Tauri NSIS build failed with exit $LASTEXITCODE" }

Write-Host "Copying installer to web downloads..."
npm run copy-installer:web --prefix apps/desktop
if ($LASTEXITCODE -ne 0) { throw "copy-installer:web failed with exit $LASTEXITCODE" }

$manifest = Get-Content "apps\web\public\downloads\manifest.json" -Raw | ConvertFrom-Json
Write-Host "manifest builtAt:" $manifest.builtAt

$env:GIT_OPTIONAL_LOCKS = "0"
git add -A
git reset -- demo.env tmp-delete-body.json 2>$null
git status --short

$commitMsg = @"
Release MiVA desktop installer (NSIS)

Kokoro/Python 3.12, Live2D bundle fix, invoke bridge, CORS updates.
"@

git commit -m $commitMsg
git push origin main

Write-Host "Done. Latest commit:" (git log -1 --oneline)
