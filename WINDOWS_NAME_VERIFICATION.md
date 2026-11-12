# Windows application identity verification (Mayham Accounts v0.1)

The build target is `mayham-accounts.exe`, the window title is `Mayham Accounts`, and the tray tooltip is `Mayham Accounts`. The bundled Tauri product name is `Mayham Accounts`. The optional legacy Inno Setup script now names its installed app and shortcuts Mayham Accounts.

After building, inspect the executable:

```powershell
(Get-Item .\src-tauri\target\release\mayham-accounts.exe).VersionInfo | Format-List ProductName,FileDescription,OriginalFilename
```

Run it and confirm the Alt+Tab label and taskbar tooltip both say Mayham Accounts.

The old `%LOCALAPPDATA%\RoALT` account database location is intentionally retained for compatibility: **do not delete that directory**. Back up data and do not run original RoALT and Mayham Accounts simultaneously. The RoALT project remains credited in About and the licence.

This source package has been statically checked but NOT compiled or run on Windows in this environment.
