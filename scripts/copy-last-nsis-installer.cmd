@echo off
setlocal
set "SRC=C:\Users\user\AppData\Local\Temp\cursor-sandbox-cache\77fceb6e055e2f4a880689f5c8c2b8f0\cargo-target\release\bundle\nsis\MiVA Desktop_0.1.0_x64-setup.exe"
set "DST=e:\CSE 416\MiVA\apps\desktop\src-tauri\target\release\bundle\nsis"
set "OUT=%DST%\MiVA Desktop_0.1.0_x64-setup.exe"

if not exist "%SRC%" (
  echo Installer not found at sandbox path.
  echo Run: npm run package:desktop
  echo from cmd OUTSIDE Cursor if Temp was cleaned.
  exit /b 1
)

if not exist "%DST%" mkdir "%DST%"
copy /Y "%SRC%" "%OUT%"
echo Copied to:
echo   %OUT%
dir "%OUT%"
endlocal
