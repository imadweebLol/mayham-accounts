> **v0.2.0:** [Set up Mayham signed in-app updates](MAYHAM_V0.2_UPDATES.md).

# Mayham Accounts

An unofficial, purple-themed desktop Roblox account manager fork derived from RoALT 1.1.0. **Not affiliated with inspectsoftware or the RoALT developers.**

## Included in this modification
- Your Mayham Accounts logo as the app, titlebar and startup icon
- 15 theme presets: Mayham Violet, Original Petal, Glass Blossom, Graphite Minimal, Midnight Blue, Forest Canopy, Warm Sandstone, Synthwave, Aurora Observatory, Deep Ocean, Solstice Dunes, Neon City, Alpine Frost, Crimson Ember and Royal Amethyst
- Custom theme studio under **Settings → Appearance**, supporting mixing any base and accent, custom colour, corner radius, glow and transparency
- Uploaded backgrounds through the original secure background image system
- Retained RoALT account and session backend and important upstream notices
- Credits in Settings → About and MAYHAM_CREDITS.md

## Windows executable
See [BUILD_WINDOWS.md](BUILD_WINDOWS.md). The .exe has not been built in this environment.

## Credits
Original RoALT by **inspectsoftware**: https://github.com/inspectsoftware/RoALT  
Original community Discord: https://discord.gg/roaltdev  
MIT license and author notice: see `LICENSE` and `NOTICE.md`.

## Build locally without hosting
On Windows 10/11, double-click **BUILD_MAYHAM_WINDOWS.cmd**. It installs needed tools via Windows Package Manager where necessary, runs the native RoALT/Tauri build, and copies the output to **Mayham Accounts/Mayham Accounts.exe**. An internet connection and Microsoft C++ build tools are needed for the first build. Build errors are written to `mayham-build.log`. The included ZIP is source, not a prebuilt executable.
