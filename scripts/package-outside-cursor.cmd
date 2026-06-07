@echo off
REM Run this in Windows cmd OUTSIDE Cursor (sandbox puts installer in Temp).
cd /d "e:\CSE 416\MiVA"
set CARGO_BUILD_JOBS=1
set VITE_MIVA_API_URL=https://miva-production.up.railway.app
set VITE_WEB_CONSOLE_URL=https://mi-va.vercel.app
set MIVA_WEB_ORIGINS=https://mi-va.vercel.app
echo Building MiVA desktop installer...
call npm run package:desktop
if errorlevel 1 exit /b 1
echo.
echo Installer:
dir "apps\desktop\src-tauri\target\release\bundle\nsis\*setup*.exe"
pause
