@echo off
setlocal
cd /d "%~dp0"

echo [1/3] Pulling latest data from GitHub...
git pull --ff-only
if errorlevel 1 goto fail

echo [2/3] Rebuilding index...
node scripts\build-index.mjs
if errorlevel 1 goto fail

echo [3/3] Copying data to web\public\data...
node scripts\sync-data.mjs
if errorlevel 1 goto fail

echo.
echo Done. Refresh the page (Ctrl+F5 if needed).
goto done

:fail
echo.
echo Failed. See the error above (usually uncommitted local changes).
if /i not "%1"=="nopause" pause
exit /b 1

:done
if /i not "%1"=="nopause" pause
exit /b 0
