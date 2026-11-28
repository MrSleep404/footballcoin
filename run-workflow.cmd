@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-workflow.ps1"
set code=%errorlevel%

echo.
if not "%code%"=="0" (
  echo Failed with exit code %code%.
) else (
  echo Done.
)
if /i not "%1"=="nopause" pause
exit /b %code%
