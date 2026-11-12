@echo off
setlocal
cd /d "%~dp0"
title Mayham Accounts - Build and Install
echo ================================================
echo    MAYHAM ACCOUNTS - BUILD AND INSTALL
 echo ================================================
echo.
echo This single command builds Mayham Accounts and creates
 echo the Windows setup installer, then opens it for you.
echo Your official macro library and Discord identity
 echo are already configured in this project.
echo.
echo Keep a backup of your existing account data before upgrading.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-mayham-windows.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo.
  echo BUILD FAILED. See mayham-build.log and compiler output above.
  pause
  exit /b %RESULT%
)
echo.
echo BUILD SUCCEEDED. Installer created and opened.
echo Your installer is also in the "Mayham Accounts Installer" folder.
pause
