@echo off
rem BOB OKAY - the desktop icon. Double-click to play. Your saves are in Documents\Bob Okay\Saves.
rem It gets the newest version of the game from GitHub, starts the save keeper (tools\bob-okay.js)
rem in the background if it is not already running, and opens the game in your browser.
title Bob Okay
setlocal
set "GAME=%LOCALAPPDATA%\BobOkay\game"
set "BRANCH=agent/scaled-hitboxes-projectile-range"

rem Node is installed by winget, which is not always on PATH (see CLAUDE.md "Setup").
where node >nul 2>nul
if errorlevel 1 (
  for /d %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS*") do (
    for /d %%E in ("%%D\node-v*") do set "PATH=%%E;%PATH%"
  )
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed, so Bob Okay cannot start.
  pause
  exit /b 1
)

if not exist "%GAME%\tools\bob-okay.js" (
  echo First start: downloading Bob Okay...
  git clone --depth 1 --branch %BRANCH% https://github.com/cbm971/BobAssetBuilder.git "%GAME%"
  if errorlevel 1 (
    echo Could not download the game. Check the internet connection and try again.
    pause
    exit /b 1
  )
)

node "%GAME%\tools\bob-okay.js" launch
if errorlevel 1 (
  echo.
  echo Something went wrong. The details are in %LOCALAPPDATA%\BobOkay\keeper.log
  pause
  exit /b 1
)
exit /b 0
